/**
 * 을지 테이블 헤더 — 2단 병합 <thead>
 * Figma node: table-header-top (3:263)
 *
 * 상단: 품명·규격·단위·수량·비고 rowSpan=2, 재료비·인건비·경비·합계 colSpan=2
 * 하단: 각 카테고리 아래 "단가" / "금액"
 */

const thBase =
  'bg-[#121212] text-white text-[12px] font-normal text-center leading-[108.62%]'
const borderR = 'border-r border-[#4d4d4d]'

export default function DetailTableHeader() {
  return (
    <thead>
      {/* 상단 행 — h=29px */}
      <tr className="h-[29px]">
        <th rowSpan={2} className={`${thBase} ${borderR} w-[158px]`}>품 명</th>
        <th rowSpan={2} className={`${thBase} ${borderR} w-[110px]`}>규 격</th>
        <th rowSpan={2} className={`${thBase} ${borderR} w-[50px]`}>단 위</th>
        <th rowSpan={2} className={`${thBase} ${borderR} w-[60px]`}>수 량</th>
        <th colSpan={2} className={`${thBase} ${borderR} border-b border-[#4d4d4d] w-[145px]`}>재 료 비</th>
        <th colSpan={2} className={`${thBase} ${borderR} border-b border-[#4d4d4d] w-[145px]`}>인 건 비</th>
        <th colSpan={2} className={`${thBase} ${borderR} border-b border-[#4d4d4d] w-[145px]`}>경 비</th>
        <th colSpan={2} className={`${thBase} ${borderR} border-b border-[#4d4d4d] w-[170px]`}>합 계</th>
        <th rowSpan={2} className={`${thBase} w-[60px]`}>비 고</th>
      </tr>

      {/* 하단 행 — h=28px */}
      <tr className="h-[28px]">
        {/* 재료비 */}
        <th className={`${thBase} ${borderR} w-[60px]`}>단가</th>
        <th className={`${thBase} ${borderR} w-[85px]`}>금액</th>
        {/* 인건비 */}
        <th className={`${thBase} ${borderR} w-[60px]`}>단가</th>
        <th className={`${thBase} ${borderR} w-[85px]`}>금액</th>
        {/* 경비 */}
        <th className={`${thBase} ${borderR} w-[60px]`}>단가</th>
        <th className={`${thBase} ${borderR} w-[85px]`}>금액</th>
        {/* 합계 */}
        <th className={`${thBase} ${borderR} w-[75px]`}>단가</th>
        <th className={`${thBase} ${borderR} w-[95px]`}>금액</th>
      </tr>
    </thead>
  )
}
