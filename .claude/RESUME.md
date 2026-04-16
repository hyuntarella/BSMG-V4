# RESUME — 방수명가 견적서 v5

## 방금 끝낸 것

**Phase 6.3.0~6.3.3 fix5 — 을지 타입 + 계산 + 컴포넌트** ✅ 2026-04-16

- 브랜치: `phase-6-3-detail`, 최종 커밋: `21ee880`
- 완료 sub-phase:
  - 6.3.0: 탐색 (기존 타입/계산/토큰 위치 파악)
  - 6.3.1: Figma 토큰 추출 (.claude/tokens/detail-sheet-tokens.md) + 타입 정의 (DetailItem/CalloutRow/WorkColumn/DetailSheet)
  - 6.3.2: calcDetailSheet 계산 유틸 + 3 테스트 (12.png 재현/Callout 무시/컬럼 누락 혼재)
  - 6.3.3: 을지 컴포넌트 4개 (DetailHeader/DetailTableHeader/DetailRow/Detail) + sandbox 렌더
  - fix1~fix5: 샘플 데이터 12.png 실측 정렬, DetailHeader 갑지 패턴 재작성, Callout→비고 전환, Figma 원본 1:1 정렬 (12px, m2, 배경 교차, Bold/Black)
- sandbox/detail 렌더: Figma 구조·스타일 일치 확인
- 남은 이슈: 품명 "기존 바닥 돌뜸 부위\n부분 제거"의 줄바꿈 렌더 미확인

**이전 완료:**
- Phase 6.2 — 갑지 컴포넌트 (Figma 1:1, 96행 대조 불일치 0)
- Phase 6.1 — PDF 파운데이션 (커밋 `67a75b8`)

## 다음에 할 것

**Figma 을지 수정 반영 → 6.3.3 최종 확정**

PM이 Figma 을지 노드(3:173) 수정 중. 수정 완료 후:
1. detail-sheet-tokens.md 재추출 (Figma MCP)
2. 변경된 토큰 → 컴포넌트 반영 (DetailTableHeader/DetailRow/DetailHeader)
3. 대조표 재작성 → 불일치 0 확인
4. 6.3.3 최종 커밋

이후 Phase 6.3.4 범위 재정의 (PM과 협의 필요).

## 열린 질문

- Phase 6.3 남은 sub-phase 재정의 필요 (원안 6.3.4 "초과모드" 폐기됨)
- Figma 을지 수정 반영 범위 (데이터 변경만? 레이아웃 변경도?)
- 실제 에셋: 로고/직인 PM 업로드 대기 (브랜드 완료)
- 견적 생성 시 managerName/Phone 자동 채움 로직 (users 테이블 기반, 6.3 이후)

## 참고

- `.claude/tokens/detail-sheet-tokens.md` — 을지 Figma 토큰 (fix5 반영)
- `.claude/tokens/cover-sheet-tokens.md` — 갑지 Figma 토큰 (델타 3차)
- `docs/PDF_PIPELINE_EXPORT.md` — proposal-system 패턴 이식 레퍼런스
- `docs/견적서_개발_핸드오프.md` — 레이아웃 스펙 (17행 고정 → 폐기, 가변 행 확정)
- Tailwind arbitrary value 패턴, 파일당 200줄 제약
- 모든 디자인 변경은 Figma 먼저 수정 → CC 재추출 → 대조표 검증 흐름
