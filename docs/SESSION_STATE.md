# SESSION_STATE

> 세션 전환 시 Claude Code가 이 파일을 읽어 현재 상태를 복원한다.
> Phase 완료 시마다 자동 업데이트된다.
> CLAUDE.md와 별도. GSD/하네스 규칙과 분리.

## 프로젝트
- 이름: bsmg-v5 (방수명가 견적서, lens 슈퍼앱 한 방)
- 경로: C:\Users\나\bsmg-v5
- 브랜치: feature/lens-integration
- 지시서: docs/SYSTEM_BUILD_SPEC.md
- lens 인터페이스: docs/brief-quote.md §4

## 현재 단계
- 완료: Phase 0 / 1 / 2 / 3 / 4A / 4B / 4C / 4D / 4E / 4F / 4G / 4H / 4I
- 진행중: 없음
- 다음: Phase 5 (Figma 픽셀 복제 PDF)

## 완료된 Phase 요약
### Phase 0: 환경 준비
- 의존성 6종 (react-dnd, react-dnd-html5-backend, pixelmatch, pngjs, nanoid, @types/pngjs)
- .env.local 5개 placeholder (LENS_WEBHOOK_SECRET, LENS_API_BASE_URL, LENS_DEFAULT_COMPANY_ID, INTERNAL_PDF_SECRET, PIXEL_MATCH_THRESHOLD)

### Phase 1: DB 마이그레이션
- 007_estimate_item_overrides.sql
- 008_acdb.sql
- 009_lens_integration.sql
- 010_price_matrix_history.sql
- 모두 Supabase Dashboard로 적용 완료
- types.ts에 optional 필드 추가 (EstimateItem 7개, EstimateSheet 1개, Estimate 5개)

### Phase 2: lib/acdb/
- types, canonical, search, client, learn, import, index
- 테스트 11개 통과

### Phase 3: v1 11개 기능 부활
- 3-A: #4 잠금, #5 숨김, #16 CRM 자동채움 + 선행조치 (buildItems 스카이차 버그 수정, 테스트 구조 전환)
- 3-B: #7/8/9 오버라이드, #12 자유입력, #13 우레탄 동기화
- 3-C: #11 lump 금액, #2 acDB 자동완성 연결, #3 통합 검색
- lump 귀속: exp(경비) 확정
- CRM 매핑: CrmRecord camelCase 수정 (customerName, address, manager, phone, area)

### Phase 4A: P값 시드 변환 + import
- 477행 입력 → 33 lump 제외 → 444행 변환 → 100% 매핑 성공
- 42조합 (복합 25 + 우레탄 17)
- DB import 완료

## 확정된 주요 결정
- LENS_DEFAULT_COMPANY_ID = 00000000-0000-0000-0000-000000000001 (부성에이티, 견적 2272건)
- 용어: 노무비 → 인건비 (한글 표기만, DB 컬럼명 labor는 유지)
- lens 진입: 새 창
- 테이블 기술: 자체구현 (React + Tailwind)
- 복합+우레탄 2-Document 모델 (고객에게 2안 제시)
- Phase 4 범위: 공정 1개 고정 (옥상). 다중 공정(외벽/주차장)은 Phase 4.5.
- 을지 행 수: 15행 기본 / 16~18행 행높이 축소 / 19~20행 폰트 축소 / 21행+ 경고
- 저장: PDF 2개 자동 (복합 + 우레탄), JSON/엑셀은 서버 저장 후 다운로드 옵션
- 엑셀 파일명: {견적일}_{고객명}_{공사명}_복합{평단가}_우레탄{평단가}.xlsx (사용자 수정 가능)
- Undo/Redo: Ctrl+Z + Ctrl+Shift+Z
- 편집된 셀 자동 잠금 (칩 재선택 시 보존)
- 수정 우선순위: (b) 셀 단가 > (a) 칩 변경 > (c) 행 추가
- PDF 생성 타이밍: Phase 4G에 v4 기존 Puppeteer 임시 PDF → Phase 5에서 Figma 픽셀 복제로 교체
- 계약참조: 제외 (Phase 4 범위 밖)

## 미결 사항
- 음성 → 폼 escalation 트리거 조건 (Phase 8)
- Phase 10 단가 시점 이력 UI 위치
- price_matrix effective_from 날짜 수정 (Phase 10)
- 외벽/주차장 자동화 (Phase 4.6+)
- Phase 5 PDF도 동일 tier 정책 적용 필요 (Phase 4H에서 확정된 4단계 축소 정책)

