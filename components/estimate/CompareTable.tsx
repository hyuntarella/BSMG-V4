import type { EstimateSheet, EstimateItem } from '@/lib/estimate/types'

// 비교 탭 공종별 단가 테이블 — 복합 vs 우레탄 단가합(mat+labor+exp) 나란히
// - 필터: !is_equipment && !is_hidden
// - 매칭: 공종명(name) 기준. 한쪽에만 있으면 '-' 표시
// - 차이: 우레탄 - 복합. 양수 빨강, 음수 파랑, 0 회색

interface Row {
  name: string
  composite: number | null
  urethane: number | null
}

function collect(sheet: EstimateSheet | undefined, key: 'composite' | 'urethane', map: Map<string, Row>) {
  if (!sheet) return
  sheet.items.forEach((it: EstimateItem) => {
    if (it.is_equipment) return
    if (it.is_hidden) return
    const price = it.mat + it.labor + it.exp
    const existing = map.get(it.name)
    if (existing) {
      existing[key] = price
    } else {
      map.set(it.name, { name: it.name, composite: null, urethane: null, [key]: price })
    }
  })
}

export default function CompareTable({
  compositeSheet,
  urethaneSheet,
}: {
  compositeSheet?: EstimateSheet
  urethaneSheet?: EstimateSheet
}) {
  if (!compositeSheet && !urethaneSheet) return null
  const map = new Map<string, Row>()
  collect(compositeSheet, 'composite', map)
  collect(urethaneSheet, 'urethane', map)
  const rows = Array.from(map.values())
  if (rows.length === 0) return null

  const fmt = (v: number | null) => (v === null ? '-' : v.toLocaleString())

  return (
    <div className="rounded-lg border bg-white p-4">
      <h4 className="mb-3 text-sm font-semibold text-gray-700">공종별 단가 비교</h4>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-xs text-gray-500">
              <th className="px-3 py-2 text-left font-medium">공종명</th>
              <th className="px-3 py-2 text-right font-medium text-blue-700">복합 단가합</th>
              <th className="px-3 py-2 text-right font-medium text-purple-700">우레탄 단가합</th>
              <th className="px-3 py-2 text-right font-medium">차이</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const bothPresent = row.composite !== null && row.urethane !== null
              const diff = bothPresent ? (row.urethane as number) - (row.composite as number) : null
              const diffColor =
                diff === null
                  ? 'text-gray-300'
                  : diff > 0
                  ? 'text-red-600'
                  : diff < 0
                  ? 'text-blue-600'
                  : 'text-gray-400'
              const diffText =
                diff === null
                  ? '-'
                  : diff === 0
                  ? '0'
                  : `${diff > 0 ? '+' : ''}${diff.toLocaleString()}`
              return (
                <tr key={row.name} className="border-b last:border-b-0">
                  <td className="px-3 py-2 text-gray-800">{row.name}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${row.composite === null ? 'text-gray-300' : 'text-gray-800'}`}>
                    {fmt(row.composite)}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${row.urethane === null ? 'text-gray-300' : 'text-gray-800'}`}>
                    {fmt(row.urethane)}
                  </td>
                  <td className={`px-3 py-2 text-right font-semibold tabular-nums ${diffColor}`}>{diffText}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
