# RESUME — 방수명가 견적서 v5

**최종 갱신:** 2026-04-17 (저녁 2차 세션)

## 방금 끝낸 것

**Phase 6.3.4 — 실데이터 매핑 유틸** ✅

- lib/estimate/pdf/detailMapper.ts: toDetailSheet(estimate, sheetIndex): DetailSheet
- tests/estimate/detailMapper.test.ts: 8 cases 전체 통과
- 검증: build exit 0, lint error 0

**워킹 디렉토리 정리** ✅ (파트 A)

4개 커밋 push 완료:
- 2c40319 옛 문서 아카이브 정리 (7파일 1368줄 삭제)
- 5bbfdc1 프로젝트 규율 문서 레포 편입 (PROJECT_MAP, PDF_PIPELINE_EXPORT, verification-protocol)
- 1e392e4 Stop 훅 기반 verification 블록 검증 활성화
- 80c0c13 CLAUDE.md §7 참조 표 갱신

## 다음에 할 것

**Phase 6.3.5 또는 UAT — 실데이터 렌더 검증**
- 실 Estimate(Supabase) 1건으로 /sandbox/detail 렌더
- self_doubt 3건 확정:
  1. 공사명 포맷 중복 여부 (예: "옥상 옥상방수")
  2. pageNumber 공식 (갑지 장수 가정)
  3. lump_amount 시 unitPrice 표시 자연스러움
- CalloutRow 생성 규칙 논의 (별도)

## 열린 질문

1. main 머지 시점 — phase-6-3-detail 커밋 squash 여부
2. 직인 이미지 PM 업로드 대기
3. overheadRate/profitRate DB 컬럼 연동 (Phase 6.4)

## 참고
- .claude/tokens/detail-sheet-tokens.md — 을지 토큰 v2.1
- lib/estimate/pdf/detailMapper.ts — 매핑 유틸 (Phase 6.3.4)
- lib/estimate/pdf/detailCalc.ts — 계산 유틸
- lib/estimate/pdf/types.ts — PDF 타입
