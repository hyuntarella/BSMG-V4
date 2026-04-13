# NEXT SESSION HANDOFF 8

> Phase 4.5 회귀 3건 일괄 해소 완료 (hotfix + Phase 5). 2026-04-13.
> 다음 세션은 PM 개입 최소화 모드. 아래 운영 원칙 엄수.

---

## 운영 원칙 (PM 요구사항 반영)

PM 개입 최소화 = 거의 무. 다음 규칙 엄수:

### 자동화 우선
- 모든 작업은 병렬 가능한 것을 모아서 한 번에 진행
- PM 액션 필요 시: 사전에 모아서 1회 묶음 요청, 중간 추가 요청 금지
- 외부 시스템 접근 (GitHub/Vercel/GCP)도 가능한 자동화 (PAT 등록 우선)

### 보고 양식
- 진행 상황은 PM 이 파악할 수 있게 stdout 에 단계별 출력
- 그러나 PM 회신 요구는 블로커 시점만:
  a) 외부 시스템 인증/권한 (PAT, 브라우저 OAuth)
  b) 머지 승인 (단 PAT 등록 후엔 CC 자동)
  c) UAT 판정 (PDF/스크린샷 시각 검증 필요한 경우)
- 그 외 모든 결정은 CC 자체 판단 (또는 Claude 검수)

### 첫 번째 작업 (PAT 등록)
다음 세션 시작 시 PM 에 1회만 요청:
1. https://github.com/settings/tokens/new
   - Note: BSMG CC automation
   - Expiration: 90 days
   - Scope: repo (전체)
   - Generate → 토큰 복사
2. PM 이 채팅에 토큰 붙여넣기 (1줄)
3. CC 가 .env.local 추가 + gh CLI 인증

PAT 등록 후 모든 PR/머지 CC 자동. PM 은 UAT PDF 확인 + "OK"만.

---

## 미결 작업 우선순위

### 🔴 1순위 — 보안 (Apr 9 TEST_MODE 추적)
- Vercel Audit Log 조회 (Apr 9 00:00~23:59 UTC, env 변경 이력)
- 노출 기간 (Apr 9~13) Supabase auth log + Drive API access log 검토
- 의심 활동 발견 시 Service Account 키 교체 + Supabase admin 비번 교체
- 결과 보고 형식: "정상" or "의심 케이스 N건 + 권장 조치"

### 🟡 2순위 — Phase 5.1 엑셀 행 높이 hotfix
PM 보고 (2026-04-13): "PDF 는 잘 나오는데 엑셀 행 높이 조금 문제"
조사:
- 어느 시트 어느 행인지 PM 에 1회 확인 (스크린샷 1장)
- 원인: Phase 5 가 batchUpdate 로 값만 주입하면서 일부 행이
  자동 높이 조정 안 되거나, /export 라우트가 여전히 구 xlsx 엔진
  사용해서 발생
조치:
- /export 가 generateMethodWorkbook 사용 → Phase 5 엔진과 분리
- 수정 후 PM PDF 1회 확인

### 🟢 3순위 — 기술부채
- xlsx 엔진 잔존 경로 (/export) Phase 5 통합 또는 deprecation
- PDF buffer stream 전환 (anyone reader 보안 절충 완전 해결)
- v7 §13 누적 부채 (TextInputBar, useEstimateVoice 죽은 반환 등)

---

## 차기 페이즈 후보
- 4.7: 불러오기 UI 개선
- 5.1: 엑셀 행 높이 hotfix (위 2순위)
- 5.2: xlsx 엔진 통합 (위 3순위)
- 5.3: PDF buffer stream 전환 (위 3순위)
- 6: edit 다중 을지 지원
- 7: 모바일/태블릿 반응형

---

## 절대 유지 (건드리지 말 것)
- Production env: TEST_MODE 미설정 유지 필수
- /api/stt, /api/tts, /api/llm
- Google Drive 인증 로직 (lib/gdrive/client.ts core)
- Supabase RLS 정책
- lib/voice/** 파싱 로직

---

## 이번 세션 완료 요약 (참고)

### main squash commits
- `d55bce1` — Hotfix/pdf landscape permission (#2)
- `c2b45f7` — Phase 5: Google Sheets 네이티브 템플릿 엔진 (#3)
- `2809bb5` — docs: NEXT_SESSION_HANDOFF_8 (초기)
- Production: `dpl_4porXuChkHErcZPGP1WfvqGcULS3` READY

### Phase 4.5 후 회귀 3건 해결
| # | 증상 | 해결 |
|---|---|---|
| [1] | PDF 세로 | hotfix c1 — docs.google.com/export portrait=false&scale=4 |
| [2] | 엑셀 서식 유실 | Phase 5 — 엔진 전환 |
| [3] | 구글 로그인 프롬프트 | hotfix c2 — ensureAnyoneReader |

### Phase 5 내부 회귀 4건 (UAT 반복으로 발견 → 즉시 fix)
| # | 증상 | 해결 커밋 |
|---|---|---|
| [1] | 을지 품명 wrap 미적용 | bef7f05 — repeatCell WRAP 강제 |
| [2] | 갑지 #NAME? | bef7f05 — toKoreanAmount 직접 주입 (NUMBERSTRING 미지원) |
| [3] | 특기사항 빨간 볼드 유실 | bef7f05 — updateCells RichText |
| [4] | 한글금액 vs 합계 100K 차이 | d71526c — M19/M20 정적 주입 (JS calc base 일치) |

### 교훈
- stale 캐시 가설 → 실제는 회계 룰 차이. 가설 검증 전 **실측 먼저**.
- UAT 반복 (4회) 이 회귀 조기 발견에 유효.
- PM 메시지 vs CC 보고 교차 시 현 상태 재확인 먼저.

---

🤖 Generated with Claude Code
