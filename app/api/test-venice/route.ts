import { NextResponse } from 'next/server'
import OpenAI from 'openai'

/**
 * POST /api/test-venice
 * 
 * Simple test endpoint to debug Venice AI connection
 */
export async function POST() {
  try {
    console.log('🔍 Testing Venice AI connection...')
    console.log('API Key:', process.env.VENICE_API_KEY ? `${process.env.VENICE_API_KEY.slice(0, 20)}...` : 'NOT SET')
    console.log('Base URL:', process.env.NEXT_PUBLIC_VENICE_BASE_URL ?? 'https://api.venice.ai/api/v1')

    const venice = new OpenAI({
      apiKey: process.env.VENICE_API_KEY!,
      baseURL: process.env.NEXT_PUBLIC_VENICE_BASE_URL ?? 'https://api.venice.ai/api/v1',
    })

    // Test 1: Simple text completion
    console.log('🧪 Testing text completion...')
    const textResponse = await venice.chat.completions.create({
      model: process.env.VENICE_TEXT_MODEL ?? 'zai-org-glm-5.1',
      max_tokens: 50,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello in one sentence.' },
      ],
    })

    const textResult = textResponse.choices[0]?.message?.content ?? 'No response'
    console.log('✅ Text completion success:', textResult)

    return NextResponse.json({
      success: true,
      textResult,
      apiKeyPresent: !!process.env.VENICE_API_KEY,
      baseURL: process.env.NEXT_PUBLIC_VENICE_BASE_URL ?? 'https://api.venice.ai/api/v1',
      model: process.env.VENICE_TEXT_MODEL ?? 'zai-org-glm-5.1',
    })

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('❌ Venice AI test failed:', errorMsg)
    console.error('Full error:', error)

    return NextResponse.json({
      success: false,
      error: errorMsg,
      apiKeyPresent: !!process.env.VENICE_API_KEY,
      baseURL: process.env.NEXT_PUBLIC_VENICE_BASE_URL ?? 'https://api.venice.ai/api/v1',
    }, { status: 500 })
  }
}