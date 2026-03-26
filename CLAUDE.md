# 방수명가 견적서 v4 — 종합 기획서

> **버전**: v1.1 (2026-03-26)
> **문서 목적**: 클로드 코드에서 구현할 때 이 문서 하나만 참조하면 됨.
> **스택**: Next.js 14 (App Router) + Supabase + Vercel + OpenAI (STT/TTS) + Claude (LLM)
> **GAS 의존**: 0% (완전 탈GAS)
> **설계 기준**: 사내 도구 → 상용화(SaaS/플랫폼) 확장 가능 구조
> **핵심 원칙**: 차량 내 핸즈프리 사용. 터치 0회가 목표. 옆에 조수가 탄 것처럼.

---

## 1. 프로젝트 배경 및 목적

### 1-1. 현재 시스템 (v1/v2/v3)

- **v1** (견적서.html, 6,688줄): React SPA, GAS HTML Service. 프리셋+자유입력, P매트릭스 기반 자동 단가, 옵션/장비/추가공종, 저장/불러오기/이메일. 기능 완전하나 GAS sandbox 제약.
- **v2** (견적서v2.html, 2,475줄): WYSIWYG 견적서. Figma 1:1 재현. 표지/복합/우레탄/비교 4탭. 인라인 편집. STT 데이터 자동 로드 시도했으나 CacheService 연결 불안정.
- **v3** (netlify/index.html, 344줄): Netlify 독립 음성 데이터 수집기. GAS 프록시 경유 STT/LLM. 12필드 추출. 동작하지만 v2 연결이 깨져있음.
- **핵심 문제**: v3→v2 데이터 전달이 GAS CacheService(100KB/5분 TTL) 의존으로 불안정. GAS sandbox 내 프론트엔드 개발 생산성 한계. google.script.run 비결정적 실패.

### 1-2. v4 목표

1. **음성 퍼스트**: 견적 데이터 입력/수정의 99%를 음성으로 처리. 차량 내 핸즈프리 사용.
2. **단일 앱**: 음성 수집 + 견적서 편집 + 저장/발송을 하나의 화면에서 완결. 별도 수집기 불필요.
3. **탈GAS**: Next.js + Supabase + Vercel로 완전 이전. GAS 의존 제로.
4. **상용화 확장**: 멀티테넌시(RLS), 인증(관리자/영업/고객), 과금 가능 구조.
5. **자연스러운 AI 비서**: TTS가 기계적이지 않고, 실제 조수처럼 대화하며 피드백.

### 1-3. v2 코드 재사용하지 않음

v2 코드는 사용하지 않는다. 이유:
- GAS HTML Service 내 `React.createElement` 직접 호출 (JSX 미사용)
- state 구조가 v4 DB 스키마와 불일치
- CacheService 의존 코드가 전체에 엮여 있음
- **Figma 디자인 시안만 참조**하고, UI 코드는 전부 새로 작성

---

## 2. v1 기능 분석 — 음성 전환 시 증감

### 2-1. 음성으로 완전 대체 → 수동 UI 제거

| v1 기능 | v1 UI | v4 음성 명령 | 수동 UI 필요 |
|---------|-------|-------------|------------|
| 공법 선택 | 라디오 버튼 | "복합방수" "둘 다" | ❌ 제거 |
| 면적 입력 | 텍스트 필드 | "150헤베" "50평" | ❌ 제거 |
| 옵션 토글 6개 | 체크박스 | "사다리차 이틀, 바탕미장 포함" | ❌ 제거 |
| 장비 일수 설정 | optConfig | "스카이 하루" | ❌ 제거 |
| 평단가 선택 | 칩 나열 | "평당 3만5천" 또는 자동 중간값 | ❌ 제거 |
| 기본정보 입력 | 텍스트 필드 | CRM 자동 유입 | ❌ 불필요 |
| 공종 추가 | 모달 + 자동완성 | "크랙보수 20미터 추가" | ❌ 제거 |
| 공종 삭제 | × 버튼 | "바탕정리 빼줘" | ❌ 제거 |
| 수량 변경 | 인라인 | "벽체 면적 30으로" | ❌ 제거 |
| 단가 변경 | 인라인 | "복합시트 재료비 5천원으로" | ❌ 제거 |
| 일괄 비율 조정 | 슬라이더 UI | "재료비 전체 10% 올려" | ❌ 제거 |
| 총액 역산 | 입력 필드 | "총액 600만원으로 맞춰줘" | ❌ 제거 |
| CRM 고객 검색 | 모달 | "김철수 고객 불러와" | ❌ 제거 |
| 불러오기 | 모달 | "어제 견적 불러와" | ❌ 제거 |
| 프리셋/자유입력 모드 전환 | 토글 | 통합. 음성이 자동 판단 | ❌ 제거 |
| 우레탄 0.5mm 동기화 토글 | 체크박스 | "동기화 해줘" 또는 설정에서 기본 ON | ❌ 제거 |
| 공종 숨김 (hidden) | 눈 아이콘 | "빼줘"로 삭제 | ❌ 제거 |
| 단가 잠금 (locked) | 잠금 아이콘 | 수정 이력 추적으로 대체 | ❌ 제거 |
| 메모/특이사항 | 텍스트 | "옥탑 포함, 누수 있음" | ❌ 제거 |

### 2-2. 음성 + 터치 병행 (수동 UI 유지)

