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
- 완료: Phase 0 / 1 / 2 / 3 / 4A
- 진행중: Phase 4B + 4C + 4D (묶음)
- 다음: Phase 4E (엑셀 클론 테이블)

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

## 테스트 상태
- 전체: 341/342 통과
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
