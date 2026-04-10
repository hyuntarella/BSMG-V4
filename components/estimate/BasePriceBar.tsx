import type { EstimateSheet } from '@/lib/estimate/types'

// 평단가 현황 바 — 선택 평단가 vs 실제 평단가 비교
// - 선택: sheet.price_per_pyeong (칩/직접입력으로 고른 목표 단가)
// - 실제: sheet.grand_total / m2 (현재 테이블 합산 단가)
// - 차이: 실제 - 선택 (양수=초과 빨강, 음수=절감 파랑, 0=회색)
// 사용 위치: EstimateEditorV5 / EstimateEditor 탭 줄 오른쪽
export default function BasePriceBar({ sheet, m2 }: { sheet: EstimateSheet; m2: number }) {
  if (m2 <= 0) return null
  const selected = sheet.price_per_pyeong
  const actual = Math.round(sheet.grand_total / m2)
  const diff = actual - selected
  const diffColor =
    diff > 0 ? 'text-red-600' : diff < 0 ? 'text-blue-600' : 'text-gray-400'
  const diffSign = diff > 0 ? '+' : ''
  return (
    <div className="flex items-center gap-2 pr-3 text-xs">
      <span className="text-gray-500">선택</span>
      <span className="font-semibold text-gray-700">{selected.toLocaleString()}</span>
      <span className="text-gray-400">→</span>
      <span className="text-gray-500">실제</span>
      <span className="font-semibold text-gray-900">{actual.toLocaleString()}</span>
      <span className={`font-semibold ${diffColor}`}>
        ({diffSign}{diff.toLocaleString()}원/m²)
      </span>
    </div>
  )
}
