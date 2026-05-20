import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const key = process.env.OPENAI_API_KEY
  if (!key) return NextResponse.json({ error: 'Transcription not configured' }, { status: 503 })

  let audio: File | null = null
  try {
    const form = await req.formData()
    audio = form.get('audio') as File | null
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }
  if (!audio || audio.size === 0) {
    return NextResponse.json({ error: 'No audio file' }, { status: 400 })
  }

  // Forward to OpenAI Whisper — no SDK, direct REST
  const whisperForm = new FormData()
  whisperForm.append('file', audio, audio.name)
  whisperForm.append('model', 'whisper-1')

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: whisperForm,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('[transcribe-audio] Whisper error:', err)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }

  const data = await res.json() as { text?: string }
  if (!data.text) return NextResponse.json({ error: 'Empty transcript' }, { status: 500 })
  return NextResponse.json({ transcript: data.text })
}
