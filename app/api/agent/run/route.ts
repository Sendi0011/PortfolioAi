import { NextResponse } from 'next/server'
import { addEvent, store, serialiseDelegation, deserialiseDelegation } from '@/lib/store'
import { redelegateToAgent } from '@/lib/metamask'
import type { Address } from 'viem'

const STRATEGY_AGENT_ADDRESS = (
  process.env.STRATEGY_AGENT_ADDRESS ?? '0x000000000000000000000000000000000000bEEF'
) as Address

/**
 * POST /api/agent/run
 * Orchestrates the full OracleAgent → StrategyAgent → ExecutorAgent pipeline.
 * Called by the dashboard's "Run Agents" button or a cron trigger.
 */
export async function POST() {
  if (store.agentRunning) {
    return NextResponse.json({ error: 'Agent loop already running' }, { status: 409 })
  }

  if (!store.delegation.rootDelegation) {
    return NextResponse.json(
      { error: 'No delegation found — grant permission first' },
      { status: 400 }
    )
  }

  store.agentRunning = true
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  try {
    // ── Step 1: OracleAgent ──────────────────────────────────────────────────
    addEvent({ agent: 'oracle', status: 'running', message: 'OracleAgent starting…' })
    const oracleRes = await fetch(`${baseUrl}/api/agent/oracle?chart=true`)
    if (!oracleRes.ok) throw new Error(`OracleAgent failed: ${oracleRes.status}`)

    // OracleAgent redelegates root → StrategyAgent
    const rootDelegation = deserialiseDelegation(
      JSON.stringify(store.delegation.rootDelegation)
    )
    const oracleDelegation = await redelegateToAgent(rootDelegation, STRATEGY_AGENT_ADDRESS)
    store.delegation.oracleDelegation = oracleDelegation

    addEvent({
      agent:   'oracle',
      status:  'success',
      message: 'OracleAgent → StrategyAgent redelegation created',
    })

    // ── Step 2: StrategyAgent ────────────────────────────────────────────────
    addEvent({ agent: 'strategy', status: 'running', message: 'StrategyAgent reasoning…' })
    const stratRes = await fetch(`${baseUrl}/api/agent/strategy`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oracleDelegationSerialized: serialiseDelegation(oracleDelegation),
      }),
    })
    if (!stratRes.ok) throw new Error(`StrategyAgent failed: ${stratRes.status}`)
    const stratData = await stratRes.json()

    if (!stratData.decision?.shouldRebalance || !stratData.executorDelegationSerialized) {
      addEvent({ agent: 'strategy', status: 'skipped', message: 'No rebalance needed — pipeline complete' })
      store.agentRunning = false
      return NextResponse.json({ result: 'no-rebalance', decision: stratData.decision })
    }

    // ── Step 3: ExecutorAgent ────────────────────────────────────────────────
    addEvent({ agent: 'executor', status: 'running', message: 'ExecutorAgent firing swaps…' })
    const execRes = await fetch(`${baseUrl}/api/agent/execute`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        executorDelegationSerialized: stratData.executorDelegationSerialized,
        decision: stratData.decision,
      }),
    })
    if (!execRes.ok) throw new Error(`ExecutorAgent failed: ${execRes.status}`)
    const execData = await execRes.json()

    store.agentRunning = false
    return NextResponse.json({
      result:  'rebalanced',
      jobIds:  execData.jobIds,
      decision: stratData.decision,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    addEvent({ agent: 'executor', status: 'error', message: 'Pipeline error', detail: msg })
    store.agentRunning = false
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}