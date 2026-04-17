/**
 * 갑지 공사금액 블록 — dark 라벨(2줄) + 한글 금액
 * Figma node: amount-block (2:480)
 */

interface CoverAmountBlockProps {
  totalAmountKorean: string
  totalAmount: number
}

function formatNumber(n: number): string {
  return n.toLocaleString('ko-KR')
}

export default function CoverAmountBlock({
  totalAmountKorean,
  totalAmount,
}: CoverAmountBlockProps) {
  return (
    <div className="border-t-2 border-black flex items-center overflow-hidden w-full">
      {/* 라벨 — flex-col 2줄: "공사금액" SemiBold 15px + "(부가세 별도)" Regular 12px */}
      <div className="flex items-center self-stretch shrink-0">
        <div className="bg-[#121212] flex flex-col gap-[3px] h-full items-center justify-center px-[15px] py-[18px] shrink-0 text-center text-white w-[110px] whitespace-nowrap">
          <p className="text-[15px] font-semibold leading-[117.88%]">
            공사금액
          </p>
          <p className="text-[12px] font-normal leading-[108.62%]">
            (부가세 별도)
          </p>
        </div>
      </div>

      {/* 금액 — h-full, 라벨 높이에 맞춤 */}
      <div className="flex flex-1 min-w-0 items-center self-stretch">
        <div className="border-b border-[#c4c4c4] flex flex-1 h-full min-w-0 items-center justify-center">
          <p className="text-[23px] font-bold leading-normal text-black text-center whitespace-nowrap">
            {totalAmountKorean} (₩{formatNumber(totalAmount)})
          </p>
        </div>
      </div>
    </div>
  )
}
