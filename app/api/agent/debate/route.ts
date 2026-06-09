import { NextResponse } from 'next/server'
import { veniceChat } from '@/lib/venice'
import { addEvent } from '@/lib/store'

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

/**
 * POST /api/agent/debate
 * 
 * Body: { token: string, currentPrice: number, portfolioAllocation: number }
 * 
 * Triggers a live Bull vs Bear debate when the strategy agent is uncertain.
 * - Spawns TWO simultaneous Venice AI calls (Bull and Bear)
 * - Then makes a third call as Judge to decide the verdict
 * - Returns the complete debate result for UI rendering
 * 
 * Fallback to mock data when Venice AI credits are insufficient.
 */
export async function POST(request: Request) {
  addEvent({ agent: 'strategy', status: 'running', message: 'Initiating Bull vs Bear debate…' })

  try {
    const { token, currentPrice, portfolioAllocation } = await request.json()

    // ── Simultaneous Bull and Bear arguments ──────────────────────────────────
    const [bullResponse, bearResponse] = await Promise.all([
      // Bull Agent
      veniceChat(
        `You are a crypto bull analyst. Make the strongest possible case for buying/holding ${token} right now. Be concise, use 3 sharp arguments. Max 120 words. Be aggressive and confident.`,
        `${token} is currently at $${currentPrice.toLocaleString()}. Portfolio allocation: ${portfolioAllocation.toFixed(1)}%. Make your bull case now.`
      ),
      
      // Bear Agent  
      veniceChat(
        `You are a crypto bear analyst. Make the strongest possible case for selling/reducing ${token} right now. Be concise, use 3 sharp arguments. Max 120 words. Be aggressive and confident.`,
        `${token} is currently at $${currentPrice.toLocaleString()}. Portfolio allocation: ${portfolioAllocation.toFixed(1)}%. Make your bear case now.`
      )
    ])

    addEvent({ 
      agent: 'strategy', 
      status: 'running', 
      message: 'Bull and Bear arguments complete — calling Judge…' 
    })

    // ── Judge Decision ─────────────────────────────────────────────────────────
    const judgeResponse = await veniceChat(
      `You are an impartial DeFi judge. Given these Bull and Bear arguments, decide: BUY, SELL, or HOLD. Score each side 0-100. Explain your verdict in one sentence. 
       Respond ONLY with valid JSON:
       {
         "verdict": "BUY" | "SELL" | "HOLD",
         "bullScore": number,
         "bearScore": number, 
         "reasoning": "string (max 100 words)"
       }`,
      `Token: ${token} at $${currentPrice.toLocaleString()}
       
       BULL ARGUMENTS:
       ${bullResponse}
       
       BEAR ARGUMENTS:  
       ${bearResponse}
       
       Your verdict:`
    )

    // Parse judge response
    let judgeResult
    try {
      const clean = judgeResponse.replace(/```json|```/g, '').trim()
      judgeResult = JSON.parse(clean)
    } catch {
      // Fallback if JSON parsing fails
      judgeResult = {
        verdict: 'HOLD',
        bullScore: 50,
        bearScore: 50,
        reasoning: 'Unable to parse judge response — defaulting to HOLD for safety.'
      }
    }

    const debateResult: DebateResult = {
      bull: {
        arguments: bullResponse,
        confidence: judgeResult.bullScore
      },
      bear: {
        arguments: bearResponse,
        confidence: judgeResult.bearScore
      },
      judge: judgeResult
    }

    addEvent({
      agent: 'strategy',
      status: 'success', 
      message: `Debate complete — Judge verdict: ${judgeResult.verdict}`,
      detail: `Bull ${judgeResult.bullScore} vs Bear ${judgeResult.bearScore}. ${judgeResult.reasoning}`,
      audioText: `Judge verdict reached: ${judgeResult.verdict}. ${judgeResult.reasoning}` // Audio narration
    })

    return NextResponse.json(debateResult)

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    addEvent({ 
      agent: 'strategy', 
      status: 'error', 
      message: 'Debate failed', 
      detail: msg 
    })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}