| v1 기능 | 유지 이유 | v4 구현 |
|---------|----------|--------|
| 셀 단위 인라인 편집 | 미세 조정은 터치가 빠를 때 있음 | 셀 탭 → 숫자 키패드. 단, 음성으로도 가능 |
| 공종 순서 변경 | 시각적 확인 필요 | 드래그 또는 ↑↓. 음성: "바탕정리를 세번째로 옮겨" |
| 견적서 미리보기 (WYSIWYG) | 시각 확인 필수 | Figma 디자인 1:1 |
| 마진 게이지 | 실시간 시각 피드백 | sticky. 음성으로도 조회: "마진 얼마야?" |
| 복합/우레탄 탭 전환 | 비교 시 터치가 빠름 | 탭 UI. 음성: "우레탄 탭으로" |
| 저장 버튼 | 명시적 액션 | 버튼 + 음성: "저장해줘" |
| 이메일 발송 | 수신자 확인 | 폼 + 음성: "이메일 보내줘" |
| 규칙서/Config 편집 | 관리자 기능, 빈도 낮음 | 설정 페이지 (수동만) |

### 2-3. v4에서 새로 추가되는 기능

| 기능 | 설명 |
|------|------|
| **음성 상시 활성** | 견적서 화면에서 바로 음성 입력. 별도 수집기 없음 |
| **하드웨어 버튼 녹음** | 볼륨 버튼/블루투스 리모컨으로 녹음 토글. 화면 터치 불필요 |
| **웨이크워드** (2단계) | Web Speech API로 "견적"/"시작" 감지 → Whisper 녹음 시작 |
| **자연스러운 TTS** | OpenAI gpt-4o-mini-tts. 차분한 비서 톤. 기계적 느낌 제거 |
| **3단계 확신도 시스템** | 확신도에 따라 즉시실행/실행+확인/미실행+되묻기 분기 |
| **컨텍스트 유지 대화** | "그거 올려" → 직전 항목 참조. 매번 전체 명령 불필요 |
| **음성 피드백 루프** | 모든 명령 후 TTS로 결과+총액 변화 알려줌 |
| **다중 명령 체이닝** | "바탕정리 재료비 500 올리고 우레탄 상도 경비 빼줘" → 순차 실행 |
| **실행 취소 음성** | "취소" "되돌려" → 직전 명령 undo |
| **견적서 요약 읽기** | "현재 상태 알려줘" → TTS로 총액/공종수/마진율 |
| **비교 음성** | "복합 우레탄 비교해줘" → 비교탭 + TTS 요약 |
| **조건부 복제** | "지난번 이 현장 견적이랑 같은 조건으로" → 과거 견적 복제 |
| **동기화 피드백** | "동기화 완료. 복합 평단가가 X원 낮아졌습니다." |
| **서버 실시간 저장** | Supabase에 편집 즉시 저장. sessionStorage 불필요 |
| **수정 이력** | 모든 변경을 DB에 기록 |
| **견적서 버전 관리** | 같은 고객 복수 견적서 비교 |
| **인증/권한** | 관리자(전체), 영업사원(자기 견적만), 고객(열람만) |

---

## 3. 아키텍처

### 3-1. 기술 스택

```
프론트엔드:  Next.js 14 (App Router) + TypeScript + Tailwind CSS
배포:       Vercel (자동 배포, Edge Network, 서버리스)
DB/인증:    Supabase (PostgreSQL + Auth + Storage + Realtime)
STT:       OpenAI Whisper API (gpt-4o-transcribe) — 음성→텍스트
LLM:       Anthropic Claude Sonnet — 명령 파싱/데이터 추출
TTS:       OpenAI gpt-4o-mini-tts — 자연스러운 한국어 음성 응답
이메일:     Resend (커스텀 도메인, 열람 추적)
엑셀:      ExcelJS (서버리스에서 .xlsx 생성)
PDF:       @react-pdf/renderer 또는 puppeteer-core
파일저장:   Supabase Storage (S3 호환, CDN)
```

**STT/TTS에 OpenAI, LLM에 Claude를 쓰는 이유:**
- OpenAI: STT(Whisper)와 TTS는 업계 최고. Claude에는 STT/TTS API가 없음
- Claude: 구조화 데이터 파싱 정확도가 GPT-4o-mini보다 높음. 복합 명령 해석에 유리

### 3-2. 시스템 구조

```
┌───────────────────────────────────────────────────────────┐
│  Vercel (Next.js App)                                     │
│                                                           │
│  /app                                                     │
│    /estimate/[id]/page.tsx    ← 견적서 메인 (음성+편집)    │
│    /estimates/page.tsx        ← 견적서 목록                │
│    /crm/page.tsx              ← CRM (추후)                │
│    /dashboard/page.tsx        ← 대시보드 (추후)            │
│    /settings/page.tsx         ← 규칙서/Config              │
│    /login/page.tsx            ← 로그인                     │
│                                                           │
│  /app/api                                                 │
│    /stt/route.ts              ← OpenAI Whisper 프록시     │
│    /llm/route.ts              ← Claude Sonnet 파싱        │
│    /tts/route.ts              ← OpenAI TTS 프록시         │
│    /estimate/save/route.ts    ← 엑셀+PDF 생성, Storage 저장│
│    /email/send/route.ts       ← Resend 이메일 발송        │
│    /cron/daily/route.ts       ← 후속 알림 (Vercel Cron)   │
│                                                           │
└─────────────────┬─────────────────────────────────────────┘
                  │
                  ▼
┌───────────────────────────────────────────────────────────┐
│  Supabase                                                 │
│                                                           │
│  PostgreSQL:                                              │
│    companies          ← 멀티테넌시 (업체)                  │
│    users              ← 인증+역할 (admin/sales/customer)  │
│    customers          ← CRM 고객 (Notion 대체)            │
│    estimates          ← 견적서 메타데이터                   │
│    estimate_sheets    ← 복합/우레탄 시트                   │
│    estimate_items     ← 견적서 공종 행                     │
│    estimate_versions  ← 견적서 버전 이력                   │
│    price_matrix       ← P매트릭스 (면적대×공법×평단가)     │
│    presets            ← 프리셋 공종 (acDB 포함)            │
│    cost_config        ← 원가 테이블                       │
│    voice_sessions     ← 음성 세션 (parsed 데이터)         │
│    email_tracking     ← 이메일 발송/열람 추적              │
│                                                           │
│  Auth:     이메일/카카오 로그인, RLS 정책                   │
│  Storage:  견적서 엑셀/PDF, 제안서 PDF                     │
│  Realtime: 견적서 편집 실시간 동기화 (추후)                 │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### 3-3. 데이터 흐름

```
[음성 입력]
유저 마이크 활성화 (볼륨 버튼 / 웨이크워드 / 화면 탭)
→ MediaRecorder (webm/opus)
→ POST /api/stt (Vercel 서버리스 → OpenAI Whisper) → 텍스트
→ POST /api/llm (Vercel 서버리스 → Claude Sonnet) → 구조화 JSON + confidence
→ 확신도 분기:
   [95%+] 즉시 실행 → state 반영 → TTS 결과 알림
   [70-95%] 즉시 실행 → state 반영 → TTS 결과 + "맞습니까?"
   [70%-] 미실행 → TTS 되묻기
