// 사용법: node scripts/visual-review.mjs <실제_스크린샷_경로> <피그마_스크린샷_URL> "검수 대상 설명"
//
// 두 이미지를 GPT-4o에 보내서 비교 검수
// FAIL이면 구체적 차이점 목록 출력, PASS면 통과

import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  try {
    const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    for (const line of content.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
        v = v.slice(1, -1);
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {}
}
loadEnv();

const [,, implPath, figmaUrl, description] = process.argv;
if (!implPath || !figmaUrl || !description) {
  console.error('Usage: node scripts/visual-review.mjs <impl_screenshot> <figma_screenshot_url> "description"');
  process.exit(1);
}

const implBase64 = readFileSync(implPath).toString('base64');

async function review() {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `당신은 UI 검수자입니다. 두 이미지를 비교하세요.
첫 번째: Figma 원본 디자인
두 번째: 실제 구현 스크린샷

검수 대상: ${description}

5가지 항목을 판정하세요:
1. 레이아웃 구조 일치 (테이블/섹션/헤더 배치)
2. 폰트 위계 일치 (볼드/크기/간격)
3. 색상 톤 일치 (배경색, 텍스트색, 강조색)
4. 금액/숫자 포맷 (천단위 콤마, 정렬, monospace)
5. 브랜드 요소 (로고, 아이콘, 특수 요소)

각 항목: PASS 또는 FAIL + 구체적 차이점
전체 판정: 5개 중 4개 이상 PASS면 전체 PASS

JSON 형식으로 응답:
{
  "layout": {"pass": true/false, "diff": "..."},
  "typography": {"pass": true/false, "diff": "..."},
  "color": {"pass": true/false, "diff": "..."},
  "numbers": {"pass": true/false, "diff": "..."},
  "brand": {"pass": true/false, "diff": "..."},
  "overall": "PASS" | "FAIL",
  "summary": "전체 요약"
}`
          },
          { type: 'image_url', image_url: { url: figmaUrl } },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${implBase64}` } },
        ]
      }]
    }),
  });

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  console.log(text);

  // JSON 파싱 시도
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      if (result.overall === 'FAIL') {
        console.error('\n❌ VISUAL REVIEW FAILED');
        process.exit(1);
      } else {
        console.log('\n✅ VISUAL REVIEW PASSED');
      }
    }
  } catch {
    console.log('\n⚠ JSON 파싱 실패, 수동 확인 필요');
  }
}

review().catch(e => { console.error(e); process.exit(1); });
