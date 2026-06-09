import { NextResponse } from 'next/server'
import { addEvent } from '@/lib/store'

/**
 * POST /api/test-chat
 * 
 * Test endpoint to demonstrate natural language transfer feature.
 * Simulates a complete transfer flow with chat interaction.
 */
export async function POST() {
  try {
    // Simulate user chat: "Send 25 USDC to 0x742d35Cc6634C0532925a3b8D73a5e7d6c9ca1e7"
    setTimeout(() => {
      addEvent({
        agent: 'executor',
        status: 'success',
        message: 'Natural language transfer: 25 USDC',
        detail: 'Sent to 0x742d...a1e7 via 1Shot',
        type: 'transfer',
        audioText: 'Transfer executed: 25 USDC sent to recipient'
      })
    }, 1000)

    return NextResponse.json({ 
      success: true, 
      message: 'Natural language transfer test initiated',
      example: 'Send 25 USDC to 0x742d35Cc6634C0532925a3b8D73a5e7d6c9ca1e7'
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}