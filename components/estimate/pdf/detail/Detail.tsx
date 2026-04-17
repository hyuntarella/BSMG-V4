/**
 * 을지 루트 컴포넌트 — 1123×794 landscape PDF 페이지
 * Figma node: Frame 2 (3:173)
 *
 * .ep-page 클래스로 styles/estimate-pdf.css 규격 적용.
 * calcDetailSheet 내부 호출 → 계산 결과를 footer 행에 전달.
 */
import type { DetailSheet } from '@/lib/estimate/pdf/types'
import { calcDetailSheet } from '@/lib/estimate/pdf/detailCalc'
import DetailHeader from '@/components/estimate/pdf/detail/DetailHeader'
import DetailTableHeader from '@/components/estimate/pdf/detail/DetailTableHeader'
import {
  ItemRow,
  CalloutRowView,
  SubtotalRow,
  OverheadRow,
  ProfitRow,
  BeforeRoundRow,
  GrandTotalRow,
} from '@/components/estimate/pdf/detail/DetailRow'

interface DetailProps {
  sheet: DetailSheet
}

export default function Detail({ sheet }: DetailProps) {
  const calc = calcDetailSheet(sheet)

  return (
    <div className="ep-page flex flex-col gap-[12px] items-start p-[40px]">
      <DetailHeader constructionName={sheet.constructionName} />

      <table className="w-[1043px] border-collapse border-l border-r border-b border-[#c4c4c4]">
        <DetailTableHeader />

        <tbody>
          {sheet.rows.map((row, i) =>
            row.kind === 'item'
              ? <ItemRow key={i} item={row} />
              : <CalloutRowView key={i} row={row} />
          )}

          <SubtotalRow calc={calc} />
          <OverheadRow calc={calc} />
          <ProfitRow calc={calc} />
          <BeforeRoundRow calc={calc} />
          <GrandTotalRow calc={calc} />
        </tbody>
      </table>
    </div>
  )
}
