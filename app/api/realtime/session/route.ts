/**
 * POST /api/realtime/session
 * OpenAI Realtime API 에페머럴 토큰 발급
 * 클라이언트가 직접 OpenAI WebRTC에 연결할 수 있도록 임시 키 반환
 */
import { NextResponse } from 'next/server'

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY 미설정' }, { status: 500 })
  }

  try {
    const res = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-realtime-preview-2024-12-17',
        modalities: ['text'],
        input_audio_transcription: {
          model: 'whisper-1',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 2000,
        },
        instructions: '사용자의 음성을 받아적기만 하세요. 아무 응답도 하지 마세요. OK만 출력하세요.',
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[Realtime] 세션 생성 실패:', res.status, err)
      return NextResponse.json({ error: `세션 생성 실패: ${err}` }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[Realtime] 서버 에러:', err)
    return NextResponse.json(
      { error: `서버 에러: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    )
  }
}
