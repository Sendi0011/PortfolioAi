import { NextResponse } from 'next/server'
import { store } from '@/lib/store'

/**
 * GET /api/state
 * Returns the current shared store snapshot for dashboard polling.
 */
export async function GET() {
  return NextResponse.json({
    portfolio:    store.portfolio,
    events:       store.events.slice(0, 50),
    transactions: store.transactions.slice(0, 20),
    delegation:   {
      hasPermission: !!store.delegation.permissionId,
      expiresAt:     store.delegation.expiresAt,
      smartAccount:  store.delegation.smartAccountAddress,
    },
    agentRunning: store.agentRunning,
    activeStrategy: store.activeStrategy,
  })
}

/**
 * POST /api/state/delegation
 * Saves delegation state from the client after wallet interaction.
 * Also handles activeStrategy updates.
 */
export async function POST(request: Request) {
  const body = await request.json()
  
  // Handle activeStrategy updates
  if (body.activeStrategy) {
    store.activeStrategy = body.activeStrategy
  }
  
  // Handle delegation updates (exclude activeStrategy to avoid overwriting store.delegation)
  const { activeStrategy, ...delegationData } = body
  Object.assign(store.delegation, delegationData)
  
  return NextResponse.json({ ok: true })
}