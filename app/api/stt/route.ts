import { NextResponse } from 'next/server'

/**
 * POST /api/stt
 * OpenAI Whisper 프록시
 * Body: { audio: base64(webm), prompt?: string }
 * Response: { text: string }
 */
export async function POST(request: Request) {
  const { audio, prompt } = await request.json()

  if (!audio) {
    return NextResponse.json({ error: 'audio 필드 필요' }, { status: 400 })
  }

  // base64 → binary
  const audioBuffer = Buffer.from(audio, 'base64')
  const blob = new Blob([audioBuffer], { type: 'audio/webm' })

  const formData = new FormData()
  formData.append('file', blob, 'audio.webm')
  formData.append('model', 'whisper-1')
  formData.append('language', 'ko')
  if (prompt) {
    formData.append('prompt', prompt)
  }

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: `STT 실패: ${err}` }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json({ text: data.text })
}
