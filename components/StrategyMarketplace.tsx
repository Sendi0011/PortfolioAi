'use client'
import { useState, useEffect } from 'react'
import { clsx } from 'clsx'

type StrategyType = 'conservative' | 'aggressive' | 'balanced'

interface AgentProfile {
  id: StrategyType
  name: string
  personality: string
  riskLevel: 'Low' | 'Medium' | 'High'
  riskColor: string
  badge: string
  description: string
  marketInsight?: string
}

const AGENTS: AgentProfile[] = [
  {
    id: 'conservative',
    name: 'Alma',
    personality: 'Conservative',
    riskLevel: 'Low',
    riskColor: 'text-green',
    badge: '🛡️',
    description: 'Capital preservation strategy. 15% drift threshold.',
  },
  {
    id: 'aggressive', 
    name: 'Rex',
    personality: 'Aggressive',
    riskLevel: 'High',
    riskColor: 'text-red',
    badge: '⚡',
    description: 'High-risk momentum trading. 5% drift threshold.',
  },
  {
    id: 'balanced',
    name: 'Nova',
    personality: 'Balanced',
    riskLevel: 'Medium', 
    riskColor: 'text-amber',
    badge: '⚖️',
    description: 'Balanced growth approach. Moderate risk tolerance.',
  },
]

interface Props {
  activeStrategy: StrategyType
  onStrategyChange: (strategy: StrategyType) => void
}

export function StrategyMarketplace({ activeStrategy, onStrategyChange }: Props) {
  const [agents, setAgents] = useState(AGENTS)
  const [loading, setLoading] = useState(false)

  // Fetch market insights for each agent on component mount
  useEffect(() => {
    async function fetchMarketInsights() {
      setLoading(true)
      try {
        const res = await fetch('/api/agent/oracle')
        if (res.ok) {
          const data = await res.json()
          
          // Generate strategy-specific market insights
          const updatedAgents = AGENTS.map(agent => {
            let insight = ''
            const ethPrice = data.prices?.ETH || 2400
            
            switch (agent.id) {
              case 'conservative':
                insight = `ETH ${ethPrice.toLocaleString()} - stability maintained`
                break
              case 'aggressive':
                insight = `ETH momentum at ${ethPrice.toLocaleString()}`
                break
              case 'balanced':
                insight = `ETH ${ethPrice.toLocaleString()}, balanced approach`
                break
            }
            
            return { ...agent, marketInsight: insight }
          })
          
          setAgents(updatedAgents)
        }
      } catch (error) {
        console.warn('Failed to fetch market insights:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMarketInsights()
  }, [])

  async function handleStrategySelect(strategyId: StrategyType) {
    if (strategyId === activeStrategy) return
    
    setLoading(true)
    try {
      // Update the active strategy in the store
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeStrategy: strategyId }),
      })
      
      onStrategyChange(strategyId)
    } catch (error) {
      console.error('Failed to update strategy:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono text-text uppercase tracking-wider">
          Strategy Agent
        </h3>
        {loading && (
          <span className="text-xs font-mono text-subtle animate-pulse">
            •••
          </span>
        )}
      </div>

      <div className="space-y-2">
        {agents.map((agent) => {
          const isActive = agent.id === activeStrategy
          
          return (
            <div
              key={agent.id}
              className={clsx(
                'p-3 rounded-lg border transition-all duration-200 cursor-pointer',
                isActive 
                  ? 'border-amber bg-amber/5' 
                  : 'border-border/50 bg-surface/60 hover:border-border/80 hover:bg-surface/80'
              )}
              onClick={() => handleStrategySelect(agent.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{agent.badge}</span>
                  <div>
                    <h4 className="font-display font-medium text-text text-xs">
                      {agent.name}
                    </h4>
                    <span className={clsx('text-xs font-mono', agent.riskColor)}>
                      {agent.riskLevel}
                    </span>
                  </div>
                </div>
                
                {isActive ? (
                  <span className="text-xs font-mono text-amber bg-amber/20 px-1.5 py-0.5 rounded">
                    ACTIVE
                  </span>
                ) : (
                  <button
                    className="text-xs font-mono text-subtle hover:text-text transition-colors"
                    disabled={loading}
                  >
                    Select
                  </button>
                )}
              </div>

              {agent.marketInsight && (
                <div className="text-xs font-mono text-subtle bg-border/20 p-2 rounded border border-border/30">
                  {agent.marketInsight}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}