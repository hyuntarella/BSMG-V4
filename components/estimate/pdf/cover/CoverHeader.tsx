/**
 * 갑지 상단 — 로고 + "견 적 서" 타이틀 + spacer
 * Figma node: header-row (2:374)
 */
export default function CoverHeader() {
  return (
    <div className="flex items-center justify-between overflow-hidden pt-[10px] px-[10px] w-full">
      {/* 방수명가 로고 */}
      <img
        src="/brand/bsmg-logo.svg"
        alt="방수명가"
        className="h-[26px] w-[106px] object-contain"
      />

      {/* 타이틀 */}
      <p className="text-[32px] font-bold leading-none text-black text-center whitespace-nowrap">
        견 적 서
      </p>

      {/* 우측 spacer — 로고와 균형 */}
      <div className="h-px w-[115px]" />
    </div>
  )
}
