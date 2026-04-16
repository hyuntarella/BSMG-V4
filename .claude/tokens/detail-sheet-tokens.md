# Detail Sheet (을지) — Figma Design Tokens

> Extracted from: Figma file `lO5PLMtZnPTOPEabRORhSL`, node `3:173`
> 최종 갱신: 2026-04-16 — 초기 추출

## 변경 이력
- 2026-04-16: 초기 추출 (Figma MCP node 3:173)
- 2026-04-16: CalloutRow 스타일 — PM 지시 기반 추가 (Figma 미반영, 추가 반영 시 재조정 필요)

## Page

| Property | Value |
|----------|-------|
| Width | 1123px |
| Height | 794px |
| Background | #FFFFFF |
| Padding | 40px |
| Gap (sections) | 17px |
| Font Family | Pretendard Variable |

## Typography

| Style | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| header-label | 13px | 600 (SemiBold) | normal | 테이블 헤더 (상단+하단) |
| data | 13px | 400 (Regular) | normal | 데이터 행 텍스트 |
| footer-label | 13px | 600 (SemiBold) | normal | 소계/공과잡비/이윤/계 라벨 |
| footer-total | 14px | 700 (Bold) | normal | 합계 행 라벨 + 금액 |
| construction-label | 13px | 600 (SemiBold) | normal | 공사명 라벨 (dark bg) |
| construction-value | 13px | 400 (Regular) | normal | 공사명 값 |

## Colors

| Token | Hex | Usage |
|-------|-----|-------|
| text-primary | #000000 | 기본 텍스트 |
| text-white | #FFFFFF | dark bg 위 텍스트 (헤더, 공사명 라벨) |
| surface-dark | #121212 | 테이블 헤더 bg, 공사명 라벨 bg |
| surface-light | #EBEBEB | 소계/합계 행 bg |
| line-light | #C4C4C4 | 데이터 행 border-bottom, 테이블 외곽 |
| line-dark | #4D4D4D | 헤더 내부 세로 구분선 (border-right) |
| accent | #A11D1F | CalloutRow accent 텍스트 색 |

## Layout — Header Row (로고)

| Property | Value |
|----------|-------|
| Display | flex, items-center, overflow-clip |
| Padding | pr-10px |
| Logo | 방수명가 SVG (~115×26px) |

## Layout — Amount Block (공사명)

| Property | Value |
|----------|-------|
| Border top | 2px solid #000 |
| Label cell | bg #121212, w-100px, h-37px, center, SemiBold 13px white |
| Label text | "공 사 명" |
| Value cell | flex-1, h-37px, pl-10px, items-center, Regular 13px black |
| Border bottom | 1px solid #C4C4C4 |

## Layout — Table Header (2단 병합)

### 상단 행 (rowSpan 그룹 라벨, h=32px)

| Column Group | Width | Text | Align |
|-------------|-------|------|-------|
| 품명 | 140px | "품 명" | center (rowSpan=2, 세로 중앙) |
| 규격 | 100px | "규 격" | center (rowSpan=2) |
| 단위 | 50px | "단 위" | center (rowSpan=2) |
| 수량 | 60px | "수 량" | center (rowSpan=2) |
| 재료비 | 145px | "재 료 비" | center (colSpan=2: 단가+금액) |
| 인건비 | 145px | "인 건 비" | center (colSpan=2: 단가+금액) |
| 경비 | 145px | "경 비" | center (colSpan=2: 단가+금액) |
| 합계 | 198px | "합 계" | center (colSpan=2: 단가+금액) |
| 비고 | 60px | "비 고" | center (rowSpan=2) |

> Figma 원문: "인 건 비". 코드 필드명은 `labor` 유지.

### 하단 행 (서브헤더, h=32px)

| Parent | Sub-col 1 | Sub-col 2 |
|--------|-----------|-----------|
| 재료비 (145px) | 단가 60px | 금액 85px |
| 인건비 (145px) | 단가 60px | 금액 85px |
| 경비 (145px) | 단가 60px | 금액 85px |
| 합계 (198px) | 단가 80px | 금액 118px |

### 헤더 스타일
- bg: #121212
- 텍스트: white, SemiBold 13px, center
- 내부 세로 구분: border-right 1px #4D4D4D
- 전체 높이: 64px (32+32)
- 상단 border-top: 2px solid #000

## Layout — Data Row (품목 행)

| Property | Value |
|----------|-------|
| Height | ~34.72px |
| Border bottom | 1px solid #C4C4C4 |
| Text | Regular 13px, #000, center (숫자는 right) |
| Column borders | border-right 1px #C4C4C4 |

### Column Widths (데이터 행)

| Column | Width | Align |
|--------|-------|-------|
| 품명 | 140px | center |
| 규격 | 100px | center |
| 단위 | 50px | center |
| 수량 | 60px | right |
| 재료비-단가 | 60px | right |
| 재료비-금액 | 85px | right |
| 인건비-단가 | 60px | right |
| 인건비-금액 | 85px | right |
| 경비-단가 | 60px | right |
| 경비-금액 | 85px | right |
| 합계-단가 | 80px | right |
| 합계-금액 | 118px | right |
| 비고 | 60px | center |

## Layout — Footer Rows (소계~합계)

### 소계 행
- 품명 셀: "소 계", SemiBold 13px, center (w=140px, text-indent -7.5px → w=155px)
- bg: #EBEBEB
- 재료비 금액 / 인건비 금액 / 경비 금액 / 합계 금액 컬럼에 값 표시
- 나머지 셀 비움

### 공과잡비 행
- 품명 셀: "공 과 잡 비, 안 전 관 리 비", SemiBold 13px (2줄, h=32px+)
- 단위: "%", 수량: "3"
- 합계 금액 컬럼에만 값 표시
- 다른 금액 컬럼 비움

### 기업이윤 행
- 품명 셀: "기 업 이 윤", SemiBold 13px
- 단위: "%", 수량: "6"
- 합계 금액 컬럼에만 값 표시

### 계 행
- 품명 셀: "계", SemiBold 13px
- 합계 금액 컬럼에만 값 표시

### 합계 행
- 품명 셀: "합 계", Bold 14px
- bg: #EBEBEB
- 합계 금액: Bold 14px
- 비고: "(단수정리)", Regular 13px

## Layout — Callout Row (PM 지시 기반, Figma 추가 반영 시 재조정 필요)

| Property | Value |
|----------|-------|
| Height | ~34.72px (데이터 행과 동일, 잠정) |
| Background | #FFFFFF (없음) |
| Text align | left |
| Colspan | 전체 가로 병합 (13 컬럼) |
| accent text | #A11D1F, Bold 가능 |
| default text | #000000, Regular 13px |
| Border bottom | 1px solid #C4C4C4 |
| 예시 | "※ 판넬도막방수는 하자보수기간 3년 적용됩니다" |
