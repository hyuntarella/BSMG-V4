/**
 * POST /api/tts
 * OpenAI gpt-4o-mini-tts 프록시
 * Body: { text: string }
 * Response: audio/mpeg stream
 */
export async function POST(request: Request) {
  try {
    const { text } = await request.json()

    if (!text) {
      return new Response(JSON.stringify({ error: 'text 필드 필요' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('[TTS] OPENAI_API_KEY 환경변수 누락')
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY 미설정' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log('[TTS] 요청:', text.substring(0, 80))

    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice: 'coral',
        input: text,
        instructions:
          '당신은 방수 시공 업체의 유능한 견적 보조원입니다. ' +
          '조금 빠른 속도로, 차분하고 간결하게 말합니다. ' +
          '숫자는 명확하게, 불필요한 수식어 없이. ' +
          "'~입니다' 체가 아닌, '~했습니다' '~반영.' 같은 짧은 어미를 씁니다. " +
          '금액은 만원 단위로 읽습니다. 예: 3,900,000 → "삼백구십만원". ' +
          '항목명은 그대로 읽습니다. 줄임 없이.',
        response_format: 'mp3',
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[TTS] OpenAI 에러:', res.status, err)
      return new Response(JSON.stringify({ error: `TTS 실패: ${err}` }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // audio stream 그대로 전달
    return new Response(res.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    console.error('[TTS] 서버 에러:', err)
    return new Response(
      JSON.stringify({ error: `TTS 서버 에러: ${err instanceof Error ? err.message : String(err)}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
