'use client'
import { useState, useEffect } from 'react'
import { clsx } from 'clsx'

interface Props {
  token: string
  amount: number
  txHash?: string
}

export function ResearchPurchaseCard({ token, amount, txHash }: Props) {
  const [animationPhase, setAnimationPhase] = useState<'locked' | 'unlocking' | 'unlocked'>('locked')

  // Animate the unlock sequence
  useEffect(() => {
    const timer1 = setTimeout(() => setAnimationPhase('unlocking'), 300)
    const timer2 = setTimeout(() => setAnimationPhase('unlocked'), 1200)
    
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  return (
    <div className="bg-surface/80 rounded-lg border border-border p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={clsx(
            'w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-500',
            animationPhase === 'locked' ? 'border-amber/30 bg-amber/10' :
            animationPhase === 'unlocking' ? 'border-amber bg-amber/20 animate-pulse' :
            'border-green bg-green/20'
          )}>
            <span className="text-sm">
              {animationPhase === 'locked' ? '🔒' :
               animationPhase === 'unlocking' ? '⟳' : '🔓'}
            </span>
          </div>
          
          <div>
            <h4 className="text-xs font-display font-semibold text-text">
              A2A Research Purchase
            </h4>
            <span className="text-xs text-subtle">{token} Market Analysis</span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-mono text-amber font-medium">
            ${amount.toFixed(2)} USDC
          </span>
          {animationPhase === 'unlocked' && (
            <div className="text-xs text-green">
              ✓ Delivered
            </div>
          )}
        </div>
      </div>

      {/* Progress Animation */}
      {animationPhase === 'unlocking' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-subtle">
            <span className="animate-spin">⟳</span>
            <span>ExecutorAgent purchasing research...</span>
          </div>
          <div className="w-full bg-border rounded-full h-1 overflow-hidden">
            <div className="h-full bg-amber animate-pulse rounded-full w-3/4 transition-all duration-1000"></div>
          </div>
        </div>
      )}

      {/* Unlocked Content */}
      {animationPhase === 'unlocked' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-subtle">Agent-to-Agent Transaction</span>
            <span className="text-green font-mono">CONFIRMED</span>
          </div>
          
          <div className="bg-green/10 border border-green/20 rounded p-2 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-green">
                <span>🤖</span>
                <span className="font-medium">Agent-to-Agent Economic Transaction</span>
              </div>
              <span className="text-xs font-mono text-green">SUCCESS</span>
            </div>
            
            <div className="text-xs text-subtle">
              <div className="mb-1">
                <strong>Flow:</strong> ExecutorAgent → ResearchProvider → Comprehensive {token} Analysis
              </div>
              <div>
                <strong>Result:</strong> Agent now has market sentiment, risk factors, price catalysts, and technical analysis for informed trade execution
              </div>
            </div>
          </div>

          {txHash && (
            <div className="text-xs font-mono text-muted">
              Tx: {txHash}
            </div>
          )}
        </div>
      )}
    </div>
  )
}