### Phase 4B: 데이터 모델 정합성 확인
- 판정: (B) — Estimate.sheets: EstimateSheet[] + EstimateSheet.type: Method
- 기존 구조가 2-Document 모델 완전 지원. 코드 변경 불필요.

### Phase 4C: lens 어댑터
- lib/lens/types.ts — QuoteInput, QuoteOutput, VoiceParseResult (brief-quote.md §4 일치)
- lib/lens/auth.ts — HMAC-SHA256 검증 (timing-safe, 5분 TTL)
- lib/lens/adapter.ts — lensInputToEstimate, estimateToLensOutput
- lib/lens/index.ts — 배럴 export
- app/api/lens/quote/route.ts — POST (HMAC + idempotency + Estimate 생성)
- app/api/lens/quote/[quoteId]/route.ts — GET (QuoteOutput 반환)
- 테스트 13개 통과 (auth 4 + adapter 4 + route 5)

### Phase 4D: 칩 UI + 원가 기반 생성
- lib/estimate/costChips.ts — calcChipRange(costPerM2, isMobile), getChipMarginPercent
- hooks/useCostChips.ts — getCostPerM2 → calcChipRange → 마진율 자동 계산
- components/estimate/CostChipsPanel.tsx — 복합/우레탄 칩 UI (117줄)
- 칩 공식: costPerM2=12000 → 19,000~25,000원/m² (7칩, desktop)
- OVERHEAD_RATE + PROFIT_RATE import (하드코딩 제거)
- 테스트 11개 통과 (costChips 5 + useCostChips 3 + CostChipsPanel 3)
- Domain QA 발견 calcChipRange 단위 불일치 수정 완료 (totalCost→costPerM2)

### Phase 4E: 엑셀 클론 테이블
- types.ts: EstimateItem에 original_mat/labor/exp 3개 optional 필드 추가
- lib/estimate/tableLogic.ts: recalcRow, recalcAllTotals, markAsEdited 순수 함수
- hooks/useExcelSelection.ts: 단일 셀 선택 상태 관리
- hooks/useTableKeyboard.ts: 방향키/Tab/Enter/Shift/Esc 키보드 네비게이션 + 숨김행 스킵
- components/estimate/ExcelCell.tsx: 셀 상태 전이 (idle→selected→editing), 숫자 천단위 쉼표
- components/estimate/ExcelLikeTable.tsx: Figma 을지 열 너비 기준, sticky 헤더/푸터, 자동 잠금
- 테스트 28개 통과 (tableLogic 8 + excelCell 5 + tableKeyboard 6 + excelLikeTable 5 + 추가 4)
- 자동 잠금: 셀 편집 시 locked=true + original_* 백업 (중복 방지)
- lucide-react 미사용 (인라인 SVG lock 아이콘)

### Phase 4F: Phase 3 기능 완전 통합
- hooks/useUndoRedo.ts: undo/redo 스택 (max 50), pushState/undo/redo/syncCurrent
- components/estimate/ExcelLikeTable.tsx 확장: 잠금/숨김 버튼, 검색바(Ctrl+F), 행 추가, acdb 드롭다운, lump readonly, 검색 매칭 하이라이트
- components/estimate/ExcelCell.tsx 확장: acdb 자동완성 드롭다운 (max 8), isReadonly prop, lump 식 단위 특별 처리
- components/estimate/EstimateTableWrapper.tsx: 모든 훅 조합 (useEstimate → useUndoRedo → useEstimateSearch → useAcdbSuggest → ExcelLikeTable)
- 우레탄 동기화: Wrapper에서 syncUrethaneItems 호출 (우레탄 시트 변경 시 복합 자동 동기화)
- 테스트 12개 통과 (잠금토글, 숨김+재계산, 자유입력, 우레탄동기화, lump, undo, redo, 검색, acdb, 자동잠금, 숨김제외, 텍스트오버라이드)

### Phase 4G: 3포맷 저장 (JSON/Excel/PDF)
- lib/estimate/fileExport.ts: generateJson, generateExcel, generateTempPdf, getExcelFileName, getPdfFileName
- app/api/estimates/[id]/save-all/route.ts: POST — JSON+Excel+PDF(복합)+PDF(우레탄) 4파일 생성 → Storage 업로드 → DB 업데이트
- components/estimate/SaveButton.tsx: 저장 버튼 + PDF 2개 자동 다운로드 + JSON/Excel 드롭다운
- components/estimate/LoadButton.tsx: JSON 파일 불러오기
- supabase/migrations/011_estimate_file_urls.sql: json_url, composite_pdf_url, urethane_pdf_url, files_generated_at 컬럼 추가
- PDF 분리 방식: Estimate 복사 + sheets 1개만 포함 → generateEstimateHtml 2번 호출
- 기존 generate/route.ts, jsonIO.ts, generateWorkbook.ts, generatePdf.ts 수정 없음 (import만)
- 테스트 15개 통과 (generateJson 2 + getExcelFileName 4 + getPdfFileName 2 + importFromJson 6 + 라운드트립 1)

