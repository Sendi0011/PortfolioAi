import { NextResponse } from 'next/server'
import { addEvent, upsertTx } from '@/lib/store'

/**
 * POST /api/test-a2a
 * 
 * Test endpoint to simulate the complete A2A research purchase flow.
 * Shows: High-value trade detection → Research purchase → Research analysis → Informed execution
 */
export async function POST(request: Request) {
  try {
    const { token = 'ETH', tradeAmount = 85 } = await request.json()
    
    // Phase 1: High-value trade detection
    addEvent({
      agent: 'executor',
      status: 'running',
      message: `High-value trade detected ($${tradeAmount}) - checking research requirements`,
      detail: `Trade threshold: $50+ requires autonomous research purchase`
    })

    // Phase 2: A2A Research Purchase (500ms delay)
    setTimeout(() => {
      addEvent({
        agent: 'executor',
        status: 'running',
        message: `No recent ${token} research found - initiating A2A purchase`,
        detail: 'ExecutorAgent → ResearchProvider: Autonomous transaction in progress'
      })
    }, 500)

    // Phase 3: Research Purchase Success (1.5s delay)
    setTimeout(() => {
      addEvent({
        agent: 'executor',
        status: 'success',
        message: `ExecutorAgent purchased ${token} research (A2A): $0.50 USDC`,
        detail: `Research recommendation: BUY (78% confidence) - Target: $2,850`,
        type: 'research_purchase'
      })

      // Log the A2A transaction
      upsertTx({
        jobId: `research-${token}-${Date.now()}`,
        status: 'confirmed',
        description: `A2A Research Purchase: ${token} analysis ($0.50 USDC)`,
      })
    }, 1500)

    // Phase 4: Research-Informed Execution (3s delay)
    setTimeout(() => {
      addEvent({
        agent: 'executor',
        status: 'success',
        message: `✅ Research supports trade (BUY) - executing with optimized parameters`,
        detail: `Confidence: 78% | Target: $2,850 | Using research context for informed execution`
      })
    }, 3000)

    // Phase 5: Final Trade Execution (4s delay)
    setTimeout(() => {
      addEvent({
        agent: 'executor',
        status: 'success',
        message: `Trade executed successfully: $${tradeAmount} USDC → ${token}`,
        detail: `A2A research purchase enabled informed execution | Gas paid via 1Shot`
      })

      upsertTx({
        jobId: `swap-${token}-${Date.now()}`,
        status: 'confirmed',
        description: `Research-informed swap: $${tradeAmount} USDC → ${token}`,
      })
    }, 4000)

    return NextResponse.json({ 
      success: true, 
      message: 'A2A research purchase demonstration initiated',
      phases: [
        'Trade detection',
        'Research requirement check', 
        'Autonomous A2A purchase',
        'Research analysis integration',
        'Informed trade execution'
      ],
      token,
      tradeAmount,
      estimatedDuration: '4 seconds'
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}