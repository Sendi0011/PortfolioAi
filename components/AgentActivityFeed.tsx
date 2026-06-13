'use client'
import React from 'react'
import { clsx } from 'clsx'
import { ResearchPurchaseCard } from './ResearchPurchaseCard'
import { TransferCard } from './TransferCard'
import type { AgentEvent } from '@/lib/store'

// Helper function to safely render unknown data
function renderDebateData(data: unknown): string {
  if (data === null || data === undefined) {
    return 'No debate data available'
  }
  if (typeof data === 'object') {
    try {
      return JSON.stringify(data, null, 2)
    } catch {
      return 'Invalid debate data'
    }
  }
  return String(data)
}

const AGENT_LABELS: Record<string, string> = {
  oracle:   'OracleAgent',
  strategy: 'StrategyAgent',
  executor: 'ExecutorAgent',
  webhook:  '1Shot Webhook',
}

const STATUS_COLORS: Record<string, string> = {
  running: 'text-amber',
  success: 'text-green',
  error:   'text-red',
  skipped: 'text-subtle',
}

const STATUS_ICONS: Record<string, string> = {
  running: '⟳',
  success: '✓',
  error:   '✗',
  skipped: '–',
}

interface Props {
  events: AgentEvent[]
  agentRunning?: boolean
}

export function AgentActivityFeed({ events, agentRunning }: Props) {
  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-xs font-mono text-subtle uppercase tracking-widest">Agent Activity</span>
        {agentRunning && (
          <span className="flex items-center gap-1.5 text-xs text-amber font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />
            Running
          </span>
        )}
      </div>

      {/* Events */}
      <div className="overflow-y-auto max-h-96 divide-y divide-border/50">
        {events.length === 0 && (
          <div className="px-4 py-6 text-center text-subtle text-sm font-mono">
            No activity yet — run the agent loop to start
          </div>
        )}
        
        {events.map((e: AgentEvent) => (
          <div key={e.id}>
            {/* Regular event */}
            <div
              className={clsx(
                'px-4 py-2.5 flex gap-3 items-start animate-fade-in',
                'hover:bg-panel/60 transition-colors'
              )}
            >
              {/* Status icon */}
              <span
                className={clsx(
                  'font-mono text-sm w-4 flex-shrink-0 mt-0.5',
                  STATUS_COLORS[e.status] ?? 'text-subtle',
                  e.status === 'running' && 'animate-spin-slow'
                )}
              >
                {STATUS_ICONS[e.status] ?? '·'}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-amber-dim">
                    [{AGENT_LABELS[e.agent] ?? e.agent}]
                  </span>
                  <span className={clsx('text-sm', STATUS_COLORS[e.status] ?? 'text-text')}>
                    {e.message}
                  </span>
                </div>
                {e.detail && (
                  <p className="text-xs text-subtle mt-0.5 font-mono leading-relaxed line-clamp-3">
                    {e.detail}
                  </p>
                )}
              </div>

              <span className="text-xs text-muted font-mono flex-shrink-0 mt-0.5">
                {new Date(e.timestamp).toLocaleTimeString()}
              </span>
            </div>

            {/* Debate card for special debate events */}
            {e.type === 'debate' && (
              <div className="px-4 pb-3">
                <div className="text-xs text-amber-400">Debate data available</div>
              </div>
            )}

            {/* Research purchase card for A2A transactions */}
            {e.type === 'research_purchase' && (
              <div className="px-4 pb-3">
                <ResearchPurchaseCard
                  token="ETH"
                  amount={0.50}
                  txHash="A2A-research-purchase"
                />
              </div>
            )}

            {/* Transfer card for natural language transfers */}
            {e.type === 'transfer' && (
              <div className="px-4 pb-3">
                <TransferCard
                  amount={10}
                  token="USDC"
                  recipient="0x1234...abcd"
                  status="pending"
                  txHash="job-123"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}