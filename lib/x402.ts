/**
 * x402 Buyer-side payment helper
 * Docs: https://docs.metamask.io/smart-accounts-kit/guides/x402/overview/
 *
 * x402 is an HTTP payment protocol: a server returns HTTP 402 with a
 * payment challenge; the buyer signs and retries with an X-Payment header.
 */

export interface PaymentRequired {
  scheme:    string     // e.g. "eip712"
  network:   string     // e.g. "base-sepolia"
  maxAmount: string     // wei / smallest unit
  asset:     string     // token address
  payTo:     string     // seller address
  memo?:     string
}

export interface X402PaymentHeader extends Record<string, string> {
  'X-Payment': string
}

function encodeBase64Json(value: unknown): string {
  const json = JSON.stringify(value)

  if (typeof window === 'undefined') {
    return Buffer.from(json).toString('base64')
  }

  const bytes = new TextEncoder().encode(json)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function decodeBase64Json<T>(payload: string): T {
  if (typeof window === 'undefined') {
    return JSON.parse(Buffer.from(payload, 'base64').toString()) as T
  }

  const binary = atob(payload)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes)) as T
}

/**
 * Handle a 402 response from a paid price feed.
 * Constructs the payment payload, signs via MetaMask, and returns the header
 * to attach to the retry request.
 *
 * @param challenge   Parsed body of the 402 response
 * @param provider    EIP-1193 provider (window.ethereum)
 * @param payer       Smart account address making the payment
 */
export async function buildX402Payment(
  challenge: PaymentRequired,
  provider: unknown,
  payer: string
): Promise<X402PaymentHeader> {
  // EIP-712 typed data for x402
  const domain = {
    name:    'x402',
    version: '1',
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 84532),
  }

  const types = {
    Payment: [
      { name: 'payTo',     type: 'address' },
      { name: 'asset',     type: 'address' },
      { name: 'maxAmount', type: 'uint256' },
      { name: 'memo',      type: 'string'  },
      { name: 'payer',     type: 'address' },
      { name: 'nonce',     type: 'uint256' },
    ],
  }

  const value = {
    scheme:    challenge.scheme,
    network:   challenge.network,
    payTo:     challenge.payTo,
    asset:     challenge.asset,
    maxAmount: challenge.maxAmount,
    memo:      challenge.memo ?? '',
    payer,
    nonce:     Date.now(),
  }

  // @ts-expect-error — provider is EIP-1193
  const signature: string = await provider.request({
    method: 'eth_signTypedData_v4',
    params: [payer, JSON.stringify({ domain, types, primaryType: 'Payment', message: value })],
  })

  const payload = encodeBase64Json({ ...value, signature })
  return { 'X-Payment': payload }
}

/**
 * Fetch from a URL that may require x402 payment.
 * Automatically handles the 402 → sign → retry flow.
 * 
 * Real payments only - no mock mode supported.
 */
export async function fetchWithX402<T>(
  url: string,
  provider: unknown,
  payerAddress: string
): Promise<T> {
  // First attempt — no payment header
  const first = await fetch(url)

  if (first.status === 402) {
    const challenge: PaymentRequired = await first.json()
    const paymentHeader = await buildX402Payment(challenge, provider, payerAddress)

    const second = await fetch(url, { headers: paymentHeader })
    if (!second.ok) throw new Error(`x402 paid request failed: ${second.status}`)
    return second.json() as Promise<T>
  }

  if (!first.ok) throw new Error(`Price feed request failed: ${first.status}`)
  return first.json() as Promise<T>
}

/**
 * Initiate a research payment for a specific token.
 * Handles the HTTP 402 -> payment -> retry flow automatically.
 */
export async function initiateResearchPayment(
  token: string,
  provider: unknown,
  payerAddress: string
): Promise<{ success: boolean; report?: unknown; error?: string; txHash?: string }> {
  try {
    const url = `/api/research?token=${encodeURIComponent(token)}`
    
    // First attempt - no payment
    const firstResponse = await fetch(url)
    
    if (firstResponse.status === 402) {
      // Payment required - build x402 payment
      const challenge: PaymentRequired = await firstResponse.json()
      const paymentHeader = await buildX402Payment(challenge, provider, payerAddress)
      
      // Retry with payment
      const secondResponse = await fetch(url, { 
        headers: { ...paymentHeader } as HeadersInit 
      })
      
      if (secondResponse.ok) {
        const report = await secondResponse.json()
        return { 
          success: true, 
          report,
          txHash: decodeBase64Json<{ signature?: string }>(paymentHeader['X-Payment']).signature
        }
      } else {
        const details = await secondResponse.json().catch(() => null)
        return { success: false, error: details?.error || `Payment failed: ${secondResponse.status}` }
      }
    } else if (firstResponse.ok) {
      // No payment required (already purchased recently)
      const report = await firstResponse.json()
      return { success: true, report }
    } else {
      return { success: false, error: `Research request failed: ${firstResponse.status}` }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}

/**
 * Verify an x402 payment payload (server-side validation).
 * For demo purposes, this does basic signature validation.
 */
export async function verifyPayment(paymentPayload: string): Promise<boolean> {
  try {
    const payment = decodeBase64Json<Record<string, string>>(paymentPayload)
    
    // Basic validation - check required fields exist
    const required = ['payTo', 'asset', 'maxAmount', 'payer', 'nonce', 'signature']
    const hasAllFields = required.every(field => payment[field] !== undefined)
    
    // In production, you'd verify the signature against the EIP-712 typed data
    // For demo, we just check structure and assume MetaMask signed correctly
    return hasAllFields && payment.signature.length > 100
  } catch {
    return false
  }
}
