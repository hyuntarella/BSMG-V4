---
name: domain-qa
description: "방수명가 경계면 교차 검증 스킬. API 응답↔프론트 훅 shape 비교, DB 스키마↔TypeScript 타입 동기화, 음성 명령 JSON↔견적 상태 정합성, 견적↔PDF/Excel 출력 일치 등 시스템 경계면을 교차 비교한다. '검증', 'QA', '테스트', '경계면', '통합', '정합성', 'shape 비교', '타입 불일치' 키워드가 있으면 이 스킬을 사용하라."
---

# 경계면 교차 검증 스킬

Domain QA 에이전트가 사용하는 작업 스킬.

## 검증 대상 경계면

| # | 경계면 | 소스 측 | 소비 측 | 정본 |
|---|--------|---------|---------|------|
| 1 | 음성→견적 | `/lib/voice/commands.ts` | `/hooks/useEstimate.ts` | commands.ts |
| 2 | API→프론트 | `/app/api/*/route.ts` | `/hooks/use*.ts` | route.ts |
| 3 | DB→타입 | `/supabase/migrations/` | `/lib/estimate/types.ts` | migrations |
| 4 | 견적→PDF | `/lib/estimate/calc.ts` | `/lib/pdf/generatePdf.ts` | calc.ts |
| 5 | CRM→견적 | `/lib/supabase/crm.ts` | `/app/api/estimates/route.ts` | crm.ts |

**정본 우선순위**: DB 스키마 > TypeScript 타입 > API 응답 > 프론트 훅

## 검증 방법

### Shape 비교 (핵심)
"파일이 존재한다"가 아니라 **데이터 구조가 일치하는가**를 검증:

1. 소스 측 파일을 읽고 출력 shape(필드명, 타입, nullable 여부)을 추출
2. 소비 측 파일을 읽고 입력 shape을 추출
3. 필드별 1:1 매핑 확인
4. 불일치 발견 시 정본 기준으로 수정 방향 제시

### 점진적 검증
변경된 파일이 속한 경계면만 검증한다 (전체 스캔 아님):

```
변경 파일: /lib/voice/commands.ts
→ 경계면 #1 (음성→견적) 검증
→ /hooks/useEstimate.ts 의 명령 핸들러와 shape 비교
```

## 결과 보고 형식

```markdown
## QA 검증 결과
| 경계면 | 소스 | 소비 | 상태 | 상세 |
|--------|------|------|------|------|
| 음성→견적 | commands.ts:L45 | useEstimate.ts:L78 | PASS | - |
| DB→타입 | migration_010:L12 | types.ts:L23 | FAIL | `discount` 컬럼 타입 누락 |

### FAIL 항목 수정 제안
1. `types.ts:L23`에 `discount: number | null` 추가 (정본: migration_010)
```

## 검증 트리거 규칙
- 2개 이상 도메인에 걸치는 변경 → 자동 트리거
- 단일 도메인 변경이라도 타입 파일 수정 시 → DB→타입 경계면 검증
- 사용자가 명시적으로 요청 시 → 전체 경계면 스캔
