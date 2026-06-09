'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { PortfolioPieChart }    from '@/components/PortfolioPieChart'
import { AgentActivityFeed }    from '@/components/AgentActivityFeed'
import { PermissionGrantModal } from '@/components/PermissionGrantModal'
import { TxStatusBadge }        from '@/components/TxStatusBadge'
import { StrategyMarketplace }  from '@/components/StrategyMarketplace'
import { ResearchPaywall }      from '@/components/ResearchPaywall'
import { AudioManager }         from '@/components/AudioManager'
import { AgentChat }            from '@/components/AgentChat'
import {
  requestRebalancePermission,
  createRootDelegation,
} from '@/lib/metamask'
import { serialiseDelegation } from '@/lib/store'
import type { AgentEvent, TxRecord, PortfolioSnapshot } from '@/lib/store'
import type { Address } from 'viem'

declare global {
  interface Window {
    ethereum?: Record<string, unknown> & {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
    }
  }
}

interface StateSnapshot {
  portfolio:    PortfolioSnapshot | null
  events:       AgentEvent[]
  transactions: TxRecord[]
  delegation:   { hasPermission: boolean; expiresAt?: number; smartAccount?: string }
  agentRunning: boolean
  activeStrategy: 'conservative' | 'aggressive' | 'balanced'
  audioEvents:  Array<{ id: string; text: string; timestamp: number; voice?: string }>
}

const POLL_MS = 4000   // dashboard polling interval

