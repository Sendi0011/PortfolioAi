'use client'
import { clsx } from 'clsx'

interface Props {
  amount: number
  token: string
  recipient: string
  status: 'pending' | 'confirmed' | 'failed'
  txHash?: string
}

export function TransferCard({ amount, token, recipient, status, txHash }: Props) {
  const statusConfig = {
    pending: { 
      color: 'text-amber bg-amber/10 border-amber/30',
      icon: '⟳',
      label: 'Pending'
    },
    confirmed: {
      color: 'text-green bg-green/10 border-green/30', 
      icon: '✓',
      label: 'Confirmed'
    },
    failed: {
      color: 'text-red bg-red/10 border-red/30',
      icon: '✗', 
      label: 'Failed'
    }
  }

  const config = statusConfig[status]

  return (
    <div className="bg-panel rounded-lg border border-border/60 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">💸</span>
          <span className="text-sm font-display font-semibold text-text">
            Natural Language Transfer
          </span>
        </div>
        <div className={clsx(
          'flex items-center gap-1 px-2 py-1 rounded border text-xs font-mono',
          config.color
        )}>
          <span>{config.icon}</span>
          {config.label}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-subtle">Amount:</span>
          <span className="text-sm font-mono text-text">
            {amount} {token}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-xs text-subtle">To:</span>
          <span className="text-xs font-mono text-text">
            {recipient.length > 20 ? 
              `${recipient.slice(0, 6)}...${recipient.slice(-4)}` : 
              recipient
            }
          </span>
        </div>

        {txHash && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-subtle">Job ID:</span>
            <span className="text-xs font-mono text-green">
              {txHash.slice(0, 8)}...{txHash.slice(-6)}
            </span>
          </div>
        )}
      </div>

      <div className="pt-1 border-t border-border/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-subtle">Via Agent Chat</span>
          <span className="text-muted">1Shot Relayer</span>
        </div>
      </div>
    </div>
  )
}