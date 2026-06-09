'use client'
import { useState, useEffect } from 'react'
import { clsx } from 'clsx'
import { initiateResearchPayment } from '@/lib/x402'

declare global {
  interface Window {
    ethereum?: Record<string, unknown> & {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
    }
  }
}

interface ResearchReport {
  marketSentiment: string
  riskFactors: string[]
  priceCatalysts: string[]
  technicalAnalysis: string
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL'
  confidence: number
  targetPrice?: number
}

interface Props {
  token: string
  currentPrice: number
  smartAccountAddress?: string
}

export function ResearchPaywall({ token, currentPrice, smartAccountAddress }: Props) {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [report, setReport] = useState<ResearchReport | null>(null)
  const [txHash, setTxHash] = useState<string>('')
  const [error, setError] = useState('')

  // Check if research is already purchased for this token
  useEffect(() => {
    checkExistingResearch()
  }, [token])

  async function checkExistingResearch() {
    try {
      const response = await fetch(`/api/research?token=${token}`)
      if (response.ok) {
        const data = await response.json()
        setReport(data)
        setIsUnlocked(true)
      }
    } catch {
      // No existing research, show paywall
    }
  }

  async function handleUnlockResearch() {
    if (!window.ethereum || !smartAccountAddress) {
      setError('MetaMask not connected')
      return
    }

    setIsLoading(true)
    setError('') // Clear any previous errors

    try {
      const result = await initiateResearchPayment(
        token,
        window.ethereum,
        smartAccountAddress
      )

      if (result.success && result.report) {
        setReport(result.report as ResearchReport)
        setIsUnlocked(true)
        setTxHash(result.txHash || '')
        setError('') // Clear any errors on success
      } else {
        setError(result.error || 'Payment failed')
      }
    } catch (err) {
      console.error('Research payment error:', err)
      const errorMsg = err instanceof Error ? err.message : 'Payment failed'
      
      // Handle common MetaMask errors
      if (errorMsg.includes('User rejected') || errorMsg.includes('user rejected')) {
        setError('Payment cancelled by user')
      } else if (errorMsg.includes('insufficient funds') || errorMsg.includes('Insufficient funds')) {
        setError('Insufficient funds for payment')
      } else {
        setError(errorMsg)
      }
    } finally {
      // Always reset loading state
      setIsLoading(false)
    }
  }

  const recommendationColors = {
    STRONG_BUY: 'text-green bg-green/20 border-green/30',
    BUY: 'text-green bg-green/10 border-green/20',
    HOLD: 'text-amber bg-amber/10 border-amber/20',
    SELL: 'text-red bg-red/10 border-red/20',
    STRONG_SELL: 'text-red bg-red/20 border-red/30'
  }

  if (isUnlocked && report) {
    return (
      <div className="bg-surface rounded-xl border border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-display font-semibold text-text">
            📊 {token} Research Report
          </h3>
          <div className="flex items-center gap-2">
            <span className={clsx(
              'text-xs font-mono px-2 py-1 rounded border',
              recommendationColors[report.recommendation]
            )}>
              {report.recommendation}
            </span>
            <span className="text-xs font-mono text-subtle">
              {report.confidence}%
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {/* Market Sentiment */}
          <div>
            <h4 className="text-xs font-mono text-subtle uppercase tracking-wider mb-1">
              Market Sentiment
            </h4>
            <p className="text-sm text-text leading-relaxed">{report.marketSentiment}</p>
          </div>

          {/* Price Target */}
          {report.targetPrice && (
            <div>
              <h4 className="text-xs font-mono text-subtle uppercase tracking-wider mb-1">
                Price Target
              </h4>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-display font-semibold text-text">
                  ${report.targetPrice.toLocaleString()}
                </span>
                <span className={clsx(
                  'text-xs font-mono',
                  report.targetPrice > currentPrice ? 'text-green' : 'text-red'
                )}>
                  {report.targetPrice > currentPrice ? '+' : ''}{((report.targetPrice - currentPrice) / currentPrice * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          )}

          {/* Risk Factors */}
          <div>
            <h4 className="text-xs font-mono text-subtle uppercase tracking-wider mb-2">
              Key Risk Factors
            </h4>
            <ul className="space-y-1">
              {report.riskFactors.map((risk, i) => (
                <li key={i} className="text-xs text-subtle flex items-start gap-2">
                  <span className="text-red mt-0.5">•</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Price Catalysts */}
          <div>
            <h4 className="text-xs font-mono text-subtle uppercase tracking-wider mb-2">
              Price Catalysts
            </h4>
            <ul className="space-y-1">
              {report.priceCatalysts.map((catalyst, i) => (
                <li key={i} className="text-xs text-subtle flex items-start gap-2">
                  <span className="text-green mt-0.5">•</span>
                  <span>{catalyst}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Technical Analysis */}
          <div>
            <h4 className="text-xs font-mono text-subtle uppercase tracking-wider mb-1">
              Technical Analysis
            </h4>
            <p className="text-xs text-subtle leading-relaxed">{report.technicalAnalysis}</p>
          </div>
        </div>

        {txHash && (
          <div className="pt-2 border-t border-border/50">
            <span className="text-xs font-mono text-green">
              ✓ Paid via x402 • {txHash}
            </span>
          </div>
        )}
      </div>
    )
  }

  // Paywall view
  return (
    <div className="bg-surface rounded-xl border border-border p-4 relative overflow-hidden">
      {/* Blurred preview */}
      <div className="blur-sm select-none pointer-events-none opacity-40">
        <h3 className="text-sm font-display font-semibold text-text mb-3">
          📊 {token} Research Report
        </h3>
        <div className="space-y-2">
          <div className="h-4 bg-border rounded w-3/4"></div>
          <div className="h-4 bg-border rounded w-1/2"></div>
          <div className="h-4 bg-border rounded w-5/6"></div>
          <div className="space-y-1 mt-3">
            <div className="h-3 bg-border rounded w-2/3"></div>
            <div className="h-3 bg-border rounded w-1/2"></div>
            <div className="h-3 bg-border rounded w-3/4"></div>
          </div>
        </div>
      </div>

      {/* Unlock overlay */}
      <div className="absolute inset-0 bg-surface/90 flex flex-col items-center justify-center text-center p-6">
        <div className="space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber/20 border border-amber/30 flex items-center justify-center">
            <span className="text-amber text-lg">🔒</span>
          </div>
          
          <div>
            <h4 className="text-sm font-display font-semibold text-text">
              Premium Research Report
            </h4>
            <p className="text-xs text-subtle mt-1">
              Comprehensive {token} analysis with price targets, risk assessment, and technical indicators
            </p>
          </div>

          {error && (
            <div className="text-xs text-red bg-red/10 border border-red/20 rounded px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              onClick={handleUnlockResearch}
              disabled={isLoading || !smartAccountAddress}
              className={clsx(
                'px-4 py-2 rounded-lg text-xs font-medium transition-all',
                'bg-amber text-bg hover:bg-amber/90 active:scale-95',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                isLoading && 'animate-pulse'
              )}
            >
              {isLoading ? '⟳ Processing Payment…' : error && !isLoading ? 'Try Again' : 'Unlock for 0.50 USDC'}
            </button>

            {error && !isLoading && (
              <button
                onClick={() => setError('')}
                className="text-xs text-subtle hover:text-text transition-colors"
              >
                Clear error
              </button>
            )}
          </div>

          <p className="text-xs text-muted">
            Secured by x402 payment protocol
          </p>
        </div>
      </div>
    </div>
  )
}