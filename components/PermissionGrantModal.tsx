'use client'
import { useState } from 'react'
import { clsx } from 'clsx'

interface Props {
  onGrant: (maxUSDC: number) => Promise<void>
  onClose: () => void
}

export function PermissionGrantModal({ onGrant, onClose }: Props) {
  const [maxUSDC, setMaxUSDC] = useState(200)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  async function handleGrant() {
    setLoading(true)
    setError('')
    try {
      await onGrant(maxUSDC)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Permission request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-panel border border-border rounded-2xl shadow-2xl animate-slide-up overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber/10 flex items-center justify-center text-amber text-base">
              🔐
            </div>
            <h2 className="text-lg font-display font-semibold text-text">
              Grant Rebalance Permission
            </h2>
          </div>
          <p className="text-sm text-subtle leading-relaxed">
            ERC-7715 Advanced Permission — approve once, agents run forever.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Delegation chain diagram */}
          <div className="bg-surface rounded-xl p-4 border border-border/60">
            <p className="text-xs font-mono text-subtle mb-3 uppercase tracking-wider">
              ERC-7710 A2A Redelegation Chain
            </p>
            <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono">
              {['You (Root)', '→', 'OracleAgent', '→', 'StrategyAgent', '→', 'ExecutorAgent'].map(
                (item, i) => (
                  <span
                    key={i}
                    className={clsx(
                      item === '→' ? 'text-muted' : 'bg-border/60 text-amber px-2 py-0.5 rounded'
                    )}
                  >
                    {item}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Spend cap slider */}
          <div>
            <label className="flex justify-between text-sm mb-2">
              <span className="text-text">Weekly spend cap</span>
              <span className="font-mono text-amber">{maxUSDC} USDC</span>
            </label>
            <input
              type="range"
              min={10}
              max={1000}
              step={10}
              value={maxUSDC}
              onChange={(e) => setMaxUSDC(Number(e.target.value))}
              className="w-full accent-amber"
            />
            <div className="flex justify-between text-xs text-muted mt-1 font-mono">
              <span>10 USDC</span>
              <span>1000 USDC</span>
            </div>
          </div>

          {/* Permission details */}
          <ul className="space-y-2">
            {[
              ['Permission type',  'ERC-7715 native-token-transfer'],
              ['Delegation type',  'ERC-7710 redelegation chain'],
              ['Period',           '7 days (auto-expiry)'],
              ['Gas payment',      '1Shot Relayer — USDC on Base'],
            ].map(([k, v]) => (
              <li key={k} className="flex justify-between text-xs">
                <span className="text-subtle">{k}</span>
                <span className="font-mono text-text">{v}</span>
              </li>
            ))}
          </ul>

          {error && (
            <p className="text-xs text-red bg-red/10 border border-red/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-subtle text-sm hover:text-text hover:border-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGrant}
            disabled={loading}
            className={clsx(
              'flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
              'bg-amber text-bg hover:bg-amber/90 active:scale-95',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              loading && 'animate-pulse'
            )}
          >
            {loading ? 'Waiting for MetaMask…' : 'Approve in MetaMask'}
          </button>
        </div>
      </div>
    </div>
  )
}