→ Supabase estimates/estimate_items upsert (실시간 저장)

[수동 편집]
셀 탭 → 인라인 편집 → blur
→ state 업데이트 → 금액 재계산
→ Supabase upsert (디바운스 1초)

[저장/발송]
"저장해줘" 또는 저장 버튼
→ POST /api/estimate/save
→ ExcelJS로 .xlsx 생성
→ PDF 변환
→ Supabase Storage 업로드
→ estimates 테이블 상태 업데이트 (saved)
→ TTS: "저장 완료. 관리번호 BS-260326-A3K7."
```

---

## 4. 음성 시스템 설계

### 4-1. 음성 모드

| 모드 | 트리거 | AI 역할 | 출력 |
|------|--------|---------|------|
| **extract** | 새 견적 + 첫 발화 | 12필드 추출 | parsed JSON |
| **supplement** | 빠진 필드 추가 발화 | 기존 parsed에 merge | partial JSON |
| **modify** | 견적서 편집 중 발화 | 수정 명령 배열 + confidence | commands[] |
| **command** | 시스템 명령 | 액션 분류 | {action: save/email/load/...} |

### 4-2. modify 모드 — 음성으로 가능한 모든 조작

```
[단가 변경 — 절대값]
"복합시트 재료비 5천원으로"
→ {action: "update_item", target: "복합 시트", field: "mat", value: 5000, confidence: 0.97}

[단가 변경 — 증감]
"바탕정리 재료비 100원 올려"
→ {action: "update_item", target: "바탕정리", field: "mat", delta: +100, confidence: 0.96}

[다중 명령]
"바탕정리 자재비 100원 올리고 우레탄 1차 인건비 500원 올려"
→ [
    {action: "update_item", target: "바탕정리", field: "mat", delta: +100, confidence: 0.95},
    {action: "update_item", target: "노출 우레탄 1차", field: "labor", delta: +500, confidence: 0.94}
  ]

[공종 추가]
"크랙보수 20미터 추가"
→ {action: "add_item", name: "크랙보수", unit: "m", qty: 20, confidence: 0.96}

[공종 삭제]
"바탕정리 빼줘"
→ {action: "remove_item", target: "바탕정리", confidence: 0.98}

[일괄 조정]
"재료비 전체 10% 올려"
→ {action: "bulk_adjust", category: "mat", percent: 10, confidence: 0.95}

[총액 역산]
"총액 600만원으로 맞춰줘"
→ {action: "set_grand_total", value: 6000000, confidence: 0.97}

[메타 수정]
"면적 200으로 변경"
→ {action: "update_meta", field: "m2", value: 200, confidence: 0.98}

[순서 변경]
"바탕정리를 세번째로 옮겨"
→ {action: "reorder_item", target: "바탕정리", position: 3, confidence: 0.90}

[동기화]
"우레탄 동기화 해줘"
→ {action: "sync_urethane_05", confidence: 0.95}

[시스템 명령]
"저장해줘" → {action: "save"}
"이메일 보내줘" → {action: "email"}
"어제 김철수 견적 불러와" → {action: "load", query: "김철수", date: "yesterday"}
"복합 우레탄 비교해줘" → {action: "compare"}
"우레탄 탭으로" → {action: "switch_tab", tab: "urethane"}
"현재 상태 알려줘" → {action: "read_summary"}
"취소" → {action: "undo"}
"마진 얼마야?" → {action: "read_margin"}
```

### 4-3. 3단계 확신도 시스템

```
[높은 확신 95%+] → 즉시 실행 + 결과만 알림
  예: "복합방수 150헤베"
  TTS: "복합방수 백오십제곱미터 반영."

[중간 확신 70-95%] → 즉시 실행 + 되묻기
  예: "사다리차 이틀"
  TTS: "사다리차 이틀, 단가 십이만원 기본 적용. 맞습니까?"
  유저: "응" → 확정  /  "아니 15만원" → 수정

[낮은 확신 70%-] → 미실행 + 되묻기
  예: "그거 좀 올려줘"
  TTS: "어떤 항목 말씀이세요?"
