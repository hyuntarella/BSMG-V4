/**
 * 을지 상단 — 로고 + 공사명 블록
 * Figma node: header-row (3:174) + amount-block (3:256)
 *
 * 로고: CoverHeader.tsx와 동일 에셋·마크업.
 * 공사명: CoverAmountBlock.tsx 패턴 (dark label + value, flex-row).
 */

interface DetailHeaderProps {
  constructionName: string
}

export default function DetailHeader({ constructionName }: DetailHeaderProps) {
  return (
    <div className="flex flex-col w-full gap-[17px]">
      {/* 로고 — CoverHeader.tsx 동일 */}
      <div className="flex items-center overflow-hidden pt-[10px] px-[10px] w-full">
        <img
          src="/brand/bsmg-logo.svg"
          alt="방수명가"
          className="h-[26px] w-[106px] object-contain"
        />
      </div>

      {/* 공사명 블록 — CoverAmountBlock 패턴 */}
      <div className="border-t-2 border-black flex items-center overflow-hidden w-full">
        {/* dark 라벨 */}
        <div className="flex items-center self-stretch shrink-0">
          <div className="bg-[#121212] flex items-center justify-center h-full shrink-0 w-[100px]">
            <p className="text-[15px] font-semibold leading-[117.88%] text-white text-center whitespace-nowrap">
              공 사 명
            </p>
          </div>
        </div>
        {/* 값 */}
        <div className="flex flex-1 min-w-0 items-center self-stretch">
          <div className="border-b border-[#c4c4c4] flex flex-1 h-full min-w-0 items-center pl-[16px]">
            <p className="text-[15px] font-normal leading-[117.88%] text-black">
              {constructionName}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
