import { clsx } from 'clsx'

type TxStatus = 'pending' | 'submitted' | 'confirmed' | 'failed'

const STATUS_CONFIG: Record<TxStatus, { label: string; dot: string; text: string; ring: string }> = {
  pending:   { label: 'Pending',   dot: 'bg-amber animate-pulse', text: 'text-amber',   ring: 'ring-amber/30' },
  submitted: { label: 'Broadcast', dot: 'bg-blue animate-pulse',  text: 'text-blue',    ring: 'ring-blue/30' },
  confirmed: { label: 'Confirmed', dot: 'bg-green',               text: 'text-green',   ring: 'ring-green/30' },
  failed:    { label: 'Failed',    dot: 'bg-red',                 text: 'text-red',     ring: 'ring-red/30' },
}

interface Props {
  status: TxStatus
  txHash?: string
  className?: string
}

export function TxStatusBadge({ status, txHash, className }: Props) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono ring-1',
        cfg.text,
        cfg.ring,
        'bg-surface',
        className
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
      {cfg.label}
      {txHash && (
        <a
          href={`https://sepolia.basescan.org/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-60 hover:opacity-100 underline"
        >
          {txHash.slice(0, 8)}…
        </a>
      )}
    </span>
  )
}