import { NextResponse } from 'next/server'
import { addEvent, upsertTx, store, deserialiseDelegation } from '@/lib/store'
import { buildRedeemCalldata } from '@/lib/metamask'
import { relayDelegationRedemption } from '@/lib/oneshot'
import { encodeFunctionData } from 'viem'
import type { Address } from 'viem'

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

    // Submit via 1Shot relayer
    const relayerId = process.env.ONESHOT_RELAYER_ID ?? 'demo-relayer'
    const webhookUrl = `${process.env.WEBHOOK_BASE_URL ?? 'http://localhost:3000'}/api/webhook/1shot`

    const relay = await relayDelegationRedemption(relayerId, {
      calls: [{ to: smartAccountAddress as Address, data: redeemCalldata, value: '0x0' }],
      delegation: executorDelegation,
      gasToken: USDC_ADDR,
      webhookUrl,
      webhookMetadata: {
        action: `transfer-${amount}-${token}`,
        recipient,
        amount: String(amount),
      },
    })

    // Record transaction
    upsertTx({
      jobId: relay.jobId,
      status: relay.status,
      description: `Transfer ${amount} ${token} to ${recipient.slice(0, 6)}...${recipient.slice(-4)}`,
    })

    // Add agent event
    addEvent({
      agent: 'executor',
      status: 'success',
      message: `Natural language transfer: ${amount} ${token}`,
      detail: `Sent to ${recipient.slice(0, 6)}...${recipient.slice(-4)} via 1Shot`,
      type: 'transfer',
      audioText: `Transfer executed: ${amount} ${token} sent to recipient`
    })

    return NextResponse.json({ 
      jobId: relay.jobId,
      amount,
      token,
      recipient,
      status: relay.status
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