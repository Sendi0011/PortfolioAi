'use client'
import { useState, useEffect } from 'react'
import { clsx } from 'clsx'

interface DebateResult {
  bull: {
    arguments: string
    confidence: number
  }
  bear: {
    arguments: string  
    confidence: number
  }
  judge: {
    verdict: 'BUY' | 'SELL' | 'HOLD'
    bullScore: number
    bearScore: number
    reasoning: string
  }
}

interface Props {
  debate: DebateResult
  token: string
  price: number
}

export function DebateCard({ debate, token, price }: Props) {
  const [phase, setPhase] = useState<'bull' | 'bear' | 'judge'>('bull')
  const [expanded, setExpanded] = useState(false)

  // Animate through debate phases
  useEffect(() => {
    const timer1 = setTimeout(() => setPhase('bear'), 800)
    const timer2 = setTimeout(() => setPhase('judge'), 1600) 
    
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  const verdictColor = {
    BUY: 'text-green',
    SELL: 'text-red', 
    HOLD: 'text-amber'
  }[debate.judge.verdict]

  const verdictBg = {
    BUY: 'bg-green/10 border-green/30',
    SELL: 'bg-red/10 border-red/30',
    HOLD: 'bg-amber/10 border-amber/30'
  }[debate.judge.verdict]

  return (
    <div className="space-y-3 p-4 bg-surface/80 rounded-xl border border-border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-display font-semibold text-text">
          🥊 Bull vs Bear Debate
        </h4>
        <span className="text-xs font-mono text-subtle">
          {token} ${price.toLocaleString()}
        </span>
      </div>

      {/* Debate Arguments - Side by Side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        
        {/* Bull Case */}
        <div className={clsx(
          'p-3 rounded-lg border transition-all duration-500',
          phase === 'bull' || phase === 'bear' || phase === 'judge'
            ? 'border-green/40 bg-green/5' 
            : 'border-border/30 bg-surface/40',
          phase === 'bull' && 'ring-1 ring-green/20'
        )}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green text-sm">🐂</span>
            <span className="text-xs font-mono text-green font-semibold">BULL CASE</span>
            <span className="text-xs font-mono text-subtle ml-auto">
              {debate.judge.bullScore}/100
            </span>
          </div>
          
          <p className={clsx(
            'text-xs text-subtle leading-relaxed transition-opacity duration-300',
            phase === 'bull' || phase === 'bear' || phase === 'judge' ? 'opacity-100' : 'opacity-40',
            !expanded && 'line-clamp-3'
          )}>
            {debate.bull.arguments}
          </p>
        </div>

        {/* Bear Case */}
        <div className={clsx(
          'p-3 rounded-lg border transition-all duration-500',
          phase === 'bear' || phase === 'judge'
            ? 'border-red/40 bg-red/5'
            : 'border-border/30 bg-surface/40',
          phase === 'bear' && 'ring-1 ring-red/20'
        )}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red text-sm">🐻</span>
            <span className="text-xs font-mono text-red font-semibold">BEAR CASE</span>
            <span className="text-xs font-mono text-subtle ml-auto">
              {debate.judge.bearScore}/100
            </span>
          </div>
          
          <p className={clsx(
            'text-xs text-subtle leading-relaxed transition-opacity duration-300',
            phase === 'bear' || phase === 'judge' ? 'opacity-100' : 'opacity-40',
            !expanded && 'line-clamp-3'
          )}>
            {debate.bear.arguments}
          </p>
        </div>
      </div>

      {/* Judge Verdict */}
      {phase === 'judge' && (
        <div className={clsx(
          'p-3 rounded-lg border animate-fade-in',
          verdictBg
        )}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">⚖️</span>
            <span className="text-xs font-mono font-semibold text-text">JUDGE VERDICT</span>
            <span className={clsx('text-xs font-mono font-bold ml-auto', verdictColor)}>
              {debate.judge.verdict}
            </span>
          </div>
          
          <p className="text-xs text-subtle leading-relaxed">
            {debate.judge.reasoning}
          </p>

          {/* Score Bar */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs font-mono text-green">{debate.judge.bullScore}</span>
            <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
              <div className="h-full flex">
                <div 
                  className="bg-green transition-all duration-700"
                  style={{ width: `${(debate.judge.bullScore / (debate.judge.bullScore + debate.judge.bearScore)) * 100}%` }}
                />
                <div 
                  className="bg-red transition-all duration-700"
                  style={{ width: `${(debate.judge.bearScore / (debate.judge.bullScore + debate.judge.bearScore)) * 100}%` }}
                />
              </div>
            </div>
            <span className="text-xs font-mono text-red">{debate.judge.bearScore}</span>
          </div>
        </div>
      )}

      {/* Expand Toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs font-mono text-subtle hover:text-text transition-colors w-full text-center py-1"
      >
        {expanded ? 'View Less ↑' : 'View Full Debate ↓'}
      </button>
    </div>
  )
}