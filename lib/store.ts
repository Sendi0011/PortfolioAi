/**
 * Lightweight in-process state store for the demo.
 * Shared across API routes via module-level singletons.
 * In production, replace with Redis or a database.
 */

export interface AgentEvent {
  id:        string
  agent:     'oracle' | 'strategy' | 'executor' | 'webhook'
  status:    'running' | 'success' | 'error' | 'skipped'
  message:   string
  detail?:   string
  timestamp: number
  type?:     'debate' | 'research_purchase'  // Special activity types
  debateData?: unknown // Store debate result for rendering
}

export interface TxRecord {
  jobId:       string
  txHash?:     string
  status:      'pending' | 'submitted' | 'confirmed' | 'failed'
  description: string
  timestamp:   number
  blockNumber?: number
}

export interface PortfolioSnapshot {
  prices:          Record<string, number>
  balances:        Record<string, number>   // token → amount
  allocations:     Record<string, number>   // token → pct
  totalValueUSDC:  number
  marketSummary:   string
  chartImageUrl?:  string
  updatedAt:       number
}

export interface DelegationState {
  rootDelegation?:     unknown
  oracleDelegation?:   unknown
  strategyDelegation?: unknown
  permissionId?:       string
  grantedAt?:          number
  expiresAt?:          number
  smartAccountAddress?: string
}

export interface ResearchReport {
  token:       string
  purchasedAt: number
  txHash?:     string
  report:      {
    marketSentiment:   string
    riskFactors:       string[]
    priceCatalysts:    string[]
    technicalAnalysis: string
    recommendation:    'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL'
    confidence:        number
    targetPrice?:      number
  }
}

// ─── Global singletons (survive hot-reload in dev via globalThis) ─────────────
declare global {
  // eslint-disable-next-line no-var
  var __portfolioStore: {
    events:       AgentEvent[]
    transactions: TxRecord[]
    portfolio:    PortfolioSnapshot | null
    delegation:   DelegationState
    agentRunning: boolean
    activeStrategy: 'conservative' | 'aggressive' | 'balanced'
    purchasedResearch: ResearchReport[]
  } | undefined
}

if (!globalThis.__portfolioStore) {
  globalThis.__portfolioStore = {
    events:       [],
    transactions: [],
    portfolio:    null,
    delegation:   {},
    agentRunning: false,
    activeStrategy: 'balanced', // Default to Nova - Balanced
    purchasedResearch: [],
  }
}

export const store = globalThis.__portfolioStore

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function addEvent(event: Omit<AgentEvent, 'id' | 'timestamp'>) {
  const e: AgentEvent = {
    ...event,
    id:        `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
  }
  store.events.unshift(e)
  // Keep last 200 events
  if (store.events.length > 200) store.events.length = 200
  return e
}

export function upsertTx(record: Omit<TxRecord, 'timestamp'> & { timestamp?: number }) {
  const existing = store.transactions.findIndex((t) => t.jobId === record.jobId)
  const tx: TxRecord = { timestamp: Date.now(), ...record }
  if (existing >= 0) {
    store.transactions[existing] = tx
  } else {
    store.transactions.unshift(tx)
    if (store.transactions.length > 100) store.transactions.length = 100
  }
  return tx
}

// ─── Serialisation helpers ────────────────────────────────────────────────────
export function serialiseDelegation(d: unknown): string {
  return JSON.stringify(d, (_, v) =>
    typeof v === 'bigint' ? v.toString() + 'n' : v
  )
}

export function deserialiseDelegation(s: string): unknown {
  return JSON.parse(s, (_, v) => {
    if (typeof v === 'string' && v.endsWith('n')) {
      try { return BigInt(v.slice(0, -1)) } catch { return v }
    }
    return v
  })
}