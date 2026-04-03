# BSMG-V4 파서 버그 수정 — GSD 프롬프트

---

## 목표

견적서 음성/텍스트 명령 파서의 실사용 패턴 버그를 자동 코퍼스 생성 → 테스트 → 수정 → 교차검증 4단계로 수정한다.

## 알려진 버그 (증상)

- "사다리차 추가" → 공종 추가 안 됨
- "사다리차 9번에 추가" → "사다리차 번에 추가" (9가 잘못 추출됨, 9번 행에 추가는 됨)
- 숫자 파싱이 공종명/행번호/금액을 구분하지 못하고 너무 공격적으로 추출

## 절대 규칙 (모든 Phase 공통)

1. **test.skip() 사용 금지** — 테스트를 건너뛰지 말 것
2. **expect 매처를 느슨하게 바꾸기 금지** — toContain → toBe 등 다운그레이드 금지
3. **기존 VoiceBar.tsx 수정 금지** — VoiceBarContainer로 래핑된 구조 유지
4. **buildItems.ts / constants.ts 구조 변경 금지** — 데이터만 읽기
5. **기존 E2E 148개 + vitest 83개가 깨지면 해당 Phase 실패** — 다음 Phase 진행 금지
6. **"완료했습니다" 자기 보고 금지** — 반드시 테스트 실행 결과를 증거로 첨부
7. **파일 3개 이상 수정 시 기존 E2E 조기 실행 (early fail)**

---

## Phase 0: 코퍼스 자동 생성

### 입력 파일 스캔

다음 파일들에서 원재료를 추출한다:

```
src/constants.ts          → 전체 공종명 리스트
src/buildItems.ts         → 공종 구조, 필드명, 카테고리
src/lib/voice/ 또는 유사 경로  → 파서 로직, 동작어, 종결어미 패턴
동음이의어 사전 (코드 내 하드코딩 + DB)  → 인식 변환 패턴
숫자 파싱 로직                        → "3만5천", "오백", "9번" 등 패턴
```

> ⚠️ 파일 경로는 실제 프로젝트 구조를 탐색해서 확인할 것. 위는 핸드오버 문서 기준 추정이다.

### 추출할 요소

| 카테고리 | 예시 |
|----------|------|
| 공종명 | 바탕정리, 미장, 우레탄, 사다리차, 실리콘, 크랙보수 등 |
| 필드명 | 재료비, 노무비, 경비, 단가, 면적, 수량 |
| 동작어 | 넣어, 추가, 빼, 삭제, 바꿔줘, 올려, 내려 |
| 숫자 패턴 | 500, 3만5천, 오백, 9번, 10%, 1000 |
| 위치 지정 | N번, N번째, N행, 위에, 아래에, 맨 위, 맨 아래 |
| 컨텍스트 계승 | "도" 패턴 ("미장도 300" = 이전 필드 계승) |
| 복합 명령 | "바탕 500 1000 200" (다중 숫자 = 재/노/경) |
| 교정 명령 | "아니", "아니 600" |
| 일괄 조정 | "전체 재료비 10% 올려", "노무비 다 500 넣어" |
| 조회 명령 | "현황", "총액" |

### 코퍼스 생성 규칙

조합 매트릭스로 생성하되, **비현실적 조합은 필터링**한다:

```
공종명(N개) × 동작어(M개) × 필드(K개) × 숫자패턴(L개)
+ 위치 지정 조합
+ 컨텍스트 계승 시퀀스
+ 복합 명령
+ 교정 시퀀스
+ 일괄 조정
+ 엣지 케이스 (빈 입력, 공종명만, 숫자만 등)
```

### 출력 형식

`tests/parser-corpus.json` 으로 저장:

```json
[
  {
    "id": "ADD-001",
    "category": "공종추가",
    "input": "사다리차 추가",
    "expected": {
      "action": "add_item",
      "item_name": "사다리차",
      "position": null,
      "field": null,
      "value": null
    },
    "priority": "P0",
    "note": "알려진 버그 — 현재 실패"
  },
  {
    "id": "ADD-002",
    "category": "공종추가_위치지정",
    "input": "사다리차 9번에 추가",
    "expected": {
      "action": "add_item",
      "item_name": "사다리차",
      "position": 9,
      "field": null,
      "value": null
    },
    "priority": "P0",
    "note": "알려진 버그 — 9가 공종명에서 잘못 추출됨"
  },
  {
    "id": "SET-001",
    "category": "값설정",
    "input": "사다리차 재료비 500 넣어",
    "expected": {
      "action": "set_value",
      "item_name": "사다리차",
      "field": "재료비",
      "value": 500,
      "position": null
    },
    "priority": "P1",
    "note": ""
  }
]
```

### Phase 0 완료 조건

