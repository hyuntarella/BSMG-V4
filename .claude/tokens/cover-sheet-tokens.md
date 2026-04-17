# Cover Sheet (갑지) — Figma Design Tokens

> Extracted from: Figma file `lO5PLMtZnPTOPEabRORhSL`, node `1:359`
> 최종 갱신: 2026-04-16 — Figma 재수정 반영 (델타 2차)

## 변경 이력
- 2026-04-16: Figma 수정 반영 (델타 1차 — 금액 블록 강조↑, 합계 Bold, 하자보수 accent red)
- 2026-04-16: Figma 재수정 반영 (델타 2차 — 공사금액 라벨 2줄, 단가 컬럼 삭제)
- 2026-04-16: 브랜드 로고 placeholder 6개 → 단일 SVG 실제 에셋 교체 (public/brand/collaborations.svg)
- 2026-04-16: Figma 델타 3차 — 수신자 3행(담당자 삭제, 주소 h-54px), 공급자 라벨 재배치(담당자/연락처), 브랜드 텍스트 opacity 0.5→0.8

## Page

| Property | Value |
|----------|-------|
| Width | 1123px |
| Height | 794px |
| Background | #FFFFFF |
| Padding | 40px |
| Gap (sections) | 24px |
| Font Family | Pretendard Variable |

## Typography

| Style | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| heading | 32px | 700 (Bold) | 100% | 견적서 제목 |
| subheading | 23px | 700 (Bold) | normal | 공사금액 합계 텍스트 |
| body | 15px | 400 (Regular) | 117.88% | 대부분 텍스트 |
| body-semibold | 15px | 600 (SemiBold) | 117.88% | 라벨 텍스트 |
| caption | 12px | 400 (Regular) | 108.62% | 부가가치세별도, Brand Collaborations |

## Colors

| Token | Hex | Usage |
|-------|-----|-------|
| text-primary | #000000 | 기본 텍스트 |
| text-white | #FFFFFF | dark bg 위 텍스트 |
| surface-dark | #121212 | 수신자 라벨 bg, 테이블 헤더 bg, 공사금액 라벨 bg |
| surface-light | #EBEBEB | 공급자 라벨 bg, 합계 행 bg |
| line-light | #C4C4C4 | 테이블 테두리, 행 구분선 |
| line-dark | #4D4D4D | 수신자 dark 셀 내부 구분선 |
| accent | #C83030 | 로고 포인트 (방수명가 빨간 박스) |
| brand-text-muted | rgba(0,0,0,0.8) | Brand Collaborations 텍스트 |
| brand-border | rgba(52,60,97,0.55) | 브랜드 로고 박스 테두리 |

## Layout — Header Row

| Property | Value |
|----------|-------|
| Display | flex, justify-between, items-center |
| Padding | pt-10px, px-10px |
| Logo | ~106×26px (방수명가 SVG) |
| Title | "견 적 서", 32px Bold, center |
| Spacer | 115px width (balances logo) |

## Layout — Info Row

| Property | Value |
|----------|-------|
| Display | flex, gap-30px |
| Left (수신자) | fixed width 350px |
| Right (공급자) | flex-1 |

### Left Info (수신자)
- Label "수신자": Bold 15px, py-5px
- 3 rows: 견적일, 공사명, 주소
- 주소 행: label h-54px items-start (2줄 대응), value self-stretch border-b
- Label cell: bg #121212, white SemiBold 15px, w-75px (65px text + 10px pl), py-6px
- Label internal border: top #4D4D4D (between dark cells)
- Value cell: flex-1, pl-10px, py-6px, Regular 15px black
- Value border: top #C4C4C4 (between value cells)
- First row: border-top 2px #121212
- Last row: border-bottom #C4C4C4

### Right Info (공급자)
- Label "공급자": Bold 15px, py-5px
- 4 rows: 상호(법인명)/담당자, 사업자번호/연락처, 업태및종목/FAX, 사업장주소
- Label cell: bg #EBEBEB, SemiBold 15px black, w-95px, pl-3px, py-6px
- Value cell: flex-1, pl-10px, py-6px, Regular 15px black
- Row borders: top #C4C4C4, first row border-top 2px #121212, last row border-bottom #C4C4C4

## Layout — Amount Block

| Property | Value |
|----------|-------|
| Border top | 2px solid #000 |
| Label wrapper | flex, items-center, self-stretch |
| Label cell | bg #121212, w-110px, flex-col, gap-3px, px-15px, py-18px, center |
| Label line 1 | "공사금액", SemiBold 15px white, leading 117.88% |
| Label line 2 | "(부가세 별도)", Regular 12px white, leading 108.62% |
| Amount wrapper | flex-1, items-center, self-stretch |
| Amount cell | h-full, border-bottom #C4C4C4, Bold 23px black, center |

## Layout — Table

| Column | Outer Width | Text Width | Align |
|--------|-------------|------------|-------|
| 품명 | flex-1 | flex-1 | center |
| 규격 | 80px | 60px | center |
| 수량 | 80px | 60px | center |
| 금액 | (shrink-0) | 300px | center |
| 비고 | (shrink-0) | 100px | center |

> 단가 컬럼: 델타 2차에서 삭제됨

- Header: bg #121212, SemiBold 15px white, py-8px, internal border-right #4D4D4D
- Data rows: py-10px, border-bottom #C4C4C4, Regular 15px black, border-right #C4C4C4
- Footer (합계): bg #EBEBEB, same cell sizing, "합계" Bold, 금액 Bold, "(단수정리)" in 비고

## Layout — Special Notes

| Property | Value |
|----------|-------|
| Container | px-10px, pt-5px, pb-15px |
| Notes row | p-10px, gap-16px |
| Label "특기사항" | w-60px, Regular 15px |
| Content line 1 | flex-1, Bold 15px, #A11D1F (accent red), 117.88% line-height |
| Content line 2 | flex-1, Regular 15px, black (inherit), 117.88% line-height |
| Caption | px-10px, caption 12px, "* 부가가치세 별도" |

## Layout — Brand Logos

| Property | Value |
|----------|-------|
| Display | flex, justify-end, items-center, gap-15px, py-10px |
| Label | "Brand Collaborations", caption 12px, rgba(0,0,0,0.5) |
| Logo image | h-37px, w-auto, single SVG (collaborations.svg) |