export default function DashboardPage() {
  const router  = useRouter()
  const [state,       setState]       = useState<StateSnapshot | null>(null)
  const [showModal,   setShowModal]   = useState(false)
  const [runLoading,  setRunLoading]  = useState(false)
  const [chartLoading,setChartLoading]= useState(false)
  const [toast,       setToast]       = useState('')
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // ── Poll shared state ─────────────────────────────────────────────────────
  const fetchState = useCallback(async () => {
    try {
      const res  = await fetch('/api/state')
      const data = await res.json() as StateSnapshot
      setState(data)
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    // Redirect if not connected
    if (!localStorage.getItem('portfolioai_smart_account')) {
      router.push('/')
      return
    }
    fetchState()
    pollingRef.current = setInterval(fetchState, POLL_MS)
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [fetchState, router])

  // ── Grant ERC-7715 permission ─────────────────────────────────────────────
  async function handleGrantPermission(maxUSDC: number) {
    const smartAcct   = localStorage.getItem('portfolioai_smart_account') as Address
    // OracleAgent address (in production, each agent deploys its own smart account)
    const oracleAgent = '0x000000000000000000000000000000000000bEEF' as Address

    const perm = await requestRebalancePermission(window.ethereum, oracleAgent, maxUSDC)
    const root = await createRootDelegation(window.ethereum, smartAcct, oracleAgent)

    // Persist to server store
    await fetch('/api/state', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        permissionId:    perm.permissionId,
        rootDelegation:  JSON.parse(serialiseDelegation(root)),
        grantedAt:       Date.now(),
        expiresAt:       perm.expiresAt,
        smartAccountAddress: smartAcct,
      }),
    })

    showToast('✓ Permission granted — agents can now rebalance')
    fetchState()
  }

  // ── Run agent pipeline ────────────────────────────────────────────────────
  async function handleRunAgents() {
    setRunLoading(true)
    try {
      const res  = await fetch('/api/agent/run', { method: 'POST' })
      const data = await res.json()
      if (data.error) showToast(`✗ ${data.error}`)
      else if (data.result === 'no-rebalance') showToast('✓ Portfolio balanced — no swaps needed')
      else showToast(`✓ Rebalancing: ${data.jobIds?.length ?? 0} swap(s) submitted`)
    } catch (e) {
      showToast(`✗ ${e instanceof Error ? e.message : 'Run failed'}`)
    } finally {
      setRunLoading(false)
    }
  }

  // ── Generate Venice chart ─────────────────────────────────────────────────
  async function handleGenerateChart() {
    setChartLoading(true)
    try {
      const res = await fetch('/api/agent/oracle?chart=true')
      if (res.ok) showToast('✓ Venice AI chart generated')
      else        showToast('✗ Chart generation failed')
      fetchState()
    } finally {
      setChartLoading(false)
    }
  }

  // ── Disconnect wallet ────────────────────────────────────────────────────────
  function handleDisconnect() {
    // Clear localStorage
    localStorage.removeItem('portfolioai_smart_account')
    localStorage.removeItem('portfolioai_eoa')
    
    // Redirect to landing page
    router.push('/')
  }

  // ── Handle strategy changes ────────────────────────────────────────────────
  function handleStrategyChange(newStrategy: 'conservative' | 'aggressive' | 'balanced') {
    setState(prev => prev ? { ...prev, activeStrategy: newStrategy } : null)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  const portfolio    = state?.portfolio
  const hasPermission = state?.delegation.hasPermission ?? false
  const targets      = { ETH: 60, USDC: 40 }

  return (
    <main className="min-h-screen flex flex-col bg-bg">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-30">
        <span className="font-display font-bold text-amber">PortfolioAI</span>

        <div className="flex items-center gap-3">
          {state?.agentRunning && (
            <span className="flex items-center gap-1.5 text-xs font-mono text-amber animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber" /> Agents running
            </span>
          )}

          {hasPermission ? (
            <span className="text-xs font-mono text-green bg-green/10 px-2.5 py-1 rounded-full ring-1 ring-green/30">
              ✓ Permission active
            </span>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="text-xs font-mono text-amber bg-amber/10 px-2.5 py-1 rounded-full ring-1 ring-amber/30 hover:bg-amber/20 transition-colors"
            >
              🔐 Grant Permission
            </button>
          )}

          <button
            onClick={handleRunAgents}
            disabled={runLoading || !hasPermission}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              'bg-amber text-bg hover:bg-amber/90 active:scale-95',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          >
            {runLoading ? '⟳ Running…' : '▶ Run Agents'}
          </button>

          <button
            onClick={handleDisconnect}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red bg-red/10 border border-red/30 hover:bg-red/20 transition-all"
            title="Disconnect wallet"
          >
            🔌
          </button>

          <AudioManager audioEvents={state?.audioEvents ?? []} />
        </div>
      </nav>

      <div className="flex-1 grid lg:grid-cols-[1fr_380px] gap-0 divide-x divide-border">

        {/* ── Left column: Portfolio ─────────────────────────────────────── */}
        <div className="flex flex-col divide-y divide-border">

          {/* Portfolio value + chart */}
          <div className="p-6 flex flex-col lg:flex-row gap-8 items-start">
            <PortfolioPieChart
              allocations={portfolio?.allocations ?? { ETH: 60, USDC: 40 }}
              veniceImageUrl={portfolio?.chartImageUrl}
              totalValueUSDC={portfolio?.totalValueUSDC ?? 0}
            />

            <div className="flex-1 space-y-5">
              {/* Total */}
              <div>
                <p className="text-xs font-mono text-subtle uppercase tracking-wider mb-1">Portfolio Value</p>
                <p className="text-3xl font-display font-bold text-text">
                  ${(portfolio?.totalValueUSDC ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  <span className="text-subtle text-base font-body ml-2">USDC</span>
                </p>
                {portfolio?.updatedAt && (
                  <p className="text-xs text-muted font-mono mt-1">
                    Last updated {new Date(portfolio.updatedAt).toLocaleTimeString()}
                  </p>
                )}
              </div>

              {/* Allocation bars */}
              <div className="space-y-2">
                <p className="text-xs font-mono text-subtle uppercase tracking-wider">Allocations vs Targets</p>
                {Object.entries(portfolio?.allocations ?? {}).map(([token, pct]) => {
                  const target  = targets[token as keyof typeof targets] ?? 0
                  const drift   = pct - target
                  const driftAbs = Math.abs(drift)
                  return (
                    <div key={token}>
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span className="text-text">{token}</span>
                        <span className={clsx(
                          driftAbs > 5 ? 'text-amber' : 'text-subtle'
                        )}>
                          {pct.toFixed(1)}%{target ? ` / ${target}%` : ''}
                          {driftAbs > 0.5 && (
                            <span className={drift > 0 ? 'text-green ml-1' : 'text-red ml-1'}>
                              ({drift > 0 ? '+' : ''}{drift.toFixed(1)}%)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min(pct, 100)}%`,
                            background: driftAbs > 5 ? '#f5a623' : '#22d18b',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Venice AI summary */}
              {portfolio?.marketSummary && (
                <div className="bg-surface rounded-xl p-4 border border-border/60">
                  <p className="text-xs font-mono text-amber mb-2 uppercase tracking-wider">
                    🧠 Venice AI Market Analysis
                  </p>
                  <p className="text-sm text-text leading-relaxed">{portfolio.marketSummary}</p>
                </div>
              )}

              {/* Chart generate button */}
              <button
                onClick={handleGenerateChart}
                disabled={chartLoading}
                className="text-xs font-mono text-subtle hover:text-amber transition-colors"
              >
                {chartLoading ? '⟳ Generating Venice chart…' : '🎨 Generate Venice AI chart'}
              </button>
            </div>


          </div>

          {/* Prices row */}
          {portfolio?.prices && (
            <div className="px-6 py-4 flex flex-wrap gap-6">
              {Object.entries(portfolio.prices).map(([token, price]) => (
                <div key={token}>
                  <p className="text-xs font-mono text-subtle">{token}</p>
                  <p className="text-sm font-mono text-text">${price.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}

          {/* Transaction history */}
          <div className="p-6">
            <p className="text-xs font-mono text-subtle uppercase tracking-wider mb-4">
              Transaction History — 1Shot Relayer
            </p>
            {(state?.transactions ?? []).length === 0 ? (
              <p className="text-subtle text-sm font-mono">No transactions yet</p>
            ) : (
              <div className="space-y-2">
                {(state?.transactions ?? []).map((tx) => (
                  <div
                    key={tx.jobId}
                    className="flex items-center justify-between gap-4 bg-surface border border-border rounded-xl px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-text truncate">{tx.description}</p>
                      <p className="text-xs font-mono text-muted">Job: {tx.jobId.slice(0, 16)}…</p>
                    </div>
                    <TxStatusBadge status={tx.status} txHash={tx.txHash} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Natural Language Transfer Chat */}
          <div className="p-6 border-t border-border">
            <AgentChat
              smartAccountAddress={state?.delegation.smartAccount}
              hasPermission={hasPermission}
            />
          </div>
        </div>

        {/* ── Right column: Agent feed ───────────────────────────────────── */}
        <div className="flex flex-col bg-surface divide-y divide-border">
          
          {/* Strategy Marketplace - compact professional version */}
          <div className="p-4">
            <StrategyMarketplace
              activeStrategy={state?.activeStrategy ?? 'balanced'}
              onStrategyChange={handleStrategyChange}
            />
          </div>

          {/* Research Paywall - One card per major token */}
          <div className="p-4 space-y-3">
            <ResearchPaywall
              token="ETH"
              currentPrice={portfolio?.prices?.ETH ?? 2400}
              smartAccountAddress={state?.delegation.smartAccount}
            />
          </div>

          <AgentActivityFeed
            events={state?.events ?? []}
            agentRunning={state?.agentRunning}
          />
        </div>
      </div>

      {/* ── Modals & toasts ────────────────────────────────────────────── */}
      {showModal && (
        <PermissionGrantModal
          onGrant={handleGrantPermission}
          onClose={() => setShowModal(false)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-panel border border-border rounded-xl px-5 py-3 text-sm font-mono text-text shadow-xl">
            {toast}
          </div>
        </div>
      )}
    </main>
  )
}