### Phase 4H: 행 수 자동 축소
- lib/estimate/tableLayout.ts: calcTableTier 순수 함수 (tier 1~4 정책)
- components/estimate/ExcelLikeTable.tsx: 동적 tier 적용 (rowHeight/fontClass/paddingClass/headerHeight) + 경고 배너 (tier 4, dismiss+자동리셋)
- components/estimate/ExcelCell.tsx: tierFontClass/tierPaddingClass/tierRowHeight optional props 추가
- 정책: 1~15행 28px/text-sm, 16~18행 24px/text-sm, 19~20행 22px/text-xs, 21+ 22px/text-xs+경고
- Phase 5 PDF tier 정책: Phase 5 Figma 픽셀 복제 PDF에서도 동일 tier 정책 적용 필요

### Phase 4I: 페이지 통합 + e2e 검증
- 전략: (B) 점진 마이그레이션 — /estimate/edit 신규 경로, 기존 /estimate/new 보존
- app/(authenticated)/estimate/edit/page.tsx: 서버 컴포넌트 (lens/직접/빈 진입 3가지)
- components/estimate/EstimateEditorV5.tsx: Phase 4 전체 UI 조립 (칩+테이블+저장+불러오기)
- components/estimate/CustomerInfoCard.tsx: 기본정보 카드 (관리번호/견적일/고객/주소/면적/담당자/특기사항)
- lib/estimate/fileNames.ts: 파일명 유틸리티 분리 (클라이언트 번들에서 puppeteer 의존성 제거)
- SaveButton import 경로 변경: fileExport → fileNames (puppeteer 번들 분리)
- 탭: composite / urethane / compare (3탭 구조)
- lens 진입: /estimate/edit?source=lens&quoteId=xxx → external_quote_id 매칭 → 자동 로드
- 직접 진입: /estimate/edit?id=xxx → ID로 로드
- 빈 진입: /estimate/edit → 새 견적서 자동 생성
- 칩 선택 → updateSheetPpp 자동 연결 (복합/우레탄 독립)
- 비교 탭: 평단가/공종수/합계/m2당 요약
- 테스트 12개 추가 (2-Document, 파일명, lens, 탭인덱스, 잠금)

### Phase 4I-H1: costChips 재작성 + 시트 자동 생성
- Bug A 수정: costChips가 v1 마진 역산 공식(20k~27k) 대신 price_matrix DISTINCT 값(38k~44k) 사용
- lib/estimate/costChips.ts: getAvailableChips(priceMatrix, areaM2, method) 추가 — priceMatrix 키에서 직접 추출
- hooks/useCostChips.ts: priceMatrix optional 파라미터 추가 — 있으면 getAvailableChips, 없으면 레거시 calcChipRange
- Bug B 수정: 빈 Estimate 초기화 시 m2>0 조건 제거 → 복합+우레탄 2개 시트 무조건 자동 생성
- 기존 costChips/useCostChips 테스트 호환 유지 (calcChipRange 보존, 레거시 경로)
- 테스트 5개 추가 (getAvailableChips: 50평미만 복합/우레탄, 50~100평, 미매칭, areaM2=0)

## 테스트 상태
- 전체: 451/452 통과
- 실패 1건: tests/voice/parser-corpus.test.ts INFER-004 (Phase 8 이월)

## 알려진 파일 상태
- docs/brief-quote.md: §4 lens 인터페이스 v4 최종 설계 (items 삭제, 2-Document)
- data/p-value-seed.csv: 477행 (Phase 4A 원본)
- data/p-value-summary.csv: 272행 (요약)
- data/p-value-lump-templates.csv: 33행 (소형평수 전용)
- supabase/price_matrix_pvalue_seed.json: Phase 4A 변환 결과

## 업데이트 규칙
- 각 Phase 완료 시 Claude Code가 이 파일을 수정 + git commit
- "완료된 Phase 요약" 섹션에 해당 Phase 추가
- "현재 단계" 섹션 업데이트
- "미결 사항" 정리
- CLAUDE.md는 절대 수정하지 않음
