import { NextResponse } from 'next/server'
import { buildRedeemCalldata } from '@/lib/metamask'
import { pickRelayer, relayDelegationRedemption } from '@/lib/oneshot'
import { addEvent, upsertTx, deserialiseDelegation } from '@/lib/store'
import type { Address } from 'viem'
import type { RebalanceDecision } from '@/lib/venice'

const CHAIN_ID   = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 84532)
const USDC_ADDR  = (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? '0x036CbD53842c5426634e7929541eC2318f3dCF7e') as Address

// Uniswap v3 SwapRouter on Base Sepolia — replace with actual router address
const SWAP_ROUTER = '0x2626664c2603336E57B271c5C0b26F421741e481' as Address

/**
 * POST /api/agent/execute
 *
 * Body: {
 *   executorDelegationSerialized: string,
 *   decision: RebalanceDecision
 * }
 *
 * Step 3 of the agent pipeline.
 * - Builds swap calldata for each action
 * - Redeems the ERC-7710 delegation to get execution rights
 * - Submits via 1Shot Permissionless Relayer (gas paid in USDC)
 * - Registers a webhook for tx status updates
 */
export async function POST(request: Request) {
  addEvent({ agent: 'executor', status: 'running', message: 'Preparing swap execution…' })

  try {
    const body = await request.json() as {
      executorDelegationSerialized: string
      decision: RebalanceDecision
    }

    const executorDelegation = deserialiseDelegation(body.executorDelegationSerialized)
    const { decision } = body

    if (!decision.shouldRebalance || decision.actions.length === 0) {
      addEvent({ agent: 'executor', status: 'skipped', message: 'No swaps to execute' })
      return NextResponse.json({ skipped: true })
    }

    const webhookUrl = process.env.WEBHOOK_BASE_URL
      ? `${process.env.WEBHOOK_BASE_URL}/api/webhook/1shot`
      : undefined

    const jobIds: string[] = []

    // ── Pick relayer once ────────────────────────────────────────────────────
    const relayerId = await pickRelayer(CHAIN_ID, USDC_ADDR)

    for (const action of decision.actions) {
      addEvent({
        agent:   'executor',
        status:  'running',
        message: `Building swap: ${action.amountUSDC} USDC of ${action.from} → ${action.to}`,
      })

      // Build Uniswap exactInputSingle calldata
      const swapCalldata = buildUniswapCalldata(action, USDC_ADDR)

      // Build ERC-7710 redemption calldata
      const redeemCalldata = await buildRedeemCalldata({
        delegation: executorDelegation,
        calls: [{ to: SWAP_ROUTER, data: swapCalldata, value: 0n }],
      })

      // Submit via 1Shot
      const relay = await relayDelegationRedemption(relayerId, {
        calls: [{ to: SWAP_ROUTER, data: redeemCalldata, value: '0x0' }],
        delegation: executorDelegation,
        gasToken:   USDC_ADDR,
        webhookUrl,
        webhookMetadata: {
          action: `${action.from}->${action.to}`,
          amountUSDC: String(action.amountUSDC),
        },
      })

      jobIds.push(relay.jobId)

      upsertTx({
        jobId:       relay.jobId,
        status:      relay.status,
        description: `Swap ${action.amountUSDC} USDC: ${action.from} → ${action.to}`,
      })

      addEvent({
        agent:   'executor',
        status:  'success',
        message: `1Shot job submitted: ${relay.jobId}`,
        detail:  `${action.from} → ${action.to} | ${action.amountUSDC} USDC`,
      })
    }

    return NextResponse.json({ jobIds, txCount: decision.actions.length })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    addEvent({ agent: 'executor', status: 'error', message: 'ExecutorAgent failed', detail: msg })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ─── Build Uniswap v3 exactInputSingle calldata ───────────────────────────────
function buildUniswapCalldata(
  action: { from: string; to: string; amountUSDC: number },
  usdcAddress: Address
): `0x${string}` {
  // Token addresses on Base Sepolia (test values)
  const TOKEN_MAP: Record<string, Address> = {
    ETH:  '0x4200000000000000000000000000000000000006', // WETH on Base
    USDC: usdcAddress,
    BTC:  '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', // cbBTC placeholder
  }

  const tokenIn  = TOKEN_MAP[action.from] ?? TOKEN_MAP.USDC
  const tokenOut = TOKEN_MAP[action.to]   ?? TOKEN_MAP.USDC
  const amountIn = BigInt(Math.floor(action.amountUSDC * 1e6))

  // exactInputSingle(ISwapRouter.ExactInputSingleParams)
  // selector: 0x414bf389
  const DEADLINE = BigInt(Math.floor(Date.now() / 1000) + 300)

  // ABI-encode the struct (simplified — use viem's encodeFunctionData in production)
  const params = [
    tokenIn.padStart(66, '0').slice(-40),
    tokenOut.padStart(66, '0').slice(-40),
    '0000000000000000000000000000000000000000000000000000000000000bb8', // fee 3000
    '0000000000000000000000000000000000000000000000000000000000000000', // recipient (set by relayer)
    DEADLINE.toString(16).padStart(64, '0'),
    amountIn.toString(16).padStart(64, '0'),
    '0000000000000000000000000000000000000000000000000000000000000001', // amountOutMinimum (1 = no slippage protect in demo)
    '0000000000000000000000000000000000000000000000000000000000000000', // sqrtPriceLimitX96
  ].join('')

  return `0x414bf389${params}` as `0x${string}`
}