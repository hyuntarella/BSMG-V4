# BSMG-V4 UX 9.0 자율 실행 — OpenAI 검수 + Playwright 검증

---

## 지시

사람이 자리를 비운다. 아래 3단계를 전부 끝내고 각 단계마다 커밋+푸시까지 완료하라.
중간에 사람에게 질문하지 말 것.

---

## 검수 시스템 (모든 수정에 적용)

### 구조

```
Claude Code (개발) → 코드 수정
    ↓
OpenAI API (검수) → diff + 요구사항을 GPT에 보내서 독립 판단
    ↓ "불합격" → Claude Code가 재수정 (최대 3회)
    ↓ "합격"
Playwright (UI 검증) → 실제 브라우저에서 렌더링 확인
    ↓ FAIL → Claude Code가 재수정 (최대 3회)
    ↓ PASS
빌드 확인 → npm run build
    ↓ FAIL → 수정
    ↓ PASS
기존 테스트 → npx vitest run + npx playwright test
    ↓ FAIL → 롤백
    ↓ PASS
다음 작업으로
```

### OpenAI 검수 스크립트

매 작업 완료 시 아래 스크립트를 실행한다. 검수 불합격이면 재수정.

```javascript
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
```

### OpenAI 검수 실행 방법

```bash
# 1. 코드 수정 완료 후
git add -A

# 2. 검수 실행
node scripts/ai-review.mjs "대시보드에 오늘 일정 위젯 추가. CRM API에서 실제 데이터 fetch. 스켈레톤 로딩 포함."

# 3. PASS면 커밋, FAIL이면 issues 보고 재수정 후 다시 검수
```

### Playwright UI 검증

각 작업에 대해 Playwright 테스트를 작성하여 UI에 실제로 렌더링되는지 확인한다.
"컴포넌트를 만들었다"가 아니라 "브라우저에서 보인다"를 검증한다.

```typescript
// 예시: 대시보드 위젯 검증
test('대시보드에 오늘 일정 위젯이 보인다', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('[data-testid="today-schedule"]')).toBeVisible();
});
```

---

## 사용자 리서치 결과 (모든 단계에 반영)

### 대시보드
- 영업사원 전용. 최상단: 오늘 일정. 그 아래: 견적서 열람한 고객, 연락할 곳, CS DB
- 클릭하면 CRM 카드 상세가 사이드패널/모달로 열림 (페이지 이동 아님)

### CRM
- 칸반 드래그 매우 자주 사용 — 필수
- 카드 정보 우선순위: 주소(1) > 금액(2) > 담당자(3) > 견적일자/발송일(4) > 메모 미리보기(5)
- 검색: 주소 기준
- 직원별 담당 고객 나눠서 봄
- 카드에서 견적서/제안서/Google Drive 바로 이동 필수

### 견적서
- 핵심 = 단가 조정 (80%). 평단가, 헤베당 단가 직관적 표시
- 금액: monospace, 천단위 구분, 우측 정렬
- 수정 요청 30% — 전부 가격 관련

### 캘린더
- 일정 등록이 쉬워야 함. CRM 고객 선택 시 주소/전화 자동 입력
- 이벤트에 주소, 시간, 메모 필수
- 이벤트에서 CRM/Google Drive 바로 이동
- 일간=주간>월간 순서. 직원별로 따로 봄

### 모바일
- 견적서/제안서 작성 제외 전부 모바일 대응
- 하단 탭바: 대시보드/CRM/캘린더/견적서/더보기

### 알림
- 잔금 입금, 견적서 열람 최우선
- 앱 내 + 카톡

### 최대 불만
- 로딩 속도

---

## 절대 규칙

1. VoiceBar.tsx 수정 금지
2. buildItems.ts / constants.ts 구조 변경 금지
3. test.skip() 금지, expect 느슨화 금지
4. 기존 E2E/vitest 깨지면 롤백
5. 자기 보고 금지 — 테스트 실행 로그 + OpenAI 검수 결과를 증거로 첨부
6. 파일 3개 이상 수정 시 빌드 확인
7. 커밋 메시지 한국어
8. 모든 UI 수정은 반드시 data-testid 속성 포함 (Playwright 검증용)
9. 더미 데이터/하드코딩 금지 — 반드시 실제 API/DB에서 fetch

---

## 1단계: 비주얼 디자인 업그레이드

### 작업 목록

**1-1. 디자인 토큰 + 공통 스타일** (1개 작업 단위)
- globals.css에 shadcn/ui CSS 변수 추가 (--background, --foreground, --card, --primary, --muted, --border 등)
- tailwind.config 확장
- 공통 버튼/카드/모달/인풋/뱃지/토스트 스타일 정리