- [ ] 코퍼스 JSON 파일 생성 완료
- [ ] 최소 100개 이상의 테스트 케이스
- [ ] P0 (알려진 버그) 최소 10개 포함
- [ ] 카테고리별 커버리지: 공종추가, 값설정, 삭제, 교정, 일괄조정, 복합명령, 컨텍스트계승, 위치지정, 조회, 엣지케이스
- [ ] JSON 스키마 유효성 검증 통과
- [ ] **사람 검토 대기** — 이 파일을 출력하고 멈출 것. 다음 Phase 진행 금지.

---

## Phase 1: 코퍼스 → 테스트 변환

### 사람 검토 완료 후 진행

Phase 0에서 생성한 코퍼스를 Playwright E2E 테스트와 Vitest 단위 테스트로 변환한다.

### 테스트 전략 — 2계층

**Layer 1: Vitest 단위 테스트 (파서 함수 직접 테스트)**

```typescript
// tests/unit/parser-corpus.test.ts
import corpus from '../parser-corpus.json';
import { parseCommand } from '@/lib/voice/parser'; // 실제 경로 확인 필요

describe('Parser Corpus Tests', () => {
  const cases = corpus.filter(c => c.priority === 'P0');
  
  test.each(cases)('[$id] $input', ({ input, expected }) => {
    const result = parseCommand(input);
    expect(result.action).toBe(expected.action);
    if (expected.item_name) expect(result.item_name).toBe(expected.item_name);
    if (expected.field) expect(result.field).toBe(expected.field);
    if (expected.value !== null) expect(result.value).toBe(expected.value);
    if (expected.position !== null) expect(result.position).toBe(expected.position);
  });
});
```

> ⚠️ 실제 파서 함수명, 경로, 반환 구조는 코드베이스를 탐색해서 맞출 것. 위는 예시 구조다.

**Layer 2: Playwright E2E 테스트 (사무실 모드 타이핑 기준)**

```typescript
// tests/e2e/parser-corpus.spec.ts
// 사무실 모드에서 CommandBar에 텍스트 입력 → Enter → 결과 검증
// 각 테스트는 독립적 (이전 상태에 의존하지 않음)
```

### Phase 1 완료 조건

- [ ] Vitest 단위 테스트 파일 생성 완료
- [ ] Playwright E2E 테스트 파일 생성 완료
- [ ] **기존 E2E 148개 실행 → 전부 PASS** (새 테스트 파일 추가가 기존을 깨뜨리지 않음 확인)
- [ ] **기존 vitest 83개 실행 → 전부 PASS**
- [ ] 신규 테스트 실행 → **실패 목록 리포트 생성**
- [ ] 리포트 형식:

```
=== PARSER CORPUS TEST REPORT ===
총 테스트: XXX개
PASS: XXX개
FAIL: XXX개

--- P0 실패 목록 ---
[ADD-001] "사다리차 추가" → expected: add_item, got: (실제 결과)
[ADD-002] "사다리차 9번에 추가" → expected: item_name="사다리차", got: "사다리차 번에"

--- P1 실패 목록 ---
...

--- 카테고리별 실패율 ---
공종추가: 3/10 FAIL
값설정: 1/20 FAIL
...
```

---

## Phase 2: 파서 수정

### 수정 범위

Phase 1 리포트에서 **FAIL인 케이스만** 보고 파서 로직을 수정한다.

### 수정 원칙

1. **숫자 추출 우선순위 재설계** — 핵심 버그 원인
   - "N번" 패턴 → 위치 지정 (행 번호)으로 먼저 분리
   - "N번에" → 위치 지정
   - 나머지 숫자 → 금액/수량
   - 공종명 안에 숫자가 있는 경우 (예: "301호") → 공종명으로 보존

2. **동작어 분류 명확화**
   - "추가" → add_item (공종 신규 생성)
   - "넣어" → set_value (기존 공종에 값 입력)
   - "빼" → 문맥에 따라 delete_item 또는 subtract_value

3. **토큰화 순서**
   - Step 1: 위치 패턴 추출 및 제거 ("N번에", "맨 위에" 등)
   - Step 2: 공종명 매칭 (constants.ts 사전 기반)
   - Step 3: 필드명 매칭 ("재료비", "노무비" 등)
   - Step 4: 동작어 매칭
   - Step 5: 잔여 숫자 → 금액/수량

4. **기존 파일 최소 수정**
   - 파서 로직 파일만 수정
   - VoiceBar.tsx 절대 수정 금지
   - buildItems.ts / constants.ts 구조 변경 금지

### 수정 중 검증

**파일 3개 이상 수정 시점에서 반드시:**

```bash
# 기존 테스트 조기 실행
npx playwright test --project=chromium  # 기존 E2E
npx vitest run                          # 기존 단위 테스트
```

하나라도 FAIL이면 **즉시 수정 중단 → 원인 분석 → 복구 후 재시도**

