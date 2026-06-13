import { NextResponse } from 'next/server'
import { addEvent, upsertTx, store, deserialiseDelegation } from '@/lib/store'
import { buildRedeemCalldata } from '@/lib/metamask'
import { submitTransaction, getRelayerHealth } from '@/lib/oneshot'
import { encodeFunctionData } from 'viem'
import type { Address } from 'viem'

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 84532)
const USDC_ADDR = (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? '0x036CbD53842c5426634e7929541eC2318f3dCF7e') as Address

/**
 * POST /api/agent/transfer
 * 
 * Execute a USDC transfer using ERC-7710 delegation and 1Shot relayer.
 * Called after user confirms natural language transfer instruction.
 */
export async function POST(request: Request) {
  try {
    const { amount, token, recipient, smartAccountAddress } = await request.json()

    // Validation
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    if (token.toUpperCase() !== 'USDC') {
      return NextResponse.json({ error: 'Only USDC transfers supported' }, { status: 400 })
    }

    if (!recipient || !smartAccountAddress) {
      return NextResponse.json({ error: 'Missing recipient or smart account' }, { status: 400 })
    }

    if (!store.delegation.rootDelegation) {
      return NextResponse.json({ error: 'No delegation found - grant permission first' }, { status: 400 })
    }

    // Convert amount to USDC wei (6 decimals)
    const amountWei = BigInt(Math.floor(amount * 1_000_000))

    // Build USDC transfer calldata
    const transferCalldata = encodeFunctionData({
      abi: [
        {
          name: 'transfer',
          type: 'function',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }]
        }
      ],
      functionName: 'transfer',
      args: [recipient as Address, amountWei]
    })

    // Get delegation for redemption
    const executorDelegation = deserialiseDelegation(
      JSON.stringify(store.delegation.rootDelegation)
    )

    // Build ERC-7710 redemption calldata
    const redeemCalldata = await buildRedeemCalldata({
      delegation: executorDelegation,
      calls: [{ to: USDC_ADDR, data: transferCalldata, value: 0n }],
    })

    // Check 1Shot relayer health
    addEvent({
      agent: 'executor',
      status: 'running',
      message: 'Checking 1Shot relayer for transfer...',
    })
    
    try {
      const health = await getRelayerHealth()
      addEvent({
        agent: 'executor',
        status: 'running',
        message: `1Shot relayer ready for transfer: ${health.message}`,
      })
    } catch (error) {
      addEvent({
        agent: 'executor',
        status: 'error',
        message: '1Shot relayer unavailable for transfer',
        detail: `Error: ${error instanceof Error ? error.message : String(error)}`,
      })
      return NextResponse.json({ 
        error: '1Shot relayer unavailable for transfer', 
        detail: error instanceof Error ? error.message : String(error)
      }, { status: 503 })
    }
    
    const webhookUrl = `${process.env.WEBHOOK_BASE_URL ?? 'http://localhost:3000'}/api/webhook/1shot`

    const relay = await submitTransaction({
      to: smartAccountAddress as Address,
      data: redeemCalldata,
      chainId: CHAIN_ID,
      gasToken: USDC_ADDR,
      webhookUrl,
    })

    if (!relay.success || !relay.jobId) {
      addEvent({
        agent: 'executor',
        status: 'error',
        message: `Transfer failed: ${amount} ${token}`,
        detail: relay.error || 'Unknown relay error',
      })
      return NextResponse.json({ 
        error: 'Transfer failed', 
        detail: relay.error || 'Unknown relay error' 
      }, { status: 500 })
    }

    const jobId = relay.jobId!

    // Record transaction
    upsertTx({
      jobId: jobId,
      txHash: relay.txHash, // May be undefined initially
      status: 'pending',
      description: `Transfer ${amount} ${token} to ${recipient.slice(0, 6)}...${recipient.slice(-4)}`,
    })

    // Add agent event
    addEvent({
      agent: 'executor',
      status: 'success',
      message: `Natural language transfer: ${amount} ${token}`,
      detail: `Sent to ${recipient.slice(0, 6)}...${recipient.slice(-4)} - Job: ${jobId.slice(0, 10)}...`,
      type: 'transfer',
      audioText: `Transfer executed: ${amount} ${token} sent to recipient`
    })

    return NextResponse.json({ 
      jobId: jobId,
      txHash: relay.txHash,
      amount,
      token,
      recipient,
      status: 'pending'
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Transfer API Error:', msg)
    addEvent({ 
      agent: 'executor', 
      status: 'error', 
      message: 'Transfer failed', 
      detail: msg,
      type: 'transfer'
    })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
