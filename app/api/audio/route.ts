import { NextResponse } from 'next/server'
import { veniceGenerateAudio } from '@/lib/venice'

/**
 * POST /api/audio
 * 
 * Generate Venice AI text-to-speech audio for agent narration.
 * Body: { text: string, voice?: string }
 */
export async function POST(request: Request) {
  try {
    const { text, voice } = await request.json()
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // Limit text length to prevent abuse
    if (text.length > 500) {
      return NextResponse.json({ error: 'Text too long (max 500 characters)' }, { status: 400 })
    }

    const audioDataUrl = await veniceGenerateAudio(text, voice)
    
    if (!audioDataUrl) {
      return NextResponse.json({ error: 'Audio generation failed' }, { status: 500 })
    }

    return NextResponse.json({ audioUrl: audioDataUrl })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Audio API Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}