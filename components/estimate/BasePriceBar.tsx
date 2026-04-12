import type { EstimateSheet } from '@/lib/estimate/types'

/**
 * 실제 평단가 = is_base && !is_hidden && unit !== '식' && name !== '벽체 우레탄'
 * 추가공종/식/벽체/hidden 제외
 */
interface BasePriceBarProps {
  sheet: EstimateSheet
  m2?: number
}

export default function BasePriceBar({ sheet }: BasePriceBarProps) {
  const actual = sheet.items
    .filter(i =>
      i.is_base &&
      !i.is_hidden &&
      i.unit !== '식' &&
      i.name !== '벽체 우레탄'
    )
    .reduce((sum, i) => sum + i.mat + i.labor + i.exp, 0)
  const selected = sheet.price_per_pyeong
  const diff = actual - selected

  return (
    <div className="flex flex-col gap-[1px] rounded bg-[#E8F1FF] px-[10px] py-[2px] shadow-[inset_0_0_0_1.5px_#007AFF]">
      <span className="text-[10px] font-semibold text-[#8a8a8e] tracking-wider">실제 평단가</span>
      <span className="text-lg font-extrabold tabular-nums text-[#007AFF] leading-tight tracking-tight">
        {actual.toLocaleString()}
        {diff !== 0 && (
          <span className={`text-[10px] font-semibold ml-[3px] ${diff > 0 ? 'text-[#FF9F0A]' : 'text-[#007AFF]'}`}>
            ({diff > 0 ? '+' : ''}{diff.toLocaleString()})
          </span>
        )}
      </span>
    </div>
  )
}
