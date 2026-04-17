# 을지 (Detail Sheet) 디자인 토큰

**Figma 소스**: `https://www.figma.com/design/lO5PLMtZnPTOPEabRORhSL/방수명가_견적서?node-id=3-173`
**추출 시점**: 2026-04-17
**Phase**: 6.3 (PM 대폭 수정본 반영 — 수정 전 토큰 전면 폐기)
**규율**: 핸드오프 상단 원칙 "피그마 디자인을 그대로 구현할 것. 임의 변경 금지."

**PM 확정사항 (2026-04-17)**:
1. Figma 값은 모두 의도적 — 임의 해석 금지
2. `#C83030` = 전역 accent (로고 뱃지 + CalloutRow 모두 승격)
3. 공사명 13px 확정
4. 데이터 행 여백 = 원본 수치 (py-[7px], 공과잡비 py-[3px])
5. 테이블 width = `w-[1043px]` 명시 고정

---

## 0. 구조 원칙

- **가변 행**: 17행 고정 체계 폐기. 데이터 행은 품목 개수만큼만 생성.
- **페이지**: 1123 × 794 (가로).
- **Frame 루트** (node 3:173):
  - 배경 `#FFFFFF`
  - Auto layout `flex-col`, `gap: 12px`, `padding: 40px`, `items: start`
  - 3개 블록 수직 스택: 로고 → 공사명 행 → 테이블

---

## 1. 컬러 토큰

| 이름 | 값 | 용도 |
|---|---|---|
| `surface-dark` | `#121212` | 공사명 라벨 배경 + 테이블 헤더 배경 |
| `surface-light` | `#EBEBEB` | 소계 / 계 / 합계 행 배경 |
| `line-light` | `#C4C4C4` | 테이블 외곽선 / 데이터 행 구분선 |
| `line-dark` | `#4D4D4D` | 헤더 내부 구분선 (헤더 전용) |
| `text-primary` | `#000000` | 본문 텍스트 |
| `text-on-dark` | `#FFFFFF` | 어두운 배경 위 텍스트 |
| `border-frame` | `#000000` | 공사명 행 상단 2px, 공사명 라벨 박스 외곽선 |
| `accent` | `#C83030` | **전역 accent** — 로고 뱃지 + CalloutRow 텍스트 |

---

## 2. 타이포그래피

| 이름 | 폰트 | 크기 | Weight | Line-height | 용도 |
|---|---|---|---|---|---|
| `construction-label` | Pretendard Variable | 13px | SemiBold (600) | 1.414 | 공사명 라벨 "공 사 명" |
| `construction-value` | Pretendard Variable | 13px | Regular (400) | 1.414 | 공사명 값 텍스트 |
| `table-header` | Pretendard Variable | 12px | Regular (400) | 108.62% | 헤더 전체 |
| `table-body` | Pretendard Variable | 12px | Regular (400) | 108.62% | 데이터 / 소계 / 공과잡비 / 이윤 / 계 |
| `grand-total-label` | Pretendard Variable | 12px | Bold (700) | 108.62% | 합계 행 "합 계" |
| `grand-total-value` | Pretendard Variable | 12px | Black (900) | 108.62% | 합계 행 금액 |
| `logo-badge-han` | zcoolqingkehuangyouti | 6.4px | Regular | normal | 로고 뱃지 한자 |

---

## 3. 블록별 스펙

### 3.1 로고 헤더 (node 3:174)
- flex-row, items: center, padding-right: 10px
- 로고 이미지: 83.52 × 20.74px
- 좌측 세로 뱃지: bg-accent(#C83030), 4.98 × 11.53px
- 뱃지 내부 "防 水" 한자 2자 세로 배치, 흰색, 6.4px

### 3.2 공사명 행 (node 3:256)
- 외곽: border-top: 2px solid #000000
- flex-row, items: center
- 라벨 박스: w-100 h-32, bg-#121212, border 1px solid #000000, padding 8px 15px, construction-label, 흰색 중앙
- 값 박스: flex-1, h-33, border-bottom 1px solid #C4C4C4, padding 7px 0 5px 10px, construction-value, 검정 start

### 3.3 테이블 (node 3:262)
- 외곽: border-l border-r border-b border-[#C4C4C4]
- **명시 width: w-[1043px]**
- flex-col, items: start

#### 3.3.1 컬럼 너비

| 컬럼 | 너비(px) |
|---|---|
| 품명 | 158 |
| 규격 | 110 |
| 단위 | 50 |
| 수량 | 60 |
| 재료비 | 145 (60+85) |
| 인건비 | 145 (60+85) |
| 경비 | 145 (60+85) |
| 합계 | 170 (75+95) |
| 비고 | 60 |
| **총합** | **1043** |

#### 3.3.2 헤더 행 (node 3:263)
- 전체 높이: 57px (상단 29 + 하단 28)
- 배경: #121212
- 셀 내부 구분선: border-r 1px solid #4D4D4D
- 글자: #FFFFFF, 12px Regular 중앙
- 단순 컬럼 (품명/규격/단위/수량/비고): 1행 flex center
- 2단 병합 컬럼 (재료비/인건비/경비/합계):
  - flex-col
  - 상단 label-row: h-29, border-b 1px solid #4D4D4D
  - 하단 sub-header-row: h-28, flex-row — 단가 셀 border-r, 금액 셀 no border-r

#### 3.3.3 데이터 행
- border-b 1px solid #C4C4C4
- width: 1043px
- 각 셀: border-r 1px solid #C4C4C4, **padding: 7px 0 (py-[7px])**
- 마지막 비고 셀: no border-r
- 내용: 12px Regular 검정, leading 108.62%
- **정렬 (PM 확정): 전 셀 text-center** (수량·단가·금액 포함 모두 중앙)

#### 3.3.4 소계 행 (node 15:86)
- 배경: #EBEBEB
- padding: py-[7px]
- 품명 셀: "소 계"
- 재료비·인건비·경비·합계 **금액** 셀에만 값 표시

#### 3.3.5 공과잡비·안전관리비 행 (node 15:114)
- 배경: 흰색
- **padding: py-[3px]** (원본 수치, 유일한 얇은 행)
- 품명 셀: 2줄 "공 과 잡 비," / "안 전 관 리 비"
- 단위 셀: `%`, 수량 셀: `3`
- 합계 금액 셀에만 값 표시

#### 3.3.6 기업이윤 행 (node 15:142)
- 배경: 흰색
- padding: py-[7px]
- 품명 셀: "기 업 이 윤"
- 단위 셀: `%`, 수량 셀: `6`
- 합계 금액 셀에만 값 표시

#### 3.3.7 계 행 (node 15:170)
- 배경: #EBEBEB
- padding: py-[7px]
- 품명 셀: "계"
- 합계 금액 셀에만 값 표시

#### 3.3.8 합계 행 (node 15:198)
- 배경: #EBEBEB
- padding: py-[7px]
- 품명 셀: "합 계" — Bold
- 합계 금액 셀: Black weight
- 비고 셀: "(단수정리)" — Regular

---

## 4. 변경 이력

| 날짜 | 버전 | 변경 |
|---|---|---|
| 2026-04-17 | v2.0 | Phase 6.3 초안 — Figma 2026-04 재추출 전면 재작성 |
| 2026-04-17 | v2.1 | PM 확정 5건 반영: 전 셀 중앙정렬 / accent 전역 승격 / 13px / py-[7·3px] 원본 수치 / w-[1043px] 명시 |

---

**END**
