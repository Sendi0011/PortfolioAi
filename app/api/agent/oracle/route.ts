import { NextResponse } from 'next/server'
import { fetchWithX402 } from '@/lib/x402'
import { summariseMarket, veniceGenerateChart } from '@/lib/venice'
import { addEvent, store } from '@/lib/store'

const TARGETS: Record<string, number> = JSON.parse(
  process.env.PORTFOLIO_TARGETS ?? '{"ETH":60,"USDC":40}'
)

/**
 * GET /api/agent/oracle
 *
 * Step 1 of the agent pipeline.
 * - Fetches live token prices (via x402 mock feed)
 * - Reads on-chain balances (mocked for testnet demo)
 * - Calls Venice AI to summarise market conditions
 * - Optionally generates a Venice chart image
 * - Updates the shared store so the dashboard can poll
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const withChart = searchParams.get('chart') === 'true'

  addEvent({ agent: 'oracle', status: 'running', message: 'Fetching prices and portfolio state…' })

  try {
    // ── 1. Prices via x402 (mock fallback enabled in .env) ──────────────────
    const prices = await fetchWithX402<Record<string, number>>(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/mock/prices`,
      null,   // no provider needed for mock
      ''
    )

    // ── 2. Portfolio balances (mock — replace with publicClient.readContract) ─
    const balances: Record<string, number> = {
      ETH:  0.45,
      USDC: 820,
    }

    // Compute USD values and allocations
    const values: Record<string, number> = {}
    for (const [token, amount] of Object.entries(balances)) {
      values[token] = amount * (prices[token] ?? 1)
    }
    const totalValueUSDC = Object.values(values).reduce((a, b) => a + b, 0)
    const allocations: Record<string, number> = {}
    for (const [token, val] of Object.entries(values)) {
      allocations[token] = (val / totalValueUSDC) * 100
    }

    // ── 3. Venice AI market summary ──────────────────────────────────────────
    console.log('🧠 Oracle: Calling Venice AI for market summary...')
    const marketSummary = await summariseMarket(prices, values)
    console.log('✅ Oracle: Market summary received:', marketSummary)

    // ── 4. Venice chart image (on demand to save credits during dev) ─────────
    let chartImageUrl: string | undefined
    if (withChart) {
      console.log('🎨 Oracle: Generating Venice AI chart...')
      try {
        chartImageUrl = await veniceGenerateChart(allocations)
        console.log('✅ Oracle: Chart generated successfully')
      } catch (chartError) {
        console.error('❌ Oracle: Chart generation failed:', chartError)
        // Continue without chart rather than failing completely
        chartImageUrl = undefined
      }
    }

    // ── 5. Persist to store ──────────────────────────────────────────────────
    store.portfolio = {
      prices,
      balances,
      allocations,
      totalValueUSDC,
      marketSummary,
      chartImageUrl: chartImageUrl ?? store.portfolio?.chartImageUrl,
      updatedAt: Date.now(),
    }

    addEvent({
      agent:   'oracle',
      status:  'success',
      message: `Portfolio snapped: $${totalValueUSDC.toFixed(2)} USDC total`,
      detail:  marketSummary,
      audioText: `Oracle analysis complete. ${marketSummary}` // Audio narration
    })

    return NextResponse.json({
      prices,
      balances,
      allocations,
      totalValueUSDC,
      marketSummary,
      chartImageUrl,
      targets: TARGETS,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('❌ Oracle Agent Error:', msg)
    console.error('Full error:', err)
    addEvent({ agent: 'oracle', status: 'error', message: 'OracleAgent failed', detail: msg })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}