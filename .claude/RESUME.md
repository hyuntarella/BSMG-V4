# RESUME — 방수명가 견적서 v5

**최종 갱신:** 2026-04-17 (저녁)

## 방금 끝낸 것

**Phase 6.3.3 fix7 + 6.1-6.2 백필** ✅ 2026-04-17

3개 커밋으로 분리:

1. Phase 6.1-6.2 backfill (4/16 작업 미커밋 정상화)
   - 갑지 7개 컴포넌트, PDF 파운데이션, 갑지 토큰, 협력사 로고 SVG

2. Phase 6.3.3 fix7 (오늘 세션)
   - 을지 토큰 v2.1 재작성
   - 헤더 #EBEBEB → #121212, 글자 반전
   - 데이터 전 셀 중앙 정렬, 합계 컬럼 198 → 170px
   - 공사명 13px, accent #C83030 전역, w-[1043px] 명시
   - 행 높이 h-[30px] Figma 실측, 샘플 13행
   - 로고 padding pt/px → pr

3. chore: RESUME 갱신

검증: npm run build exit 0, /sandbox/detail 시각 대조 완료

## 이전 완료
- Phase 6.3.3 fix6 (2026-04-17 오전)
- Phase 6.3.0~fix5 (2026-04-16)
- Phase 6.2 — 갑지 (2026-04-16, 오늘 비로소 커밋 정상화)
- Phase 6.1 — PDF 파운데이션 (2026-04-16 이전, 오늘 비로소 커밋 정상화)

## 다음에 할 것

**Phase 6.3.4 — 실데이터 매핑 유틸**

sandbox 하드코딩 샘플 → 실제 견적 state → DetailSheet props 변환 함수.
- 선결: lib/estimate/ state shape 확인
- 입력: 견적 도메인 모델
- 출력: DetailSheet
- 재사용: calcDetailSheet

## 열린 질문

1. 다음 세션 초반 정리 대상 (이번 세션 범위 아님):
   - M CLAUDE.md, M .claude/settings.json — 변경 이유 확인
   - D NEXT_SESSION_HANDOFF*.md 4개, D bsmg_estimate_final_v5~v7.md — 아카이브 정리 의도 확정 후 커밋
   - ?? PROJECT_MAP.md, docs/PDF_PIPELINE_EXPORT.md, docs/verification-protocol.md — Project knowledge 이미 있음. 레포 동기화 판단
   - ?? .claude/hooks/verification-gate.js — 유지/폐기
   - ?? scripts/capture-sandbox-detail.mjs — 유지/삭제

2. main 머지 시점 — phase-6-3-detail 커밋 squash 할지 각 커밋 유지할지

3. 직인 이미지 PM 업로드 대기

4. Phase 6.3.4 범위 PM 협의 필요

## 참고
- .claude/tokens/detail-sheet-tokens.md — 을지 토큰 v2.1
- .claude/tokens/cover-sheet-tokens.md — 갑지 토큰
- docs/견적서_개발_핸드오프.md — 레이아웃 스펙
- lib/estimate/pdf/detailCalc.ts — 계산 유틸
- lib/estimate/pdf/types.ts — 타입