검수 요구사항: "globals.css에 CSS 변수가 정의되고, tailwind.config에서 참조되며, 기존 UI가 깨지지 않는다."

**1-2. 로딩 스켈레톤** (1개 작업 단위)
- Skeleton 공통 컴포넌트 생성
- 대시보드, CRM, 캘린더, 견적서 각 페이지에 데이터 로딩 중 스켈레톤 표시
- 실제 fetch 완료 시 스켈레톤 → 콘텐츠 전환

검수 요구사항: "Skeleton 컴포넌트가 존재하고, 각 페이지에서 데이터 로딩 중 실제로 렌더링된다. 하드코딩된 로딩 상태가 아닌 실제 fetch 상태와 연동."

Playwright 검증:
```typescript
test('CRM 페이지 로딩 시 스켈레톤 표시', async ({ page }) => {
  await page.goto('/crm');
  // 로딩 중 스켈레톤이 보이고
  await expect(page.locator('[data-testid="crm-skeleton"]')).toBeVisible();
  // 데이터 로드 후 칸반보드가 보인다
  await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible({ timeout: 10000 });
});
```

**1-3. CRM 칸반 카드 디자인** (1개 작업 단위)
- 주소: font-semibold 첫 줄
- 금액: font-mono 우측 정렬
- 담당자: 색상 뱃지
- 견적일자/발송일: text-sm text-muted-foreground
- 메모 미리보기: 1줄 truncate
- 아이콘 링크: 견적서/제안서/Google Drive (실제 URL 연결)

검수 요구사항: "KanbanCard에 주소/금액/담당자/날짜/메모가 렌더링되고, 견적서/제안서/Drive 링크가 실제 URL로 연결된다. 하드코딩 아닌 CRM 데이터 기반."

**1-4. 견적서 금액 가독성** (1개 작업 단위)
- 모든 금액: font-mono, 천단위 구분 (toLocaleString), 우측 정렬
- 상단 고정 영역: 총 합계, 평단가(합계÷면적), 헤베당 단가
- 공종 변경/단가 수정 시 실시간 업데이트
- 배경색 구분 (muted 배경)

검수 요구사항: "견적서에 총합계/평단가/헤베당단가가 표시되고, 공종 수정 시 실시간 업데이트된다. 금액이 monospace, 천단위 구분, 우측 정렬."

**1-5. 모바일 반응형** (1개 작업 단위)
- 하단 탭바: 대시보드/CRM/캘린더/견적서/더보기 (PC에서 숨김)
- CRM 칸반: 가로 스크롤 snap
- 터치 타겟 44px 이상
- 모달: 모바일에서 full-width

검수 요구사항: "MobileTabBar가 모바일 화면에서 렌더링되고, 각 탭이 올바른 페이지로 이동한다. PC에서는 숨겨진다."

Playwright 검증:
```typescript
test('모바일에서 하단 탭바 표시', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/dashboard');
  await expect(page.locator('[data-testid="mobile-tab-bar"]')).toBeVisible();
});

test('PC에서 하단 탭바 숨김', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/dashboard');
  await expect(page.locator('[data-testid="mobile-tab-bar"]')).not.toBeVisible();
});
```

### 1단계 실행 흐름

각 작업(1-1 ~ 1-5)마다:
1. 💻 코드 수정
2. git add -A
3. node scripts/ai-review.mjs "요구사항" → FAIL이면 재수정 (최대 3회)
4. Playwright 검증 테스트 실행 → FAIL이면 재수정 (최대 3회)
5. npm run build → 실패면 수정
6. npx vitest run + npx playwright test → 기존 테스트 확인
7. 5개 작업 전부 완료 후 커밋+푸시

```bash
git add -A
git commit -m "style: shadcn/ui 디자인 토큰 + 비주얼 업그레이드 (스켈레톤/칸반/금액/모바일)"
git push origin main
```

---

## 2단계: UX 기능 품질 (10라운드)

### 체크리스트 (Yes/No)

**에러/빈 상태**
- [ ] 모든 API 에러 시 토스트 표시
- [ ] 데이터 없을 때 빈 상태 UI ("아직 고객이 없습니다" 등)
- [ ] 폼 유효성 에러 인라인 표시

**인터랙션**
- [ ] 모든 클릭 가능 요소에 hover/active 상태
- [ ] 모달/패널: ESC + 바깥 클릭으로 닫기
- [ ] 삭제/위험 동작에 확인 다이얼로그
- [ ] 성공 동작에 피드백 (저장됨, 삭제됨)
- [ ] CRM 드래그앤드롭 시각적 피드백

**접근성**
- [ ] 모든 인풋에 label
- [ ] 탭 키 네비게이션
- [ ] 폰트 최소 14px

