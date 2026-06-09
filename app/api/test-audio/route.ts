import { NextResponse } from 'next/server'
import { addEvent, addAudioEvent } from '@/lib/store'

/**
 * POST /api/test-audio
 * 
 * Test endpoint to demonstrate Venice AI audio narration.
 * Simulates the 3 key moments with audio narration.
 */
export async function POST() {
  try {
    // Moment 1: Oracle completes analysis
    setTimeout(() => {
      addEvent({
        agent: 'oracle',
        status: 'success',
        message: 'Portfolio analysis complete',
        detail: 'Market showing mixed signals with ETH consolidating above key support levels',
        audioText: 'Oracle analysis complete. Market showing mixed signals with ETH consolidating above key support levels.'
      })
    }, 500)

    // Moment 2: Judge delivers debate verdict  
    setTimeout(() => {
      addEvent({
        agent: 'strategy',
        status: 'success',
        message: 'Debate verdict: BUY',
        detail: 'Bull scored 78, Bear scored 65. Technical indicators support moderate accumulation.',
        audioText: 'Judge verdict reached: BUY. Technical indicators support moderate accumulation.'
      })
    }, 2000)

    // Moment 3: Executor confirms trade
    setTimeout(() => {
      addEvent({
        agent: 'executor', 
        status: 'success',
        message: 'Trade executed successfully',
        detail: '$75 USDC → ETH via 1Shot relayer',
        audioText: 'Trade executed: 75 dollars USDC to ETH'
      })
    }, 3500)

    return NextResponse.json({ 
      success: true, 
      message: 'Audio narration test sequence initiated',
      moments: [
        'Oracle analysis (0.5s)',
        'Judge verdict (2s)', 
        'Trade confirmation (3.5s)'
      ]
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}