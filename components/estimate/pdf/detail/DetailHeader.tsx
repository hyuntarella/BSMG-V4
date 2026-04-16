/**
 * 을지 상단 — 로고 + 공사명 블록
 * Figma node: header-row (3:174) + amount-block (3:256)
 */

interface DetailHeaderProps {
  constructionName: string
}

export default function DetailHeader({ constructionName }: DetailHeaderProps) {
  return (
    <>
      {/* 로고 — 갑지 CoverHeader 동일 에셋, 타이틀 없음 */}
      <div className="flex items-center overflow-hidden pr-[10px] w-full">
        <img
          src="/brand/bsmg-logo.svg"
          alt="방수명가"
          className="h-[26px] w-[115px] object-contain"
        />
      </div>

      {/* 공사명 블록 — border-t-2 black, dark label + value */}
      <div className="border-t-2 border-black flex items-center overflow-hidden w-full">
        <div className="bg-[#121212] flex items-center justify-center shrink-0 w-[100px] h-[37px]">
          <p className="text-[13px] font-semibold text-white text-center">
            공 사 명
          </p>
        </div>
        <div className="flex-1 flex items-center h-[37px] border-b border-[#c4c4c4] pl-[10px]">
          <p className="text-[13px] font-normal text-black">
            {constructionName}
          </p>
        </div>
      </div>
    </>
  )
}
