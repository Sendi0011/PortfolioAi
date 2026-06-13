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
    wallet: {
      address:     store.wallet.address,
      isConnected: store.wallet.isConnected,
      chainId:     store.wallet.chainId,
    },
    agentRunning: store.agentRunning,
    activeStrategy: store.activeStrategy,
    audioEvents: store.audioEvents.slice(0, 20), // Latest 20 audio events
  })
}

/**
 * POST /api/state
 * Saves delegation state and wallet state from the client after wallet interaction.
 * Also handles activeStrategy updates.
 */
export async function POST(request: Request) {
  const body = await request.json()
  
  // Handle activeStrategy updates
  if (body.activeStrategy) {
    store.activeStrategy = body.activeStrategy
  }
  
  // Handle wallet updates
  if (body.smartAccountAddress !== undefined) {
    store.wallet.address = body.smartAccountAddress
    store.wallet.isConnected = !!body.smartAccountAddress
    store.delegation.smartAccountAddress = body.smartAccountAddress
  }
  
  // Handle delegation updates (exclude activeStrategy and smartAccountAddress to avoid conflicts)
  const { activeStrategy, smartAccountAddress, ...delegationData } = body
  Object.assign(store.delegation, delegationData)
  
  return NextResponse.json({ ok: true })
}