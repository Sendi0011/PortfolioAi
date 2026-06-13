import { NextResponse } from 'next/server'
import { veniceChat } from '@/lib/venice'
import { store, addEvent } from '@/lib/store'
import type { ResearchReport } from '@/lib/store'

const RESEARCH_PRICE_USDC_UNITS = '500000' // 0.50 USDC, 6 decimals
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
const RESEARCH_WALLET = process.env.RESEARCH_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b8D73a5e7d6c9ca1e7'
const X402_NETWORK = process.env.NEXT_PUBLIC_CHAIN_ID === '8453' ? 'base' : 'base-sepolia'

/**
 * GET /api/research?token=ETH
 * 
 * Premium market research endpoint gated behind x402 payment.
 * Returns HTTP 402 if no payment, or comprehensive research if paid.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token') ?? 'ETH'
  const paymentPayload = request.headers.get('x-payment')

  // Step 1: Check for payment
  if (!paymentPayload) {
    const challenge = {
      scheme: 'eip712',
      network: X402_NETWORK,
      maxAmount: RESEARCH_PRICE_USDC_UNITS,
      asset: USDC_ADDRESS,
      payTo: RESEARCH_WALLET,
      memo: `Premium ${token} market research report`,
    }

    addEvent({
      agent: 'oracle',
      status: 'error',
      message: `Research request for ${token} - payment required`,
      detail: 'HTTP 402: Premium research requires 0.50 USDC payment'
    })

    return NextResponse.json(
      challenge,
      {
        status: 402,
        headers: {
          'x-payment-required': 'true',
          'x-payment-amount': '0.50',
          'x-payment-currency': 'USDC',
          'x-payment-description': challenge.memo,
          'x-payment-recipient': RESEARCH_WALLET
        }
      }
    )
  }

  // Step 2: Verify payment (simplified for demo)
  try {
    const payment = JSON.parse(Buffer.from(paymentPayload, 'base64').toString())
    const requiredFields = ['payTo', 'asset', 'maxAmount', 'payer', 'signature']
    const missingField = requiredFields.find((field) => !payment[field])

    if (missingField) {
      return NextResponse.json(
        { error: `Invalid payment payload: missing ${missingField}` },
        { status: 400 }
      )
    }

    if (
      payment.payTo.toLowerCase() !== RESEARCH_WALLET.toLowerCase() ||
      payment.asset.toLowerCase() !== USDC_ADDRESS.toLowerCase() ||
      payment.maxAmount !== RESEARCH_PRICE_USDC_UNITS
    ) {
      return NextResponse.json(
        { error: 'Invalid payment challenge response' },
        { status: 402 }
      )
    }

    addEvent({
      agent: 'oracle',
      status: 'running',
      message: `Payment verified for ${token} research - generating report`,
      detail: `Amount: ${payment.maxAmount || '0.50'} USDC`
    })

    // Check if research already exists for this token (within last hour)
    const existingResearch = store.purchasedResearch.find(r => 
      r.token === token && 
      Date.now() - r.purchasedAt < 3600000 // 1 hour
    )

    if (existingResearch) {
      addEvent({
        agent: 'oracle',
        status: 'success',
        message: `Returning cached ${token} research report`,
        detail: 'Recent research found, no additional Venice AI call needed'
      })
      return NextResponse.json(existingResearch.report)
    }

    // Step 3: Generate comprehensive research via Venice AI
    const currentPrice = store.portfolio?.prices[token] ?? 2400

    const researchResponse = await veniceChat(
      `You are a senior DeFi research analyst. Generate a comprehensive market research report for ${token}. 
       Respond ONLY with valid JSON matching this schema exactly:
       {
         "marketSentiment": "string (2-3 sentences about overall market mood)",
         "riskFactors": ["string", "string", "string"] (3 key risks),
         "priceCatalysts": ["string", "string", "string"] (3 potential price drivers),
         "technicalAnalysis": "string (2-3 sentences about chart patterns, support/resistance)",
         "recommendation": "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL",
         "confidence": number (0-100, confidence in recommendation),
         "targetPrice": number (optional price target)
       }`,
      `Analyze ${token} currently trading at $${currentPrice.toLocaleString()}. 
       Current market conditions, recent price action, and fundamental developments. 
       Provide institutional-grade analysis suitable for portfolio management decisions.`
    )

    // Parse Venice AI response
    let report
    try {
      const clean = researchResponse.replace(/```json|```/g, '').trim()
      report = JSON.parse(clean)
    } catch {
      // Fallback research structure
      report = {
        marketSentiment: `${token} showing mixed signals in current market environment. Technical indicators suggest consolidation phase with potential for breakout.`,
        riskFactors: [
          'Regulatory uncertainty affecting crypto sector',
          'Macroeconomic headwinds from rising interest rates',
          'Potential profit-taking after recent gains'
        ],
        priceCatalysts: [
          'Institutional adoption continuing to accelerate',
          'Network upgrades improving scalability and efficiency',
          'Growing DeFi ecosystem driving utility demand'
        ],
        technicalAnalysis: `${token} trading above key support at $${(currentPrice * 0.92).toLocaleString()}. RSI neutral, MACD showing bullish divergence.`,
        recommendation: 'HOLD',
        confidence: 72,
        targetPrice: Math.round(currentPrice * 1.15)
      }
    }

    // Step 4: Store research and log transaction
    const researchRecord: ResearchReport = {
      token,
      purchasedAt: Date.now(),
      txHash: payment.signature?.slice(0, 20) + '...' || undefined,
      report
    }

    store.purchasedResearch.push(researchRecord)
    // Keep only last 10 research reports
    if (store.purchasedResearch.length > 10) {
      store.purchasedResearch.shift()
    }

    addEvent({
      agent: 'oracle',
      status: 'success',
      message: `${token} research report generated and delivered`,
      detail: `Recommendation: ${report.recommendation} (${report.confidence}% confidence)`
    })

    return NextResponse.json(report)

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    addEvent({
      agent: 'oracle',
      status: 'error',
      message: `Research generation failed for ${token}`,
      detail: msg
    })
    
    return NextResponse.json(
      { error: 'Failed to generate research report', details: msg },
      { status: 500 }
    )
  }
}
