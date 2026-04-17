/**
 * 갑지 루트 컴포넌트 — 1123×794 landscape PDF 페이지
 * Figma node: Frame 1 (1:359)
 *
 * .ep-page 클래스로 styles/estimate-pdf.css 규격 적용.
 * 6개 서브 컴포넌트를 Figma auto-layout 순서대로 배치.
 */
import type { CoverRenderData } from '@/lib/estimate/pdf/types'
import CoverHeader from '@/components/estimate/pdf/cover/CoverHeader'
import CoverInfoRow from '@/components/estimate/pdf/cover/CoverInfoRow'
import CoverAmountBlock from '@/components/estimate/pdf/cover/CoverAmountBlock'
import CoverTable from '@/components/estimate/pdf/cover/CoverTable'
import CoverNotes from '@/components/estimate/pdf/cover/CoverNotes'
import CoverBrandLogos from '@/components/estimate/pdf/cover/CoverBrandLogos'

interface CoverSheetProps {
  data: CoverRenderData
}

export default function CoverSheet({ data }: CoverSheetProps) {
  return (
    <div className="ep-page flex flex-col gap-[24px] items-start p-[40px]">
      <CoverHeader />

      <CoverInfoRow
        date={data.date}
        managerName={data.managerName}
        managerPhone={data.managerPhone}
        siteAddress={data.siteAddress}
        projectTitle={data.projectTitle}
      />

      <CoverAmountBlock
        totalAmountKorean={data.totalAmountKorean}
        totalAmount={data.totalAmount}
      />

      {/* bottom-block: table + notes + brand-logos (Figma 3:172) */}
      <div className="flex flex-col gap-[5px] items-start w-full">
        {/* table 컨테이너 — notes는 Figma에서 table 내부 자식 */}
        <div className="border-b border-l border-r border-[#c4c4c4] flex flex-col items-start overflow-hidden w-full">
          <CoverTable items={data.items} totalAmount={data.totalAmount} />
          <CoverNotes />
        </div>

        <CoverBrandLogos />
      </div>
    </div>
  )
}
