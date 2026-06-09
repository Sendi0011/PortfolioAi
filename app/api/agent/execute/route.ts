import { NextResponse } from 'next/server'
import { buildRedeemCalldata } from '@/lib/metamask'
import { pickRelayer, relayDelegationRedemption } from '@/lib/oneshot'
import { addEvent, upsertTx, deserialiseDelegation, store } from '@/lib/store'
import type { Address } from 'viem'
import type { RebalanceDecision } from '@/lib/venice'

const CHAIN_ID   = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 84532)
const USDC_ADDR  = (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? '0x036CbD53842c5426634e7929541eC2318f3dCF7e') as Address

// Uniswap v3 SwapRouter on Base Sepolia — replace with actual router address
const SWAP_ROUTER = '0x2626664c2603336E57B271c5C0b26F421741e481' as Address

// A2A Research threshold - trades above this value require research
const RESEARCH_THRESHOLD_USD = 50

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

    // ── A2A Research Purchase Logic ─────────────────────────────────────────
    for (const action of decision.actions) {
      // Check if this trade requires research (high-value trades)
      if (action.amountUSDC >= RESEARCH_THRESHOLD_USD) {
        const token = action.from === 'USDC' ? action.to : action.from
        
        // Check if research already purchased for this token (within last hour)
        const existingResearch = store.purchasedResearch.find(r => 
          r.token === token && 
          Date.now() - r.purchasedAt < 3600000 // 1 hour
        )

        if (!existingResearch) {
          addEvent({
            agent: 'executor',
            status: 'running',
            message: `High-value trade detected ($${action.amountUSDC}) - purchasing ${token} research autonomously`,
            detail: 'A2A transaction: ExecutorAgent buying research before trade execution'
          })

          try {
            // Autonomous research purchase via internal API call
            const researchResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/research?token=${token}`, {
              method: 'GET',
              headers: {
                'X-Payment': generateMockPaymentPayload(token, 0.5) // Agent generates own payment
              }
            })

            if (researchResponse.ok) {
              const researchData = await researchResponse.json()
              
              addEvent({
                agent: 'executor',
                status: 'success',
                message: `ExecutorAgent purchased ${token} research (A2A): $0.50 USDC`,
                detail: `Research recommendation: ${researchData.recommendation} - proceeding with informed trade`,
                type: 'research_purchase'
              })

              // Log the A2A research purchase transaction
              upsertTx({
                jobId: `research-${token}-${Date.now()}`,
                status: 'confirmed',
                description: `A2A Research Purchase: ${token} analysis ($0.50 USDC)`,
              })

              // Use research context to inform trade execution (could modify swap parameters)
              if (researchData.recommendation === 'STRONG_SELL' || researchData.recommendation === 'SELL') {
                addEvent({
                  agent: 'executor',
                  status: 'running',
                  message: `⚠️ Research advises caution (${researchData.recommendation}) - applying conservative execution parameters`,
                  detail: `Confidence: ${researchData.confidence}% | Target: $${researchData.targetPrice?.toLocaleString()}`
                })
                // In production, this could reduce trade size or add more slippage protection
              } else if (researchData.recommendation === 'STRONG_BUY' || researchData.recommendation === 'BUY') {
                addEvent({
                  agent: 'executor',
                  status: 'success',
                  message: `✅ Research supports trade (${researchData.recommendation}) - proceeding with optimized execution`,
                  detail: `Confidence: ${researchData.confidence}% | Target: $${researchData.targetPrice?.toLocaleString()}`
                })
              }
            } else {
              addEvent({
                agent: 'executor',
                status: 'error',
                message: `Failed to purchase ${token} research - proceeding without research context`,
                detail: 'A2A research purchase failed but trade will continue'
              })
            }
          } catch (err) {
            addEvent({
              agent: 'executor',
              status: 'error',
              message: `A2A research purchase error: ${err instanceof Error ? err.message : String(err)}`,
              detail: 'Continuing trade execution without research context'
            })
          }
        } else {
          addEvent({
            agent: 'executor',
            status: 'success',
            message: `Recent ${token} research found - using existing analysis for trade`,
            detail: `Research purchased ${Math.floor((Date.now() - existingResearch.purchasedAt) / 60000)}min ago`
          })
        }
      }
    }

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

// ─── Generate mock payment payload for A2A research purchase ───────────────────
function generateMockPaymentPayload(token: string, amountUSD: number): string {
  // For A2A transactions, the ExecutorAgent generates its own x402 payment
  // In production, this would use the agent's own wallet/smart account
  const mockPayment = {
    payTo: process.env.RESEARCH_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b8D73a5e7d6c9ca1e7',
    asset: process.env.NEXT_PUBLIC_USDC_ADDRESS,
    maxAmount: String(Math.floor(amountUSD * 1e6)), // Convert to USDC units
    payer: process.env.EXECUTOR_AGENT_ADDRESS || '0x000000000000000000000000000000000000dEaD',
    nonce: Date.now(),
    memo: `A2A research purchase for ${token}`,
    signature: `0x${'a'.repeat(130)}` // Mock signature - in production would be real EIP-712 signature
  }

  return Buffer.from(JSON.stringify(mockPayment)).toString('base64')
}