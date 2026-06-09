import OpenAI from 'openai'

const venice = new OpenAI({
  apiKey: process.env.VENICE_API_KEY!,
  baseURL: process.env.NEXT_PUBLIC_VENICE_BASE_URL ?? 'https://api.venice.ai/api/v1',
})

const TEXT_MODEL = process.env.VENICE_TEXT_MODEL ?? 'zai-org-glm-5.1'
const IMAGE_MODEL = process.env.VENICE_IMAGE_MODEL ?? 'nano-banana-pro'
const AUDIO_MODEL = process.env.VENICE_AUDIO_MODEL ?? 'tts-kokoro'

// ─── Text completion ──────────────────────────────────────────────────────────
export async function veniceChat(
  systemPrompt: string,
  userMessage: string,
  opts?: { maxTokens?: number; temperature?: number; webSearch?: boolean }
): Promise<string> {
  try {
    console.log('🔍 Venice Chat: Starting request')
    console.log('Model:', TEXT_MODEL)
    console.log('System prompt length:', systemPrompt.length)
    console.log('User message length:', userMessage.length)

    const tools: OpenAI.Chat.ChatCompletionTool[] = opts?.webSearch
      ? [
          {
            type: 'function',
            function: {
              name: 'web_search',
              description: 'Search the web for current crypto news and prices',
              parameters: {
                type: 'object',
                properties: { query: { type: 'string' } },
                required: ['query'],
              },
            },
          },
        ]
      : []

    const response = await venice.chat.completions.create({
      model: TEXT_MODEL,
      max_tokens: opts?.maxTokens ?? 512,
      temperature: opts?.temperature ?? 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      ...(tools.length > 0 ? { tools, tool_choice: 'auto' } : {}),
    })

    console.log('✅ Venice Chat: Response received')
    const msg = response.choices[0]?.message
    // If the model called web_search, return its tool call args for the caller to handle
    if (msg?.tool_calls?.length) {
      const call = msg.tool_calls[0]
      return `[web_search:${call.function.arguments}]`
    }
    return msg?.content ?? ''
  } catch (error) {
    console.error('❌ Venice Chat Error:', error)
    throw error
  }
}

// ─── Image generation (portfolio pie chart) ───────────────────────────────────
export async function veniceGenerateChart(
  allocations: Record<string, number>
): Promise<string> {
  // Build a detailed prompt describing the pie chart
  const slices = Object.entries(allocations)
    .map(([token, pct]) => `${token} ${pct.toFixed(1)}%`)
    .join(', ')

  const prompt =
    `A clean, glowing crypto portfolio pie chart on a dark background. ` +
    `Slices: ${slices}. ` +
    `Use neon amber for ETH, electric blue for USDC, green for other tokens. ` +
    `Modern minimal data-visualization style, no text labels, pure geometry, subtle glow effects.`

  const response = await venice.images.generate({
    model: IMAGE_MODEL,
    prompt,
    n: 1,
    size: '512x512',
  })

  // Venice returns b64_json or url
  const img = response.data?.[0]
  if (!img) throw new Error('Venice image generation returned no data')
  if (img.url) return img.url
  if (img.b64_json) return `data:image/png;base64,${img.b64_json}`
  throw new Error('Venice image generation returned invalid format')
}

// ─── Audio generation (agent voice narration) ─────────────────────────────────
export async function veniceGenerateAudio(
  text: string,
  voice?: string
): Promise<string> {
  try {
    console.log('🔊 Venice Audio: Starting TTS request')
    console.log('Text length:', text.length)
    console.log('Voice:', voice || 'default')

    const response = await venice.audio.speech.create({
      model: AUDIO_MODEL,
      input: text,
      voice: voice || 'af_sky', // Professional female voice from Kokoro
      response_format: 'mp3',
      speed: 1.0,
    })

    // Convert response to base64 data URL for immediate playback
    const audioBuffer = await response.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')
    const dataUrl = `data:audio/mp3;base64,${base64Audio}`
    
    console.log('✅ Venice Audio: Response received')
    return dataUrl
  } catch (error) {
    console.error('❌ Venice Audio Error:', error)
    // Return empty data URL if audio generation fails (non-blocking)
    return ''
  }
}