```

**되묻기 규칙:**
- 연속 2회 이상 되묻지 않는다. 2회 물어도 해결 안 되면 포기.
- "아 됐어" "취소" 등 중단 신호 감지 시 즉시 중단.

**LLM 출력 형식:**
```json
{
  "commands": [
    {
      "action": "update_item",
      "target": "사다리차",
      "field": "qty",
      "value": 2,
      "confidence": 0.97
    }
  ],
  "clarification_needed": null,
  "tts_response": "사다리차 이틀 반영. 이십사만원."
}
```

confidence가 0.7 미만이면 commands는 빈 배열, clarification_needed에 되묻기 문장.

### 4-4. 컨텍스트 유지 대화

LLM에 직전 3개 명령을 컨텍스트로 제공:

```
유저: "바탕정리 재료비 300원 올려"
→ 실행. context: [{target: "바탕정리", field: "mat", delta: +300}]

유저: "인건비도 200원 올려"
→ context에서 "바탕정리" 유추 → 바탕정리 인건비 +200

유저: "복합시트도 같이"
→ context에서 "인건비 200원" 유추 → 복합시트 인건비 +200
```

### 4-5. TTS 설계

**서비스:** OpenAI gpt-4o-mini-tts

**시스템 프롬프트:**
```
당신은 방수 시공 업체의 유능한 견적 보조원입니다.
차분하고 간결하게 말합니다.
숫자는 명확하게, 불필요한 수식어 없이.
'~입니다' 체가 아닌, '~했습니다' '~반영.' 같은 짧은 어미를 씁니다.
금액은 만원 단위로 읽습니다. 예: 3,900,000 → "삼백구십만원"
항목명은 그대로 읽습니다. 줄임 없이.
```

**피드백 패턴:**

| 상황 | TTS 응답 |
|------|---------|
| 데이터 입력 | "복합방수 백오십제곱미터, 사다리차 이틀 반영. 총액 오백팔십만원." |
| 빠진 필드 | "누수 유무, 옥탑 포함 여부 말씀해주시면 완성됩니다." |
| 미세 수정 | "바탕정리 재료비 삼백원에서 사백원으로. 총액 오백팔십이만원." |
| 동기화 | "우레탄 영점오밀리 동기화 완료. 복합 평단가가 이천원 낮아졌습니다." |
| 저장 | "저장 완료. 관리번호 BS-260326-A3K7." |
| 이메일 | "kim@email.com으로 발송합니다. 보낼까요?" |
| 요약 | "복합방수 백오십헤베, 공종 열개, 총액 오백팔십만원, 마진 오십이퍼센트." |
| 비교 | "복합 오백팔십만 마진 오십이, 우레탄 사백이십만 마진 사십팔. 복합이 백육십만원 높음." |
| 오류 | "어떤 항목 말씀이세요?" |
| 포기 | "알겠습니다." |

### 4-6. 음성 활성화 방식 (3단계)

| 단계 | 방식 | 구현 시기 |
|------|------|----------|
| **1단계** | 하드웨어 버튼 (볼륨 버튼 / 블루투스 리모컨) | Phase 3 즉시 |
| **2단계** | Web Speech API 웨이크워드 ("견적" / "시작") | Phase 3 직후 |
| **3단계** | Picovoice Porcupine 커스텀 웨이크워드 ("방수명가") | 추후 |

1단계 구현:
```typescript
// PWA에서 볼륨 버튼 감지
document.addEventListener('keydown', (e) => {
  if (e.key === 'VolumeUp' || e.key === 'VolumeDown') {
    e.preventDefault();
    toggleRecording();
  }
});
```

### 4-7. LLM 시스템 프롬프트

**extract 모드:**
```
당신은 방수 시공 견적서 데이터 추출기입니다.
사용자의 자유 발화에서 아래 필드를 JSON으로 추출하세요.
언급되지 않은 필드는 null로 두세요. 추측하지 마세요.

필드:
- method: 공법 ("복합"|"우레탄"|"복합+우레탄"|"주차장고경질"|...)
- area: 면적 숫자 (m² 단위. "헤베"="㎡" 그대로. "평"만 x3.306. 예: "100헤베"→100, "50평"→165.3)
- leak: 누수 유무 (true|false|null)
- rooftop: 옥탑 포함 (true|false|null)
- plaster: 바탕조정제 미장 (true|false|null)
- elevator: 엘리베이터 유무 (true|false|null)
- ladder: 사다리차 {days:숫자, unitPrice?:숫자} 또는 null
- sky: 스카이차 {days:숫자, unitPrice?:숫자} 또는 null
- dryvit: 드라이비트 절개 (true|false|null)
- waste: 폐기물 {days:숫자, unitPrice?:숫자} 또는 null
- deadline: 견적 전달일 (텍스트|null)
- notes: 특이사항 (텍스트|null)

JSON만 출력. 설명 없이. 마크다운 백틱 없이.
```

**modify 모드:**
```
당신은 방수 견적서 편집 명령 파서입니다.

현재 견적서 상태:
{estimate_context}

직전 3개 명령:
{recent_commands}

사용자의 수정 요청을 JSON으로 파싱하세요.

출력 형식:
{
  "commands": [{action, target?, field?, value?, delta?, confidence}],
  "clarification_needed": "되묻기 문장" | null,
  "tts_response": "TTS로 읽을 결과 요약"
}

가능한 action:
- update_item: 공종 필드 수정 {target, field, value 또는 delta, confidence}
- add_item: 공종 추가 {name, spec?, unit, qty?, confidence}
- remove_item: 공종 삭제 {target, confidence}
- bulk_adjust: 일괄 비율 {category: "mat"|"labor"|"exp"|"all", percent, confidence}
- set_grand_total: 총액 역산 {value, confidence}
- update_meta: 메타 수정 {field, value, confidence}
- reorder_item: 순서 변경 {target, position, confidence}
- sync_urethane_05: 동기화 {confidence}
- save, email, load, compare, switch_tab, read_summary, undo, read_margin