**네비게이션/연결**
- [ ] 대시보드 → CRM 카드 상세 (사이드패널, 페이지 이동 아님)
- [ ] CRM 카드 → 견적서/제안서 바로 이동
- [ ] CRM 카드 → Google Drive 링크
- [ ] 캘린더 이벤트 → CRM 카드 이동
- [ ] 캘린더 일정 등록 시 CRM 고객 선택 → 주소/전화 자동 입력

### 라운드 실행

각 라운드에서 체크리스트 3~5개 선택 → 구현 → OpenAI 검수 → Playwright 검증 → 기존 테스트 → 다음 라운드.

10라운드 완료 시 또는 체크리스트 전부 PASS 시 커밋:

```bash
git add -A
git commit -m "ux: UX 기능 품질 최적화 — 에러처리/인터랙션/접근성/네비게이션"
git push origin main
```

---

## 3단계: 정보설계 (사용자 리서치 기반)

### 3-1. 대시보드 재구성
- 최상단: 오늘 일정 (calendar_events 테이블에서 오늘 날짜 필터, 시간순)
- 2번째: 견적서 열람한 고객 (estimate_viewed_date 기준, 최근순)
- 3번째: 연락해야 할 고객 (파이프라인 "먼저연락X" + CS 관련)
- 각 항목 클릭 → CRM 상세 사이드패널 (실제 CRM API fetch)

검수 요구사항: "대시보드에 오늘일정/견적서열람/연락할곳 3개 섹션이 실제 데이터로 렌더링된다. 클릭 시 CRM 상세 사이드패널이 열리고 실제 고객 데이터가 표시된다."

Playwright 검증:
```typescript
test('대시보드 오늘 일정 섹션 존재', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('[data-testid="today-schedule-section"]')).toBeVisible({ timeout: 10000 });
});

test('대시보드 항목 클릭 시 CRM 패널 열림', async ({ page }) => {
  await page.goto('/dashboard');
  const firstItem = page.locator('[data-testid="dashboard-crm-item"]').first();
  if (await firstItem.isVisible()) {
    await firstItem.click();
    await expect(page.locator('[data-testid="crm-detail-panel"]')).toBeVisible();
  }
});
```

### 3-2. 캘린더 CRM 연동 강화
- 일정 등록 시 CRM 고객 검색 → 선택하면 주소/전화 자동 입력
- 이벤트 상세에 CRM 링크 + Google Drive 링크
- 이벤트 카드에 주소 표시

검수 요구사항: "캘린더 EventModal에서 CRM 고객 선택 시 주소/전화가 자동 입력된다. EventDetail에 CRM 링크와 Drive 링크가 있다."

### 3-3. CRM 직원별 필터 강화
- 담당자 필터가 기본으로 본인 선택
- "전체" 옵션으로 모든 고객 보기

검수 요구사항: "CRM 칸반에 담당자 필터 드롭다운이 있고, 실제로 필터링된다."

### 3단계 완료 시

```bash
git add -A
git commit -m "feat: 정보설계 반영 — 대시보드 CRM 연동/캘린더 자동입력/직원별 필터"
git push origin main
```

---

## 최종 리포트 (모든 단계 완료 후)

```
=== BSMG-V4 UX 9.0 최종 리포트 ===

1단계: 비주얼
- 상태: ✅/❌
- OpenAI 검수: X/5 PASS
- Playwright UI 검증: X/X PASS
- 커밋: (해시)

2단계: UX 기능 품질
- 상태: ✅/❌
- 라운드: X/10
- 체크리스트: X/X PASS
- OpenAI 검수: 전체 PASS/FAIL 내역
- 커밋: (해시)

3단계: 정보설계
- 상태: ✅/❌
- OpenAI 검수: X/3 PASS
- Playwright UI 검증: X/X PASS
- 커밋: (해시)

기존 E2E: XXX/XXX PASS
기존 vitest: XXX/XXX PASS
빌드: 성공

=== OpenAI 검수 전체 로그 ===
(각 작업별 PASS/FAIL + issues 전부 나열)

=== 사람이 돌아와서 해야 할 것 ===
1. Vercel 배포 확인
2. 앱 열어서 비주얼 확인 (이것만 사람이 판단)
3. 모바일에서 확인
4. 피드백 있으면 전달
```

---

## 실행

1. 먼저 scripts/ai-review.mjs를 생성한다.
2. 1단계부터 순서대로 실행한다.
3. 각 작업마다 OpenAI 검수 → Playwright 검증 → 기존 테스트 순서.
4. OpenAI가 FAIL 주면 재수정 (최대 3회). 3회 초과 시 해당 작업 스킵하고 로그 남김.
5. 전부 끝나면 최종 리포트 출력.
