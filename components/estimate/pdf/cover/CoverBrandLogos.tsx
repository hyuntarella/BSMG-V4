/**
 * 갑지 하단 — "Brand Collaborations" + 합본 로고 이미지
 * Figma node: brand-logos (3:22)
 *
 * collaborations.svg 는 6개 브랜드 로고가 합본된 단일 이미지.
 */

export default function CoverBrandLogos() {
  return (
    <div className="flex gap-[15px] items-start justify-end overflow-hidden py-[10px] w-full">
      <p className="text-[12px] leading-[108.62%] text-black/80 text-center whitespace-nowrap shrink-0">
        Brand Collaborations
      </p>

      {/* 합본 로고 이미지 — 단일 SVG */}
      <img
        src="/brand/collaborations.svg"
        alt="협업사 로고"
        className="h-[37px] w-auto object-contain"
      />
    </div>
  )
}
