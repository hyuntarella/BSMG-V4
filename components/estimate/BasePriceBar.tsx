import type { EstimateSheet } from '@/lib/estimate/types'

// 평단가 현황 바 — 주요 공종(m² 단위, 단가 > 0, 장비·고정수량·숨김 제외) 기준
// 단가합(mat+labor+exp) 표시. 사용 위치: EstimateEditorV5 탭 줄 오른쪽
//
// 주의: is_base 플래그는 현재 buildItems 경로에서 항상 false로 세팅되므로
// 해당 플래그에 의존하지 않고 unit/is_equipment/is_fixed_qty/단가로 필터링한다.
export default function BasePriceBar({ sheet }: { sheet: EstimateSheet }) {
  const baseItems = sheet.items.filter(i => {
    if (i.is_hidden) return false
    if (i.is_equipment) return false
    if (i.is_fixed_qty) return false
    if (i.unit !== 'm²') return false
    return (i.mat + i.labor + i.exp) > 0
  })
  if (baseItems.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pr-3 text-xs text-gray-600">
      {baseItems.map((item, idx) => {
        const unitPrice = item.mat + item.labor + item.exp
        return (
          <span key={`${item.name}-${idx}`} className="whitespace-nowrap">
            <span className="text-gray-500">{item.name}</span>{' '}
            <span className="font-semibold text-gray-800">{unitPrice.toLocaleString()}</span>
          </span>
        )
      })}
      <span className="text-gray-400">원/m²</span>
    </div>
  )
}