### Phase 2 완료 조건

- [ ] 기존 E2E 148개 PASS
- [ ] 기존 vitest 83개 PASS (기존 2개 실패는 기존 상태 유지 허용)
- [ ] 신규 코퍼스 테스트 P0 전부 PASS
- [ ] 신규 코퍼스 테스트 P1 90% 이상 PASS
- [ ] 수정한 파일 목록 + diff 요약 출력
- [ ] **실제 테스트 실행 로그를 증거로 첨부** (자기 보고 금지)

---

## Phase 3: 교차 검증

### Phase 2와 다른 관점에서 검증

Phase 2를 수행한 로직과 독립적으로, 수정된 코드를 처음 보는 것처럼 검증한다.

### 검증 항목

**3-1. 전체 테스트 재실행**

```bash
# 기존 E2E 전체
npx playwright test --project=chromium

# 기존 vitest 전체  
npx vitest run

# 신규 코퍼스 테스트
npx vitest run tests/unit/parser-corpus.test.ts
npx playwright test tests/e2e/parser-corpus.spec.ts
```

**3-2. 코드 리뷰 체크리스트**

| # | 항목 | PASS/FAIL |
|---|------|-----------|
| 1 | VoiceBar.tsx 수정 여부 → 수정했으면 FAIL | |
| 2 | buildItems.ts 구조 변경 여부 → 변경했으면 FAIL | |
| 3 | constants.ts 구조 변경 여부 → 변경했으면 FAIL | |
| 4 | test.skip() 사용 여부 → 사용했으면 FAIL | |
| 5 | expect 매처 다운그레이드 여부 → 했으면 FAIL | |
| 6 | 숫자 파싱 우선순위: "N번" → 위치, 나머지 → 금액 | |
| 7 | 공종명에 포함된 숫자 보존 여부 | |
| 8 | "도" 패턴 계승 작동 여부 | |
| 9 | "아니" 롤백 작동 여부 | |
| 10 | 다중 숫자 ("바탕 500 1000 200") 작동 여부 | |
| 11 | 일괄 조정 명령 작동 여부 | |
| 12 | 불완전 명령 버퍼 축적 작동 여부 | |
| 13 | 이상치 감지 (10원 미만, 100만원 이상) 여전히 작동 | |
| 14 | 기존 E2E 셀렉터가 모두 유효한지 | |
| 15 | 새로운 하드코딩 값 없이 constants 참조하는지 | |

**3-3. 회귀 테스트 — 핸드오버 문서 기능 목록 대조**

다음 기능들이 파서 수정 후에도 작동하는지 확인:
- 실시간 하이라이트
- 미리보기 (연한 색 표시)
- 종결어미 트리거
- 필드 자동 추론 6단계 우선순위
- 빠른 교정 ("아니" 0.2초 롤백)
- 동음이의어 변환
- 확신도 2트랙 (높으면 즉시, 낮으면 미리보기)

### Phase 3 완료 조건

- [ ] 전체 테스트 실행 결과 첨부 (스크린샷 또는 로그)
- [ ] 코드 리뷰 15/15 PASS
- [ ] 회귀 기능 확인 완료
- [ ] **최종 리포트 출력:**

```
=== PARSER FIX FINAL REPORT ===
수정 파일: X개 (파일명 나열)
신규 파일: X개 (파일명 나열)

기존 E2E: 148/148 PASS
기존 vitest: 83/83 PASS (또는 81/83, 기존 실패 2개 유지)
신규 코퍼스 vitest: XX/XX PASS
신규 코퍼스 E2E: XX/XX PASS
코드 리뷰: 15/15 PASS

P0 버그 수정: X/X
P1 버그 수정: X/X

종합 판정: 출시 가능 / 추가 수정 필요
```

---

## 실행 방법

이 전체 프롬프트를 Claude Code에 전달한다.
Phase 0 완료 시 코퍼스 JSON을 출력하고 멈추므로, 검토 후 "Phase 1 진행" 이라고 입력하면 된다.
Phase 1~3은 연속 실행 가능하나, 각 Phase 완료 조건 미충족 시 자동 중단된다.

---

## 부록: GSD 교훈 반영 사항

이 프롬프트는 핸드오버 문서 Section 7의 교훈을 반영했다:

- **Phase 게이트** → "만들었다고 치고 넘어가기" 방지
- **test.skip() / expect 느슨화 금지** → 명시적 금지 조항
- **자기 보고 금지** → 테스트 실행 증거 필수
- **기존 UI 컴포넌트 수정 금지** → VoiceBar.tsx 보호
- **파일 3개 이상 수정 시 기존 E2E 조기 실행** → early fail
- **파서는 한 에이전트가 전체 맥락에서 수정** → Phase 2는 분할 불가
