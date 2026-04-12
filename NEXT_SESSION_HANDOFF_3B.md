# Phase 3-B 세션 핸드오프

## 3-B 변경사항 요약

### 목표
견적서 저장 백엔드를 Supabase Storage → Google Drive로 이관 + Drive API로 XLSX→PDF 변환 + FAB PDF 버튼 재활성화.

### 변경 파일
| 파일 | 변경 내용 |
|------|----------|
| `lib/gdrive/client.ts` | `upsertToDrive()` 추가 (같은 이름 파일 덮어쓰기), `getAuth()` export, `findFileByName()` 내부 헬퍼 |
| `lib/gdrive/convert.ts` | **신규** — `convertXlsxToPdf()`: Drive API로 XLSX→Google Sheets→PDF export→중간 시트 삭제 |
| `app/api/estimates/[id]/save-all/route.ts` | Supabase Storage 업로드 → `upsertToDrive()` 호출. 공법별 XLSX+PDF 병렬 생성. DB에 Drive URL 저장. |
| `app/api/estimates/[id]/export/route.ts` | PDF format 501 제거 → `convertXlsxToPdf()` 호출하여 binary PDF stream 반환 |
| `components/estimate/SaveButton.tsx` | PDF 버튼 disabled 제거 → `handlePdfDownload()` 추가, export API `format:'pdf'` 호출 |

### 변경하지 않은 파일
- `hooks/useAutoSave.ts` — 실시간 편집은 Supabase DB 유지
- `app/api/estimates/route.ts` — 목록 메타데이터는 Supabase DB 유지
- `components/settings/**` — 3-C 스코프
- `lib/estimate/costBreakdown.ts` — 3-C 스코프
- `lib/estimate/constants.ts` MATERIAL_INCREASE_RATE — 3-C 스코프

### 환경변수
기존 변수 그대로 사용. 추가 없음:
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_DRIVE_FOLDER_ID`

### 파일명 규칙
```
{customerName}_{siteName}_{YYMMDD}_{mgmtNo}.json
{customerName}_{siteName}_{YYMMDD}_{mgmtNo}_complex.xlsx
{customerName}_{siteName}_{YYMMDD}_{mgmtNo}_complex.pdf
{customerName}_{siteName}_{YYMMDD}_{mgmtNo}_urethane.xlsx
{customerName}_{siteName}_{YYMMDD}_{mgmtNo}_urethane.pdf
```

---

## 3-C 병합 안내

### 브랜치 상태
- `feature/3b-gdrive`: 3-B 완료 (main 기반)
- `feature/3c-settings`: 3-C 진행 중 (main 기반)

### 병합 순서
먼저 완료된 쪽이 main에 먼저 병합. 두 브랜치는 파일 충돌 없음:
- 3-B: `lib/gdrive/`, `save-all`, `export`, `SaveButton.tsx`
- 3-C: `components/settings/`, `lib/estimate/costBreakdown.ts`, `lib/estimate/constants.ts`, `app/(authenticated)/settings/`, `app/api/settings/`

### 병합 후 v5.md 작성 시
3-B의 v4.md + 3-C의 변경사항을 합쳐 v5.md 작성. §0 운영 규칙 유지 필수.

---

## 이후 페이즈 프롬프트 초안

현재 로드맵에 3-C 이후 예정 페이즈 없음. 3-B + 3-C 병합 후 다음 마일스톤 정의 필요.

후보:
- Phase 4: 음성 명령으로 견적서 생성/수정 통합
- Phase 5: CRM 연동 (고객 관리 + 견적 이력)