"으로" = 절대값(value). "올려/내려" = 증감(delta).
헤베 = m². "평"만 x3.306.
확신 없으면 commands를 비우고 clarification_needed에 되묻기.
JSON만 출력.
```

---

## 5. 데이터베이스 스키마

### 5-1. companies

```sql
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_number text,
  ceo_name text,
  address text,
  phone text,
  email text,
  logo_url text,
  created_at timestamptz default now()
);
```

### 5-2. users

```sql
create table users (
  id uuid primary key references auth.users(id),
  company_id uuid references companies(id),
  name text not null,
  phone text,
  role text not null default 'sales',  -- 'admin' | 'sales' | 'customer'
  created_at timestamptz default now()
);
```

### 5-3. customers

```sql
create table customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) not null,
  name text not null,
  address text,
  phone text,
  email text,
  manager_id uuid references users(id),
  pipeline text default '문의',
  contract_status text,
  inquiry_channel text,
  work_types text[],
  estimate_amount bigint,
  contract_amount bigint,
  area_pyeong numeric,
  memo text,
  inquiry_date date,
  visit_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 5-4. estimates

```sql
create table estimates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) not null,
  customer_id uuid references customers(id),
  created_by uuid references users(id),
  mgmt_no text,
  status text default 'draft',  -- draft | saved | sent | viewed
  date date default current_date,
  customer_name text,
  site_name text,
  m2 numeric default 0,
  wall_m2 numeric default 0,
  manager_name text,
  manager_phone text,
  memo text,
  excel_url text,
  pdf_url text,
  folder_path text,
  email_sent_at timestamptz,
  email_viewed_at timestamptz,
  email_to text,
  voice_session_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 5-5. estimate_sheets

```sql
create table estimate_sheets (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid references estimates(id) on delete cascade,
  type text not null,  -- '복합' | '우레탄'
  title text,
  plan text,
  price_per_pyeong integer default 0,
  warranty_years integer default 5,
  warranty_bond integer default 3,
  grand_total bigint default 0,
  sort_order integer default 0,
  created_at timestamptz default now()
);
```

### 5-6. estimate_items

```sql
create table estimate_items (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid references estimate_sheets(id) on delete cascade,
  sort_order integer not null,
  name text not null,
  spec text default '',
  unit text default 'm²',
  qty numeric default 0,
  mat integer default 0,
  labor integer default 0,
  exp integer default 0,
  mat_amount bigint default 0,
  labor_amount bigint default 0,
  exp_amount bigint default 0,
  total bigint default 0,
  is_base boolean default true,
  is_equipment boolean default false,
  is_fixed_qty boolean default false,
  created_at timestamptz default now()
);
```

### 5-7. price_matrix

```sql
create table price_matrix (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) not null,
  area_range text not null,
  method text not null,
  price_per_pyeong integer not null,
  item_index integer not null,
  mat numeric default 0,
  labor numeric default 0,
  exp numeric default 0,
  unique(company_id, area_range, method, price_per_pyeong, item_index)
);
```

### 5-8. presets

```sql
create table presets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) not null,
  name text not null,
  spec text default '',
  unit text default 'm²',
  mat integer default 0,
  labor integer default 0,
  exp integer default 0,
  category text default 'custom',
  used_count integer default 0,
  last_used date,
  created_at timestamptz default now()
);
```

### 5-9. voice_sessions

```sql
create table voice_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id),
  created_by uuid references users(id),
  customer_id uuid references customers(id),
  status text default 'collecting',
  parsed_data jsonb default '{}',
  raw_texts text[] default '{}',
  command_history jsonb[] default '{}',  -- 명령 이력 (컨텍스트 유지용)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 5-10. cost_config

```sql
create table cost_config (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) not null unique,
  config jsonb not null,
  updated_at timestamptz default now()
);
```

### 5-11. estimate_changes (수정 이력)

```sql
create table estimate_changes (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid references estimates(id) on delete cascade,
  changed_by uuid references users(id),
  change_type text not null,  -- 'voice' | 'manual' | 'auto'
  change_data jsonb not null,  -- {action, target, field, before, after}
  created_at timestamptz default now()
);
```

### 5-12. RLS 정책

```sql
alter table estimates enable row level security;
create policy "company_isolation" on estimates
  using (company_id = (select company_id from users where id = auth.uid()));

create policy "sales_own_estimates" on estimates
  for all using (
    created_by = auth.uid()
    or (select role from users where id = auth.uid()) = 'admin'
  );

-- 모든 테이블에 동일 패턴 적용
```

---

## 6. UI 설계

### 6-1. 화면 구조

```
┌──────────────────────────────────────────────┐
│ [← CRM] 방수명가 견적서    [불러오기] [⚙설정] │  헤더
├──────────────────────────────────────────────┤
│ [표지] [복합] [우레탄] [비교]                  │  탭 바
├──────────────────────────────────────────────┤
│                                              │
│  ┌─ 복합 탭 ──────────────────────────────┐  │
│  │ 면적: 150m²  벽체: 0m²                 │  │
│  │ 평단가: 35,000원  마진: [██████░] 52%  │  │
│  │                                        │  │
│  │ ┌──┬────┬────┬──┬──┬───┬───┬───┬───┐  │  │
│  │ │# │품명│규격│단위│수량│재료│노무│경비│금액│  │  │
│  │ ├──┼────┼────┼──┼──┼───┼───┼───┼───┤  │  │
│  │ │1 │바탕│    │m²│150│300│1.2k│  0│225k│  │  │
│  │ │..│... │... │..│..│...│... │...│... │  │  │
│  │ ├──┴────┴────┴──┴──┴───┴───┴───┴───┤  │  │
│  │ │ 소계                    3,600,000  │  │  │
│  │ │ 공과잡비 3%               108,000  │  │  │
│  │ │ 기업이윤 6%               216,000  │  │  │
│  │ │ 계                      3,924,000  │  │  │
│  │ │ 합계(10만절사)           3,900,000  │  │  │
│  │ └──────────────────────────────────┘  │  │
│  └────────────────────────────────────────┘  │
│                                              │
├──────────────────────────────────────────────┤
│  🎤 탭하여 말하기              [저장] [이메일] │  음성 바
│  ── 또는 볼륨 버튼 / "견적" ──                │  (항상 하단 고정)
└──────────────────────────────────────────────┘
```

