import type { EstimateSheet } from '@/lib/estimate/types'

// 평단가 현황 바 — is_base=true 항목 기준, 단가합(mat+labor+exp) 표시
// 사용 위치: EstimateEditorV5 탭 줄 오른쪽
export default function BasePriceBar({ sheet }: { sheet: EstimateSheet }) {
  const baseItems = sheet.items.filter(i => i.is_base && !i.is_hidden)
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
