import { NextResponse } from 'next/server'
import { addEvent, upsertTx } from '@/lib/store'
import type { OneShotWebhookPayload } from '@/lib/oneshot'
import crypto from 'crypto'

/**
 * POST /api/webhook/1shot
 *
 * Receives real-time transaction status updates from the 1Shot relayer.
 * Verifies the HMAC signature, updates the store, and emits an agent event.
 */
export async function POST(request: Request) {
  const rawBody = await request.text()

  // ── Verify HMAC-SHA256 signature ─────────────────────────────────────────
  const secret = process.env.WEBHOOK_SECRET
  if (secret) {
    const sig = request.headers.get('x-1shot-signature') ?? ''
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')

    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let payload: OneShotWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { jobId, status, txHash, blockNumber, error: txError, metadata } = payload

  // ── Update transaction record ─────────────────────────────────────────────
  upsertTx({
    jobId,
    status,
    txHash,
    blockNumber,
    description: metadata?.action
      ? `Swap ${metadata.amountUSDC ?? ''} USDC: ${metadata.action}`
      : `Job ${jobId}`,
  })

  // ── Emit agent event ──────────────────────────────────────────────────────
  const statusMessages: Record<string, string> = {
    pending:   `Tx queued by relayer`,
    submitted: `Tx broadcast to chain: ${txHash?.slice(0, 10)}…`,
    confirmed: `Tx confirmed in block ${blockNumber ?? ''}`,
    failed:    `Tx failed: ${txError ?? 'unknown error'}`,
  }

  addEvent({
    agent:   'webhook',
    status:  status === 'confirmed' ? 'success' : status === 'failed' ? 'error' : 'running',
    message: statusMessages[status] ?? `Status: ${status}`,
    detail:  txHash,
  })

  console.log(`[1Shot webhook] jobId=${jobId} status=${status} txHash=${txHash ?? '-'}`)

  return NextResponse.json({ received: true })
}