### 6-2. Figma 연동

- v2 Figma fileKey: `OLxyy4grM15JV5dvQcuHF6`
- 클로드 코드에서 Figma MCP `get_design_context` → 디자인 토큰 추출 → Tailwind 매핑
- 견적서 테이블은 기존 엑셀 견적서 레이아웃 1:1 재현
- **현실:** 80-90% 자동 추출. 간격/폰트 미세 조정은 2-3회 피드백 필요

### 6-3. 반응형

- 기본 타겟: 갤럭시탭 S10 FE (1200×800)
- 모바일: 480px 이하
- 데스크탑: 1320px 이상 (추후)

---

## 7. API Routes

### 7-1. 음성

```
POST /api/stt
  Body: { audio: base64, prompt: string }
  → OpenAI Whisper → { text: string }

POST /api/llm
  Body: { system: string, user: string, context?: object }
  → Claude Sonnet → { commands: [], clarification_needed, tts_response }

POST /api/tts
  Body: { text: string }
  → OpenAI gpt-4o-mini-tts → audio/mpeg stream
```

### 7-2. 견적서 CRUD

```
GET    /api/estimates              → 목록
POST   /api/estimates              → 생성
GET    /api/estimates/[id]         → 조회 (sheets + items)
PATCH  /api/estimates/[id]         → 메타 수정
DELETE /api/estimates/[id]         → 삭제

POST   /api/estimates/[id]/sheets            → sheet 추가
PATCH  /api/estimates/[id]/sheets/[sheetId]  → sheet 수정
POST   /api/estimates/[id]/items             → item 추가
PATCH  /api/estimates/[id]/items/[itemId]    → item 수정
DELETE /api/estimates/[id]/items/[itemId]    → item 삭제
```

### 7-3. 파일 생성/발송

```
POST /api/estimates/[id]/generate  → 엑셀+PDF → Storage
POST /api/estimates/[id]/email     → Resend 발송 + 추적픽셀
```

### 7-4. 가격/설정

```
GET/POST /api/price-matrix
GET/POST /api/presets
GET/POST /api/cost-config
```

---

## 8. 비즈니스 로직 이식

### 8-1. v1 → v4 함수 매핑

| v1 원본 (파일:라인) | v4 위치 | 비고 |
|-------------------|---------|------|
| 견적서.html L48-161: COMPLEX_BASE, URETHANE_BASE | `lib/estimate/constants.ts` | 타입 포함 |
| 견적서.html L162-186: fm, n2k | `lib/utils/format.ts` | |
| 견적서.html L187: getAR | `lib/estimate/areaRange.ts` | |
| 견적서.html L188-220: getPD (보간) | `lib/estimate/priceData.ts` | |
| 견적서.html L241-258: lerpArr | `lib/utils/lerp.ts` | |
| 견적서.html L259-281: getCostPerM2 | `lib/estimate/cost.ts` | |
| 견적서.html L282-292: getMargin | `lib/estimate/margin.ts` | |
| 견적서.html L293: r100 | `lib/utils/format.ts` | |
| 견적서.html L294-390: PRESETS_DEFAULT | Supabase `presets` seed | |
| 견적서.html L392-534: buildItems | `lib/estimate/buildItems.ts` | 핵심 |
| 견적서.html L535-575: applyUnitOver | `lib/estimate/applyOverrides.ts` | |
| 견적서.html L1559-1571: calc | `lib/estimate/calc.ts` | 소계→잡비→이윤→절사 |
| Code.js L3390-3551: stt_convertToEstimate | `lib/voice/convertToEstimate.ts` | parsed→estimate |
| index.html L118-121: 프롬프트들 | `lib/voice/prompts.ts` | Claude용으로 수정 |
| Code.js est_handleSave | `lib/excel/generateWorkbook.ts` | ExcelJS |
| Code.js email_sendEstimate | `lib/email/sendEstimate.ts` | Resend |

### 8-2. P매트릭스 마이그레이션

```
1. GAS 편집기에서 실행: Logger.log(JSON.stringify(est_getPriceData()))
2. 로그 복사 → seed 파일에 붙여넣기
3. 클로드 코드가 Supabase price_matrix에 insert하는 seed 스크립트 생성
```

---

## 9. 프로젝트 구조

