// scripts/ai-review.mjs
// 실행: node scripts/ai-review.mjs "요구사항 텍스트"

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// .env.local 로딩
function loadEnv() {
  try {
    const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {}
}
loadEnv();

const requirement = process.argv[2];
if (!requirement) {
  console.error('사용법: node scripts/ai-review.mjs "요구사항"');
  process.exit(1);
}

// git diff 추출
const diff = execSync('git diff --staged', { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 10 });
if (!diff.trim()) {
  console.log('스테이징된 변경 없음. git add 먼저.');
  process.exit(1);
}

// 변경된 파일 목록
const files = execSync('git diff --staged --name-only', { encoding: 'utf-8' });

const prompt = `
당신은 시니어 프론트엔드 코드 리뷰어입니다.

## 요구사항
${requirement}

## 변경된 파일
${files}

## Diff
${diff.slice(0, 80000)}

## 검수 기준
각 항목에 PASS/FAIL로 판정하세요:

1. 요구사항 충족: 요구사항에 명시된 기능이 실제 코드에 구현되어 있는가?
2. 렌더링 확인: 새 UI 요소가 실제로 JSX에서 렌더링되는가? (import만 하고 안 쓰는 건 FAIL)
3. 데이터 연결: API fetch/Supabase 쿼리가 실제로 호출되고 결과가 UI에 바인딩되는가?
4. 기존 코드 보존: 기존 동작을 깨뜨리는 변경이 없는가?
5. 하드코딩 없음: 더미 데이터나 하드코딩된 값이 아닌 실제 데이터를 사용하는가?

## 응답 형식 (JSON만 출력, 다른 텍스트 없이)
{
  "verdict": "PASS" 또는 "FAIL",
  "scores": {
    "요구사항충족": "PASS/FAIL",
    "렌더링확인": "PASS/FAIL",
    "데이터연결": "PASS/FAIL",
    "기존코드보존": "PASS/FAIL",
    "하드코딩없음": "PASS/FAIL"
  },
  "issues": ["문제점1", "문제점2"],
  "suggestions": ["제안1"]
}
`;

async function review() {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 2000
    })
  });

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';

  console.log('\n=== OpenAI 검수 결과 ===');
  console.log(text);

  try {
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    if (result.verdict === 'FAIL') {
      console.log('\n❌ 검수 불합격. 위 issues를 수정하세요.');
      process.exit(1);
    } else {
      console.log('\n✅ 검수 합격.');
      process.exit(0);
    }
  } catch {
    console.log('\n⚠️ JSON 파싱 실패. 수동 확인 필요.');
    console.log(text);
    process.exit(1);
  }
}

review();
