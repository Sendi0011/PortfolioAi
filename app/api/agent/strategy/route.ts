import { NextResponse } from 'next/server'
import { reasonRebalance } from '@/lib/venice'
import { redelegateToAgent } from '@/lib/metamask'
import { addEvent, store, deserialiseDelegation, serialiseDelegation } from '@/lib/store'
import type { Address } from 'viem'

const TARGETS: Record<string, number> = JSON.parse(
  process.env.PORTFOLIO_TARGETS ?? '{"ETH":60,"USDC":40}'
)
const THRESHOLD  = Number(process.env.REBALANCE_THRESHOLD_PCT ?? 5)
const MAX_SPEND  = Number(process.env.MAX_WEEKLY_SPEND_USDC ?? 200)

// ExecutorAgent address — in production each agent has a dedicated smart account
const EXECUTOR_AGENT_ADDRESS = (
  process.env.EXECUTOR_AGENT_ADDRESS ?? '0x000000000000000000000000000000000000dEaD'
) as Address

/**
 * POST /api/agent/strategy
 *
 * Body: { oracleDelegationSerialized: string }  — the oracle's redelegated permission
 *
 * Step 2 of the agent pipeline.
 * - Reads oracle data from the shared store
 * - Calls Venice AI to decide whether to rebalance
 * - If yes, creates an ERC-7710 redelegation to ExecutorAgent
 * - Returns the signed decision + executor delegation
 */
export async function POST(request: Request) {
  addEvent({ agent: 'strategy', status: 'running', message: 'Reasoning about rebalance…' })

  try {
    const body = await request.json()
    const oracleDelegation = deserialiseDelegation(body.oracleDelegationSerialized)

    const portfolio = store.portfolio
    if (!portfolio) {
      throw new Error('No portfolio snapshot — run OracleAgent first')
    }

    // ── Venice AI reasoning with strategy-specific prompts ──────────────────
    const decision = await reasonRebalance(
      portfolio.prices,
      portfolio.allocations,
      TARGETS,
      portfolio.totalValueUSDC,
      THRESHOLD,
      MAX_SPEND,
      store.activeStrategy  // Pass the active strategy for prompt selection
    )

    addEvent({
      agent:   'strategy',
      status:  decision.shouldRebalance ? 'success' : 'skipped',
      message: decision.shouldRebalance
        ? `Rebalance recommended: ${decision.actions.length} swap(s) (confidence: ${decision.confidence ?? 'unknown'}%)`
        : 'No rebalance needed — allocations within threshold',
      detail: decision.reasoning,
    })

    // ── Trigger debate if confidence is low ─────────────────────────────────────
    let debateResult = null
    const confidenceThreshold = 60 // Standard threshold for low confidence
    
    if (decision.shouldRebalance && (decision.confidence ?? 100) < confidenceThreshold) {
      try {
        addEvent({
          agent: 'strategy',
          status: 'running',
          message: `Low confidence (${decision.confidence}%) — triggering Bull vs Bear debate`
        })

        const debateRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/agent/debate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: 'ETH', // Primary token for debate
            currentPrice: portfolio.prices.ETH ?? 2400,
            portfolioAllocation: portfolio.allocations.ETH ?? 60
          })
        })

        if (debateRes.ok) {
          debateResult = await debateRes.json()
          
          // Add debate activity to feed
          addEvent({
            agent: 'strategy',
            status: 'success',
            message: `Debate verdict: ${debateResult.judge.verdict}`,
            detail: `Bull ${debateResult.judge.bullScore} vs Bear ${debateResult.judge.bearScore}`,
            type: 'debate',
            debateData: debateResult
          })
        }
      } catch (err) {
        console.warn('Debate failed:', err)
        addEvent({
          agent: 'strategy',
          status: 'error',
          message: 'Debate failed — proceeding with original decision'
        })
      }
    }

    if (!decision.shouldRebalance || decision.actions.length === 0) {
      return NextResponse.json({ decision, debateResult: null, executorDelegation: null })
    }

    // ── ERC-7710 Redelegation: StrategyAgent → ExecutorAgent ─────────────────
    // Restrict the executor's delegation to only the specific swaps required
    const totalSwapUSDC = decision.actions.reduce((s, a) => s + a.amountUSDC, 0)

    const executorDelegation = await redelegateToAgent(
      oracleDelegation,
      EXECUTOR_AGENT_ADDRESS,
      [
        {
          enforcer: 'ERC20TransferAmountEnforcer',
          terms: {
            token:     process.env.NEXT_PUBLIC_USDC_ADDRESS,
            maxAmount: String(Math.ceil(totalSwapUSDC * 1e6)),
          },
        },
      ]
    )

    addEvent({
      agent:   'strategy',
      status:  'success',
      message: `ERC-7710 redelegation created → ExecutorAgent`,
      detail:  `Swap budget: ${totalSwapUSDC.toFixed(2)} USDC`,
    })

    return NextResponse.json({
      decision,
      debateResult,
      executorDelegationSerialized: serialiseDelegation(executorDelegation),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    addEvent({ agent: 'strategy', status: 'error', message: 'StrategyAgent failed', detail: msg })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}