```
bsmg-v4/
├── app/
│   ├── layout.tsx
│   ├── login/page.tsx
│   ├── (authenticated)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── estimates/page.tsx
│   │   ├── estimate/
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx        ← 메인 (음성+편집)
│   │   ├── crm/page.tsx
│   │   └── settings/page.tsx
│   └── api/
│       ├── stt/route.ts
│       ├── llm/route.ts
│       ├── tts/route.ts
│       ├── estimates/...
│       ├── price-matrix/route.ts
│       ├── presets/route.ts
│       ├── cost-config/route.ts
│       └── cron/daily/route.ts
├── components/
│   ├── estimate/
│   │   ├── EstimateEditor.tsx
│   │   ├── CoverSheet.tsx
│   │   ├── WorkSheet.tsx
│   │   ├── CompareSheet.tsx
│   │   ├── MarginGauge.tsx
│   │   ├── InlineCell.tsx
│   │   └── TabBar.tsx
│   ├── voice/
│   │   ├── VoiceBar.tsx
│   │   ├── VoiceStatus.tsx
│   │   └── FieldChecklist.tsx
│   ├── ui/
│   └── layout/
│       ├── Sidebar.tsx
│       └── Header.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── estimate/
│   │   ├── buildItems.ts
│   │   ├── applyOverrides.ts
│   │   ├── calc.ts
│   │   ├── cost.ts
│   │   ├── margin.ts
│   │   ├── areaRange.ts
│   │   ├── priceData.ts
│   │   ├── constants.ts
│   │   └── types.ts
│   ├── voice/
│   │   ├── convertToEstimate.ts
│   │   ├── prompts.ts
│   │   ├── commands.ts
│   │   └── confidenceRouter.ts      ← 3단계 확신도 분기
│   ├── excel/
│   │   └── generateWorkbook.ts
│   ├── pdf/
│   │   └── generatePdf.ts
│   ├── email/
│   │   └── sendEstimate.ts
│   └── utils/
│       ├── format.ts
│       ├── lerp.ts
│       └── numberToKorean.ts
├── hooks/
│   ├── useVoice.ts                  ← 녹음+STT+LLM+TTS 통합
│   ├── useEstimate.ts               ← 견적서 state 관리
│   ├── useAutoSave.ts               ← Supabase 실시간 저장
│   └── useWakeWord.ts               ← 웨이크워드 감지
├── types/
│   └── index.ts
├── supabase/
│   ├── migrations/
│   └── seed.ts
├── public/
│   └── icons/
├── .env.local
├── next.config.ts
├── tailwind.config.ts
└── vercel.json
```

---

## 10. 구현 순서

### Phase 1: 기반 셋업 (1-2일)

```
1. Next.js 프로젝트 생성 (create-next-app --typescript --tailwind)
2. Supabase 프로젝트 생성 + 스키마 마이그레이션
3. Supabase Auth (이메일 로그인)
4. Vercel 배포 연결
5. 환경변수 (.env.local + Vercel)
6. 로그인 페이지 + 미들웨어
```

### Phase 2: 비즈니스 로직 이식 (2-3일)

```
1. lib/estimate/* — v1 핵심 함수 TypeScript 변환
2. P매트릭스/프리셋/acDB/원가 → Supabase seed
3. API routes: /api/estimates CRUD
4. API routes: /api/price-matrix, /api/presets, /api/cost-config
```

### Phase 3: 음성 시스템 (3-4일)

```
1. /api/stt — OpenAI Whisper
2. /api/llm — Claude Sonnet (extract/supplement/modify/command)
3. /api/tts — OpenAI gpt-4o-mini-tts
4. lib/voice/prompts.ts — 4개 모드 프롬프트
5. lib/voice/commands.ts — 명령 실행기
6. lib/voice/confidenceRouter.ts — 3단계 확신도
7. hooks/useVoice.ts — 녹음+STT+LLM+TTS+확신도 통합
8. hooks/useWakeWord.ts — 하드웨어 버튼 + Web Speech API
9. VoiceBar 컴포넌트 — 하단 고정 바
10. 컨텍스트 유지 대화 (직전 3개 명령 추적)
```

### Phase 4: 견적서 UI (3-5일)

```
1. Figma MCP 디자인 토큰 추출
2. EstimateEditor 메인 컴포넌트
3. CoverSheet (표지)
4. WorkSheet (공종 테이블 + 인라인 편집)
5. CompareSheet (비교)
6. MarginGauge (마진 게이지)
7. TabBar
8. hooks/useEstimate.ts — state 관리
9. hooks/useAutoSave.ts — Supabase 실시간 저장
10. 음성 피드백 연동 (동기화 피드백 등)
```

### Phase 5: 파일 생성/발송 (2-3일)

```
1. lib/excel/generateWorkbook.ts — ExcelJS
2. lib/pdf/generatePdf.ts
3. /api/estimates/[id]/generate
4. lib/email/sendEstimate.ts — Resend
5. /api/estimates/[id]/email
```

### Phase 6: CRM + 마이그레이션 (2-3일)

```
1. Notion CRM → Supabase customers (1회)
2. 견적서 목록 페이지
3. CRM 연동 (고객→견적서 자동채움)
4. 기존 GAS 앱 사이드바에 v4 링크
```

### Phase 7: 안정화 + PWA (1-2일)

```
1. PWA manifest + 아이콘
2. 오프라인 대비
3. 엔드투엔드 테스트
4. 음성 정확도 튜닝
```

**총 예상: 14-22일. 클로드 코드 초보자 기준 3-4주.**

---

## 11. 현실적 한계 및 대응

### 11-1. 음성 인식 오류율

| 환경 | STT 정확도 | LLM 파싱 | 체감 성공률 |
|------|-----------|---------|-----------|
| 조용한 사무실 | 95-98% | 95-99% | 93-97% |
| 차량 내 (창문 닫힘) | 90-95% | 90-95% | 85-93% |
| 차량 내 (창문 열림) | 75-85% | 85-90% | 65-80% |

**대응**: TTS 확인 루프 + 실행취소. 0%는 불가능하지만 "틀려도 3초 안에 잡는다"가 목표.

### 11-2. 개발 환경 셋업

