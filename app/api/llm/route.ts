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

  // JSON 파싱 시도 (마크다운 백틱 제거 후)
  const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    return NextResponse.json(parsed)
  } catch {
    // JSON 아닌 응답 → 되묻기로 전환
    return NextResponse.json({
      commands: [],
      clarification_needed: '다시 말씀해주시겠어요?',
      tts_response: '다시 말씀해주시겠어요?',
      raw: text,
    })
  }
}