// ─── Summarise market conditions (OracleAgent helper) ─────────────────────────
export async function summariseMarket(
  prices: Record<string, number>,
  portfolio: Record<string, number>
): Promise<string> {
  const priceText = Object.entries(prices)
    .map(([t, p]) => `${t}: ${p.toLocaleString()}`)
    .join(', ')

  const portfolioText = Object.entries(portfolio)
    .map(([t, v]) => `${t}: ${v.toFixed(2)}`)
    .join(', ')

  return veniceChat(
    `You are a concise DeFi market analyst. Summarise conditions in 2-3 sentences. 
     Be factual, no hype. Focus on volatility signals and rebalancing relevance.`,
    `Current prices: ${priceText}. Portfolio holdings: ${portfolioText}.`
  )
}

// ─── Reasoning about rebalance (StrategyAgent helper) ─────────────────────────
export interface RebalanceDecision {
  shouldRebalance: boolean
  reasoning: string
  actions: Array<{ from: string; to: string; amountUSDC: number }>
  riskSummary: string
  confidence?: number // Added for debate triggering
}

export async function reasonRebalance(
  prices: Record<string, number>,
  currentAllocations: Record<string, number>,   // pct
  targetAllocations: Record<string, number>,    // pct
  totalValueUSDC: number,
  thresholdPct: number,
  maxSpendUSDC: number,
  strategy: 'conservative' | 'aggressive' | 'balanced' = 'balanced'
): Promise<RebalanceDecision> {
  const drifts = Object.entries(targetAllocations).map(([token, target]) => {
    const current = currentAllocations[token] ?? 0
    return `${token}: current=${current.toFixed(1)}% target=${target}% drift=${(current - target).toFixed(1)}%`
  })

  // Strategy-specific system prompts
  const strategyPrompts = {
    conservative: `You are Alma, a risk-averse DeFi portfolio manager. Only recommend rebalancing when portfolio drift exceeds 15%. Always prefer capital preservation over gains. 
     Respond ONLY with valid JSON matching this schema exactly:
     {
       "shouldRebalance": boolean,
       "reasoning": "string (max 120 words)",
       "actions": [{ "from": "TOKEN", "to": "TOKEN", "amountUSDC": number }],
       "riskSummary": "string (max 60 words)",
       "confidence": number (0-100, how confident you are in this decision)
     }
     Rules:
     - Conservative threshold: Only rebalance if drift exceeds 15% for any asset.
     - Total swap value must not exceed ${maxSpendUSDC} USDC.
     - actions array may be empty if no rebalance needed.
     - Prioritize stability and capital preservation.`,
    
    aggressive: `You are Rex, an aggressive DeFi trader. Recommend rebalancing on any drift above 5%. Chase momentum. Accept high risk for high reward.
     Respond ONLY with valid JSON matching this schema exactly:
     {
       "shouldRebalance": boolean,
       "reasoning": "string (max 120 words)",
       "actions": [{ "from": "TOKEN", "to": "TOKEN", "amountUSDC": number }],
       "riskSummary": "string (max 60 words)",
       "confidence": number (0-100, how confident you are in this decision)
     }
     Rules:
     - Aggressive threshold: Rebalance on any drift above 5%.
     - Total swap value must not exceed ${maxSpendUSDC} USDC.
     - actions array may be empty if no rebalance needed.
     - Chase momentum and accept higher risk for potential gains.`,
    
    balanced: `You are Nova, a balanced DeFi portfolio manager. 
     Respond ONLY with valid JSON matching this schema exactly:
     {
       "shouldRebalance": boolean,
       "reasoning": "string (max 120 words)",
       "actions": [{ "from": "TOKEN", "to": "TOKEN", "amountUSDC": number }],
       "riskSummary": "string (max 60 words)",
       "confidence": number (0-100, how confident you are in this decision)
     }
     Rules:
     - Recommend rebalance only if drift exceeds ${thresholdPct}% for any asset.
     - Total swap value must not exceed ${maxSpendUSDC} USDC.
     - actions array may be empty if no rebalance needed.`
  }

  const systemPrompt = strategyPrompts[strategy]

  const raw = await veniceChat(
    systemPrompt,
    `Portfolio total: ${totalValueUSDC.toFixed(2)} USDC.
     Allocations:\n${drifts.join('\n')}
     Prices: ${Object.entries(prices).map(([t, p]) => `${t}=${p}`).join(', ')}`
  )

  try {
    // Strip possible markdown fences
    const clean = raw.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean) as RebalanceDecision
    console.log('🧠 Venice AI Decision:', result)
    console.log('📊 Confidence Score:', result.confidence)
    return result
  } catch {
    // Fallback safe decision
    return {
      shouldRebalance: false,
      reasoning: 'Venice AI returned unparseable response — skipping rebalance for safety.',
      actions: [],
      riskSummary: 'Unable to assess risk at this time.',
      confidence: 0, // Low confidence when parsing fails
    }
  }
}