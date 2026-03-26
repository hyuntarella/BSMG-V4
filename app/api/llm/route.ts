import { NextResponse } from 'next/server'

/**
 * POST /api/llm
 * Claude Sonnet 프록시
 * Body: { system: string, user: string, context?: object }
 * Response: LLM 응답 JSON (commands[], clarification_needed, tts_response)
 */
export async function POST(request: Request) {
  const { system, user, context } = await request.json()

  if (!system || !user) {
    return NextResponse.json({ error: 'system, user 필드 필요' }, { status: 400 })
  }

  // context가 있으면 user 메시지에 포함
  const userMessage = context
    ? `${user}\n\n[컨텍스트]\n${JSON.stringify(context)}`
    : user

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: `LLM 실패: ${err}` }, { status: res.status })
  }

  const data = await res.json()
  const text = data.content?.[0]?.text ?? ''

  // JSON 파싱 시도
  try {
    const parsed = JSON.parse(text)
    return NextResponse.json(parsed)
  } catch {
    // JSON 아닌 응답도 그대로 반환
    return NextResponse.json({ raw: text })
  }
}
