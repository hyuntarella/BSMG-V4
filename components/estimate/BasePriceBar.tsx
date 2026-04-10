import type { EstimateSheet } from '@/lib/estimate/types'

// 평단가 현황 바 — 선택 평단가 vs 실제 평단가 비교
//
// 실제 평단가 계산:
//   sheet.items 중 (!is_hidden && !is_equipment && unit !== '식') 만 선택하여
//   각 항목의 (mat + labor + exp) 단가합을 그대로 합산한다.
//   - grand_total / m2 는 사용하지 않음 (수량·총액 기반 역산은 의도와 다름)
//   - 벽체 우레탄(isWall)도 m² 단위이므로 포함
//
// 차이 = 실제 - 선택:
//   양수면 초과(빨강), 음수면 절감(파랑), 0이면 parenthetical 생략(전체 회색)
//
// m2 prop 은 과거 버전 호환용으로 optional 로 남겨둠 (미사용)
interface BasePriceBarProps {
  sheet: EstimateSheet
  m2?: number
}

export default function BasePriceBar({ sheet }: BasePriceBarProps) {
  const actual = sheet.items
    .filter(i => !i.is_hidden && !i.is_equipment && i.unit !== '식')
    .reduce((sum, i) => sum + i.mat + i.labor + i.exp, 0)
  const selected = sheet.price_per_pyeong
  const diff = actual - selected
  const zero = diff === 0
  const diffColor = diff > 0 ? 'text-red-600' : 'text-blue-600'
  const diffSign = diff > 0 ? '+' : ''
  return (
    <div className={`flex items-center gap-2 pr-3 text-xs ${zero ? 'text-gray-400' : ''}`}>
      <span className="text-gray-500">선택</span>
      <span className={`font-semibold ${zero ? 'text-gray-400' : 'text-gray-700'}`}>
        {selected.toLocaleString()}
      </span>
      <span className="text-gray-400">→</span>
      <span className="text-gray-500">실제</span>
      <span className={`font-semibold ${zero ? 'text-gray-400' : 'text-gray-900'}`}>
        {actual.toLocaleString()}
      </span>
      {!zero && (
        <span className={`font-semibold ${diffColor}`}>
          ({diffSign}{diff.toLocaleString()}원/m²)
        </span>
      )}
    </div>
  )
}