비개발자가 해야 하는 작업이 "클릭만"은 아님. 터미널 명령어 복붙 + 에러 대응 필요.
클로드 코드가 명령어를 제시하면 그대로 실행하는 수준.

### 11-3. Figma 1:1

80-90% 자동. 미세 조정(간격, 폰트)은 2-3회 "여기 좀 바꿔" 피드백 필요.

### 11-4. 엑셀 생성

ExcelJS로 기존 GAS Sheets 템플릿 레이아웃 재현에 2-3일. 셀 서식/병합/테두리 매핑 작업.

---

## 12. 비개발자 셋업 가이드

### 12-1. 1회성 셋업 (총 30-40분)

| # | 할 일 | 방법 | 난이도 |
|---|------|------|--------|
| 1 | **Node.js 설치** | nodejs.org → LTS 다운로드 → 설치 (다음,다음,완료) | 쉬움 |
| 2 | **Git 설치** | git-scm.com 다운로드 또는 GitHub Desktop 설치 | 쉬움 |
| 3 | **클로드 코드 설치** | 터미널에서 `npm install -g @anthropic-ai/claude-code` | 중간 (명령어) |
| 4 | **Supabase 프로젝트 생성** | supabase.com → New Project | 쉬움 (클릭) |
| 5 | **Vercel 프로젝트 생성** | vercel.com → GitHub 연결 → Import | 쉬움 (클릭) |
| 6 | **OpenAI API Key** | platform.openai.com → API Keys | 쉬움 (클릭) |
| 7 | **Anthropic API Key** | console.anthropic.com → API Keys | 쉬움 (클릭) |
| 8 | **Resend API Key** | resend.com → API Keys | 쉬움 (클릭) |
| 9 | **환경변수 설정** | Vercel Settings → Environment Variables에 키 붙여넣기 | 쉬움 (복붙) |

### 12-2. 환경변수 목록

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
RESEND_API_KEY=re_...
```

### 12-3. GAS에서 데이터 추출 (10분)

| # | 할 일 | 방법 |
|---|------|------|
| 1 | P매트릭스 | GAS 편집기 → `Logger.log(JSON.stringify(est_getPriceData()))` 실행 → 로그 복사 |
| 2 | 규칙서 | GAS에서 `loadRules` 실행 → JSON 복사 |
| 3 | CRM (선택) | Notion → CSV export |

### 12-4. 개발 중 역할

| 너 | 클로드 코드 |
|----|-----------|
| Figma 링크 전달 | 디자인 추출 + UI 구현 |
| "이 기능 추가해줘" 지시 | 코드 작성 + 배포 |
| 터미널에서 명령어 복붙 | 명령어 제시 |
| 태블릿/핸드폰 테스트 | 버그 수정 |
| 음성 테스트 | 프롬프트 튜닝 |
| 에러 메시지 복사+전달 | 에러 해결 |

---

## 13. GAS 공존 계획

v4는 견적서만 먼저 분리. 나머지는 GAS 유지.

```
GAS (기존 유지):
  Home.html, CRM.html, 캘린더.html, 정산.html, 제안서.html, 계약참조.html
  → CRM 사이드바에 v4 견적서 링크 추가

v4 (Vercel):
  견적서 (음성+편집+저장+이메일) + 견적서 목록
```

---

## 14. 추후 확장 (상용화)

| 단계 | 내용 | 시기 |
|------|------|------|
| **Phase A** | v4 견적서 사내 안정화 | 현재 |
| **Phase B** | CRM/대시보드/캘린더/정산 Supabase 이관 | 2-3개월 후 |
| **Phase C** | 제안서 자동 작성 (LLM 텍스트 생성 + 템플릿) | Phase B 후 |
| **Phase D** | 멀티테넌시 + 구독 과금 + 온보딩 | Phase C 후 |
| **Phase E** | 플랫폼 (고객 요청서 → 전문가 매칭) | Phase D 후 |

---

## 15. 절대 규칙

1. **GAS 코드 수정 금지** — v4는 GAS와 완전 독립.
2. **음성이 먼저** — 모든 입력/수정은 음성으로 가능해야 한다. 수동 UI는 보조.
3. **Figma 디자인 참조** — v2 코드가 아닌 Figma 시안 기준으로 UI 구현.
4. **TypeScript strict** — any 금지.
5. **컴포넌트 분리** — 파일당 200줄 이내.
6. **RLS 필수** — 모든 테이블에 company_id 기반 격리.
7. **환경변수** — API 키 하드코딩 금지.
8. **TTS 피드백** — 모든 음성 명령에 자연스러운 TTS 응답.
9. **되묻기 2회 제한** — 연속 3회 이상 되묻지 않는다.
10. **v2 코드 재사용 금지** — Figma 디자인만 참조.

---

## 16. 참조 파일

| 파일 | 이식 대상 | 비고 |
|------|----------|------|
| 견적서.html L48-161 | COMPLEX_BASE, URETHANE_BASE | constants.ts |
| 견적서.html L162-293 | fm, n2k, getAR, getPD, lerpArr, getCostPerM2, getMargin, r100 | lib/* |
| 견적서.html L294-390 | PRESETS_DEFAULT | Supabase seed |
| 견적서.html L392-575 | buildItems, applyUnitOver | lib/estimate/ |
| 견적서.html L1559-1571 | calc | lib/estimate/calc.ts |
| Code.js L3390-3551 | stt_convertToEstimate | lib/voice/ |
| index.html L118-121 | STT_PROMPT, EXTRACT_SYSTEM 등 | lib/voice/prompts.ts |

---

*v4 종합 기획서 v1.1 | 2026-03-26*
