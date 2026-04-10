import type { EstimateSheet } from '@/lib/estimate/types'

// 평단가 현황 바 — 선택 평단가 vs 실제 평단가 비교
//
// 실제 평단가 계산 (검증: supabase/price_matrix_pvalue_seed.json 대조):
//   sheet.items 중 아래 필터를 통과한 항목들의 (mat + labor + exp) 단가합.
//   - !is_hidden                 : 숨김 제외
//   - !is_equipment              : 장비(사다리차/스카이차/폐기물/드라이비트) 제외
//   - unit !== '식'              : lump(바탕조정제미장) 제외
//   - name !== '벽체 우레탄'     : 벽체(wall) 항목 제외
//
// 벽체 우레탄을 제외해야 하는 이유:
//   선택 평단가(price_per_pyeong, 원/m² 바닥면적 기준)는 바닥 m² 당
//   구성 공종 단가의 합으로 설계됐다. 벽체 우레탄은 qty=wallM² 로
//   벽체 면적에 곱해지는 별도 항목이라, 바닥 평단가 합산에 포함시키면
//   항상 wall 단가만큼 초과 계산된다 (ex. 복합 40000 → 49800).
//   P매트릭스 seed 전 42 조합에서 벽체 제외 시 선택 = 실제 일치 확인.
//
// 차이 = 실제 - 선택:
//   양수면 초과(빨강), 음수면 절감(파랑), 0이면 parenthetical 생략(전체 회색).
//
// m2 prop 은 과거 버전 호환용으로 optional 로 남겨둠 (미사용).
interface BasePriceBarProps {
  sheet: EstimateSheet
  m2?: number
}

export default function BasePriceBar({ sheet }: BasePriceBarProps) {
  const actual = sheet.items
    .filter(i =>
      !i.is_hidden &&
      !i.is_equipment &&
      i.unit !== '식' &&
      i.name !== '벽체 우레탄'
    )
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
