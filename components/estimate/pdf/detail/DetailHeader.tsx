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
    <div className="flex flex-col w-full gap-[12px]">
      {/* 로고 — CoverHeader.tsx 동일 */}
      <div className="flex items-center overflow-hidden pr-[10px] w-full">
        <img
          src="/brand/bsmg-logo.svg"
          alt="방수명가"
          className="h-[21px] w-[84px] object-contain"
        />
      </div>

      {/* 공사명 블록 — CoverAmountBlock 패턴 */}
      <div className="border-t-2 border-black flex items-center overflow-hidden w-full">
        {/* dark 라벨 */}
        <div className="flex items-center shrink-0">
          <div className="bg-[#121212] border border-black flex items-center justify-center w-[100px] h-[32px] px-[15px] py-[8px]">
            <p className="text-[13px] font-semibold leading-[1.414] text-white text-center whitespace-nowrap">
              공 사 명
            </p>
          </div>
        </div>
        {/* 값 */}
        <div className="flex flex-1 min-w-0 items-center">
          <div className="border-b border-[#c4c4c4] flex flex-1 min-w-0 items-start h-[33px] pt-[7px] pb-[5px] pl-[10px]">
            <p className="text-[13px] font-normal leading-[1.414] text-black">
              {constructionName}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
