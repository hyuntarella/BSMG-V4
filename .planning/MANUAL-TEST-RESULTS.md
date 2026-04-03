# 수동 테스트 자동 검증 결과

> 실행: 2026-04-01 04:45:08
> 합계: **14건** — ✅ PASS 7 / ❌ FAIL 0 / ⏭️ SKIP 7

## 엑셀 검증

| ID | 항목 | 결과 | 상세 |
|---|---|---|---|
| XL-M01 | Sheet1 표지 — 관리번호, 날짜, 고객명 귀하, 현장명 | ✅ PASS |  |
| XL-M02 | Sheet1 한글금액 — "일금 이백이십만원 정(₩2,200,000) 일금 이백이십만원 정(₩2,200,000) 일금 이백이십만원 정(₩2,200,000) 일금 이백이십만원 정(₩2,200,000) 일금 이백이십만원 정(₩2,200,000) 일금 이백이십만원 정(₩2,200,000) 일금 이백이십만원 정(₩2,200,000) 일금 이백이십만원 정(₩2,200,000) 일금 이백이십만원 정(₩2,200,000) 일금 이백이십만원 정(₩2,200,000) 일금 이백이십만원 정(₩2,200,000) 일금 이백이십만원 정(₩2,200,000) 일금 이백이십만원 정(₩2,200,000) 일금 이백이십만원 정" | ✅ PASS |  |
| XL-M04 | Sheet2 공종 DB diff — DB 5개 모두 엑셀에 존재 | ✅ PASS |  |
| XL-M05 | Sheet2 합계 — 템플릿 수식 존재 (5개). 계산값: 소계=2070000, 합계=2200000 | ✅ PASS |  |
| XL-M06 | Sheet2 10만원 절사 — 2200000 (22×10만) | ✅ PASS |  |

## PDF 검증

| ID | 항목 | 결과 | 상세 |
|---|---|---|---|
| PD-M02 | PDF(HTML) 금액 데이터 — 합계 2,200,000원 발견 | ✅ PASS |  |
| PD-M02+ | PDF 바이너리 생성 | ⏭️ SKIP | 로컬에 chromium 바이너리 부재 (Vercel 전용). HTML 기반 검증은 통과. |
| PD-M04 | Supabase Storage | ⏭️ SKIP | estimates 버킷 미존재 — Supabase 대시보드에서 생성 필요 |

## 제안서 검증

| ID | 항목 | 결과 | 상세 |
|---|---|---|---|
| PR-M01 | 제안서 사진 업로드 | ⏭️ SKIP | proposals 버킷 미존재: Bucket not found |
| PR-M04 | google.script.run 호출 0건 — v4에 GAS 의존 없음 | ✅ PASS |  |

## 외부 API 검증

| ID | 항목 | 결과 | 상세 |
|---|---|---|---|
| EX-M01 | Google Drive 엑셀 | ⏭️ SKIP | Drive 연결 실패: File not found: 1Y5uAIrIFlVmu_SfqHf5RAVpDVUCiFO1U. |
| EX-M02 | Google Drive PDF | ⏭️ SKIP | Drive 연결 실패: File not found: 1Y5uAIrIFlVmu_SfqHf5RAVpDVUCiFO1U. |
| EX-M04 | Supabase Storage 엑셀+PDF | ⏭️ SKIP | estimates/TEST-MNFK3BE1에 파일 없음 (generate 미호출) |
| EX-M05 | CRM → 견적서 자동채움 | ⏭️ SKIP | customers 테이블에 데이터 없음 |

## SKIP 사유

- **PD-M02+**: 로컬에 chromium 바이너리 부재 (Vercel 전용). HTML 기반 검증은 통과.
- **PD-M04**: estimates 버킷 미존재 — Supabase 대시보드에서 생성 필요
- **PR-M01**: proposals 버킷 미존재: Bucket not found
- **EX-M01**: Drive 연결 실패: File not found: 1Y5uAIrIFlVmu_SfqHf5RAVpDVUCiFO1U.
- **EX-M02**: Drive 연결 실패: File not found: 1Y5uAIrIFlVmu_SfqHf5RAVpDVUCiFO1U.
- **EX-M04**: estimates/TEST-MNFK3BE1에 파일 없음 (generate 미호출)
- **EX-M05**: customers 테이블에 데이터 없음

