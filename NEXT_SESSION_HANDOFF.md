# Phase 3-B 세션 핸드오프

> Phase 3-A 완료 후 작성. 다음 세션(Phase 3-B)이 바로 시작할 수 있도록.

---

## 직전 커밋

- 해시: (커밋 후 갱신)
- 브랜치: `main`
- 기준일: 2026-04-12

---

## 3-A에서 변경/신설/삭제된 파일

### 신규
| 파일 | 용도 |
|---|---|
| `templates/complex.xlsx` | 복합방수 XLSX 템플릿 |
| `templates/urethane.xlsx` | 우레탄방수 XLSX 템플릿 |
| `lib/excel/generateMethodWorkbook.ts` | 공법별 단일 XLSX 주입 엔진 (동적 행 삭제/삽입, 수식 보존) |
| `app/api/estimates/[id]/export/route.ts` | `POST /api/estimates/[id]/export` — XLSX 다운로드 API |

### 변경
| 파일 | 내용 |
|---|---|
| `lib/excel/generateWorkbook.ts` | 템플릿 경로 `public/templates/` → `templates/` |
| `lib/estimate/fileExport.ts` | `generateMethodExcel(estimate, method)` 추가 |
| `components/estimate/SaveButton.tsx` | FAB에 XLSX 버튼 추가, PDF 버튼 비활성화 + "준비 중" 툴팁 |

### 삭제
| 파일 | 사유 |
|---|---|
| `public/templates/complex-template.xlsx` | `templates/complex.xlsx`로 이동 |
| `public/templates/urethane-template.xlsx` | `templates/urethane.xlsx`로 이동 |

---

## 3-B 범위

### 핵심 목표
구글드라이브 이관 — 기존 Supabase Storage → 드라이브 JSON+XLSX+PDF 3종 저장

### 세부 항목

1. **인증**: 구글 서비스 계정
   - 환경변수: `GOOGLE_SERVICE_ACCOUNT_JSON`, `GDRIVE_ESTIMATES_FOLDER_ID`
   - `lib/gdrive/` 디렉토리에 기존 코드 있음 (검토 후 활용)

2. **저장 파이프라인**:
   - JSON: `generateJson()` → 드라이브 업로드
   - XLSX: `generateMethodWorkbook()` (Phase 3-A 엔진) → 드라이브 업로드
   - PDF: Drive API `files.export` (xlsx 업로드 후 pdf 변환)

3. **PDF 변환**:
   - Drive API `files.export`로 xlsx→pdf 무료 변환
   - 3-A에서 비활성화된 FAB PDF 버튼 재활성화
   - `SaveButton.tsx`의 `fabDisabledCls` → `fabPrimaryCls` + 핸들러 연결

4. **마이그레이션**:
   - 컷오프 방식 — 기존 Supabase estimates 건드리지 않음
   - 신규 저장은 드라이브, 기존 파일은 Supabase Storage에 그대로

5. **cost_config**: Supabase 유지 (이관 대상 아님)

---

## 3-B에서 해제되는 금지 스코프

- 저장 관련 API (`api/estimates/**`)의 드라이브 연동 수정 허용

## 여전히 유지되는 금지 스코프

- `/estimate/new`
- `components/settings/**` 및 `/app/(authenticated)/settings/**`
- `components/layout/Header.tsx`
- 새 패키지 설치 전 승인 필요

---

## 알려진 리스크·미검증 항목

1. **J9 주소 필드**: Estimate 타입에 address 없음 → site_name 사용 중. CRM에서 주소를 가져오는 로직 필요할 수 있음.
2. **관리번호 경쟁 조건**: 동시 저장 시 일련번호 중복 가능 (SELECT COUNT 기반). 트랜잭션 또는 시퀀스 도입 검토.
3. **Drive API 할당량**: 무료 계정 기준 일 쿼리 제한 확인 필요.
4. **기존 save-all 라우트**: 여전히 puppeteer PDF 생성 포함. 3-B에서 드라이브 PDF로 전환 후 puppeteer 의존성 제거 여부 결정.
5. **material_increase_rate 잔재**: `lib/estimate/costBreakdown.ts`, `components/settings/**`에 존재. Phase 3-C에서 정리.

---

## 3-B용 프롬프트 초안

```
페이즈 3-B — 구글드라이브 이관 + Drive API PDF 변환

[세션 컨텍스트]
이 세션은 독립 세션. NEXT_SESSION_HANDOFF.md가 유일한 컨텍스트.
첨부: bsmg_estimate_final_v3.md

[레포]
bsmg-v5 (Next.js 14 App Router, Vercel)
배포 URL: https://bsmg-v5.vercel.app

[금지 스코프]
/estimate/new
components/layout/Header.tsx
components/settings/** 및 /app/(authenticated)/settings/**

[목표]
1. 구글 서비스 계정 인증 설정
2. 견적 저장 시 JSON+XLSX+PDF 3종을 구글드라이브에 업로드
3. PDF: Drive API files.export로 xlsx→pdf 무료 변환
4. FAB PDF 버튼 재활성화
5. 컷오프 마이그레이션 (기존 Supabase 파일 유지)

[환경변수]
GOOGLE_SERVICE_ACCOUNT_JSON — 서비스 계정 키 JSON
GDRIVE_ESTIMATES_FOLDER_ID — 드라이브 상위 폴더 ID

[검증 기준]
- 저장 시 드라이브 폴더에 JSON/XLSX/PDF 3종 생성
- PDF가 XLSX와 레이아웃 동일
- 기존 Supabase 견적 접근 정상
- FAB PDF 버튼 클릭 → PDF 다운로드

[세션 종료 산출물]
1. bsmg_estimate_final_v4.md (v3 → v4 갱신)
2. NEXT_SESSION_HANDOFF.md (Phase 3-C용)
```

---

**END OF HANDOFF**
