/**
 * 1Shot Permissionless Relayer — JSON-RPC client
 * Docs: https://1shotapi.com/docs/quickstarts/gas-sponsorship-eip7710
 *
 * No API key required. Gas paid in USDC on Base.
 */

const RELAYER_BASE = process.env.NEXT_PUBLIC_ONESHOT_RELAYER_URL ?? 'https://relayer.1shotapi.com/relayers'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface RelayerCapabilities {
  id: string
  supportedPaymentTokens: string[]
  supportedChains: string[]
  maxGasLimit: string
}

export interface RelayRequestParams {
  /** ERC-7710 redemption calldata */
  calls: Array<{ to: string; data: string; value: string }>
  /** The delegation object being redeemed */
  delegation: unknown
  /** USDC token address for gas payment */
  gasToken: string
  /** Webhook URL for status callbacks */
  webhookUrl?: string
  /** Arbitrary metadata echoed back in webhook */
  webhookMetadata?: Record<string, string>
}

export interface RelayResponse {
  jobId: string
  status: 'pending' | 'submitted' | 'confirmed' | 'failed'
  txHash?: string
}

// ─── JSON-RPC helper ──────────────────────────────────────────────────────────
async function rpc<T>(relayerId: string, method: string, params: unknown): Promise<T> {
  const url = `${RELAYER_BASE}/${relayerId}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`1Shot RPC error ${res.status}: ${text}`)
  }
  const json = await res.json()
  if (json.error) throw new Error(`1Shot RPC method error: ${JSON.stringify(json.error)}`)
  return json.result as T
}

// ─── Discover available relayers ─────────────────────────────────────────────
export async function getRelayerCapabilities(): Promise<RelayerCapabilities[]> {
  const res = await fetch(RELAYER_BASE, {
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`Failed to list relayers: ${res.status}`)
  return res.json()
}

/**
 * Pick the first relayer that supports the given chainId and USDC token.
 */
export async function pickRelayer(chainId: number, usdcAddress: string): Promise<string> {
  const relayers = await getRelayerCapabilities()
  const match = relayers.find(
    (r) =>
      r.supportedChains.includes(String(chainId)) &&
      r.supportedPaymentTokens.some((t) => t.toLowerCase() === usdcAddress.toLowerCase())
  )
  if (!match) throw new Error(`No 1Shot relayer found for chain ${chainId} with USDC ${usdcAddress}`)
  return match.id
}

// ─── EIP-7702: Upgrade EOA to smart account ───────────────────────────────────
export interface UpgradeParams {
  /** User's EOA address */
  address: string
  /** EIP-7702 signed authorization tuple from MetaMask */
  authorization: {
    chainId: number
    address: string   // implementation address
    nonce: number
    yParity: number
    r: string
    s: string
  }
  relayerId: string
  gasToken: string
  webhookUrl?: string
}

export async function upgradeToSmartAccount(params: UpgradeParams): Promise<RelayResponse> {
  return rpc<RelayResponse>(params.relayerId, 'relayer_upgradeAccount', {
    address: params.address,
    authorization: params.authorization,
    gasToken: params.gasToken,
    webhookUrl: params.webhookUrl,
  })
}

// ─── Submit ERC-7710 redemption transaction ───────────────────────────────────
export async function relayDelegationRedemption(
  relayerId: string,
  params: RelayRequestParams
): Promise<RelayResponse> {
  return rpc<RelayResponse>(relayerId, 'relayer_sendTransaction', {
    calls: params.calls,
    delegation: params.delegation,
    gasToken: params.gasToken,
    webhookUrl: params.webhookUrl,
    webhookMetadata: params.webhookMetadata ?? {},
  })
}

// ─── Poll job status ──────────────────────────────────────────────────────────
export async function getJobStatus(relayerId: string, jobId: string): Promise<RelayResponse> {
  return rpc<RelayResponse>(relayerId, 'relayer_getJobStatus', { jobId })
}

// ─── Webhook payload shape ────────────────────────────────────────────────────
export interface OneShotWebhookPayload {
  jobId: string
  status: 'pending' | 'submitted' | 'confirmed' | 'failed'
  txHash?: string
  blockNumber?: number
  error?: string
  metadata?: Record<string, string>
  timestamp: number
}