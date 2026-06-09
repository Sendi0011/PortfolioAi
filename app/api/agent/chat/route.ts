import { NextResponse } from 'next/server'
import { veniceChat } from '@/lib/venice'

interface TransferIntent {
  action: 'transfer'
  amount: number
  token: string
  recipient: string
  valid: boolean
}

/**
 * POST /api/agent/chat
 * 
 * Parse natural language transfer instructions using Venice AI.
 * Extracts recipient address, amount, and token from user message.
 */
export async function POST(request: Request) {
  try {
    const { message, smartAccountAddress } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Venice AI system prompt for transfer intent parsing
    const systemPrompt = `You are a crypto transfer intent parser. Extract transfer information from user messages.

RULES:
1. Only parse transfer/send instructions 
2. Return valid JSON only, no other text
3. Support common address formats: 0x addresses, ENS names (.eth), short names
4. Default token is USDC if not specified
5. Amount must be a positive number

Return JSON schema:
{
  "action": "transfer",
  "amount": number,
  "token": string (uppercase),
  "recipient": string,
  "valid": boolean
}

If message is not a transfer instruction, return: {"valid": false}

Examples:
- "Send 20 USDC to 0x1234" → {"action": "transfer", "amount": 20, "token": "USDC", "recipient": "0x1234", "valid": true}
- "Transfer 50 to alice.eth" → {"action": "transfer", "amount": 50, "token": "USDC", "recipient": "alice.eth", "valid": true}  
- "Hello" → {"valid": false}`

    const response = await veniceChat(
      systemPrompt,
      `Parse this message: "${message}"`
    )

    // Parse Venice AI response
    let intent: TransferIntent
    try {
      const cleaned = response.replace(/```json|```/g, '').trim()
      intent = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ valid: false })
    }

    if (!intent.valid) {
      return NextResponse.json({ valid: false })
    }

    // Additional validation
    if (!intent.amount || intent.amount <= 0) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Amount must be a positive number' 
      })
    }

    if (!intent.recipient || intent.recipient.length < 3) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid recipient address' 
      })
    }

    // Validate Ethereum address format (basic check)
    const isValidAddress = (addr: string) => {
      return addr.match(/^0x[a-fA-F0-9]{40}$/) || addr.endsWith('.eth') || addr.length >= 3
    }

    if (!isValidAddress(intent.recipient)) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid Ethereum address format' 
      })
    }

    // For hackathon scope - only USDC
    if (intent.token.toUpperCase() !== 'USDC') {
      return NextResponse.json({ 
        valid: false, 
        error: 'Only USDC transfers supported in demo' 
      })
    }

    return NextResponse.json({
      valid: true,
      action: intent.action,
      amount: intent.amount,
      token: intent.token.toUpperCase(),
      recipient: intent.recipient
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Chat API Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}