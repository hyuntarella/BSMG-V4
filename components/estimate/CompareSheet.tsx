'use client'

import type { EstimateSheet, EstimateItem } from '@/lib/estimate/types'
import { fm } from '@/lib/utils/format'
import { calc } from '@/lib/estimate/calc'
import { getMarginDisplay } from '@/lib/estimate/costBreakdown'

interface CompareSheetProps {
  sheets: EstimateSheet[]
  m2: number
}

interface AlignedRow {
  complexItem: EstimateItem | null
  urethaneItem: EstimateItem | null
  name: string
}

export default function CompareSheet({ sheets, m2 }: CompareSheetProps) {
  const complex = sheets.find(s => s.type === '복합')
  const urethane = sheets.find(s => s.type === '우레탄')

  if (!complex && !urethane) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-400">
        비교할 시트가 없습니다
      </div>
    )
  }

  const pyeong = m2 / 3.306
  const cCalc = complex ? calc(complex.items) : null
  const uCalc = urethane ? calc(urethane.items) : null

  // 행 정렬: 같은 이름 공종끼리 매칭, 없으면 공행
  const aligned = alignRows(complex?.items ?? [], urethane?.items ?? [])

  const cMargin = complex ? getMarginDisplay(complex.price_per_pyeong, pyeong) : null
  const uMargin = urethane ? getMarginDisplay(urethane.price_per_pyeong, pyeong) : null

  return (
    <div className="mx-auto max-w-[1100px] bg-white p-4">
      <h3 className="mb-3 text-center text-sm font-bold">복합 vs 우레탄 비교</h3>

      {/* 요약 카드 */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        {complex && cCalc && (
          <SummaryCard
            title="복합방수"
            color="blue"
            grandTotal={cCalc.grandTotal}
            ppp={complex.price_per_pyeong}
            externalPpp={pyeong > 0 ? Math.round(cCalc.grandTotal / pyeong) : 0}
            margin={cMargin}
            itemCount={complex.items.length}
          />
        )}
        {urethane && uCalc && (
          <SummaryCard
            title="우레탄방수"
            color="purple"
            grandTotal={uCalc.grandTotal}
            ppp={urethane.price_per_pyeong}
            externalPpp={pyeong > 0 ? Math.round(uCalc.grandTotal / pyeong) : 0}
            margin={uMargin}
            itemCount={urethane.items.length}
          />
        )}
      </div>

      {/* 차이 요약 */}
      {cCalc && uCalc && (
        <div className="mb-4 rounded-lg bg-gray-100 px-4 py-2 text-center text-sm">
          {cCalc.grandTotal >= uCalc.grandTotal ? '복합' : '우레탄'}이{' '}
          <span className="font-bold text-brand">{fm(Math.abs(cCalc.grandTotal - uCalc.grandTotal))}원</span> 높음
        </div>
      )}

      {/* 행 정렬 비교 테이블 */}
      <div className="overflow-x-auto rounded border border-gray-300">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-gray-900 text-white">
              <th className="border-r border-gray-600 px-2 py-1.5 text-left min-w-[90px]">품명</th>
              {/* 복합 */}
              <th className="border-r border-gray-600 px-1 py-1.5 text-right w-14 bg-blue-900">수량</th>
              <th className="border-r border-gray-600 px-1 py-1.5 text-right w-14 bg-blue-900">재료</th>
              <th className="border-r border-gray-600 px-1 py-1.5 text-right w-14 bg-blue-900">노무</th>
              <th className="border-r border-gray-600 px-1 py-1.5 text-right w-16 bg-blue-900">금액</th>
              {/* 우레탄 */}
              <th className="border-r border-gray-600 px-1 py-1.5 text-right w-14 bg-purple-900">수량</th>
              <th className="border-r border-gray-600 px-1 py-1.5 text-right w-14 bg-purple-900">재료</th>
              <th className="border-r border-gray-600 px-1 py-1.5 text-right w-14 bg-purple-900">노무</th>
              <th className="border-r border-gray-600 px-1 py-1.5 text-right w-16 bg-purple-900">금액</th>
              {/* 차이 */}
              <th className="px-1 py-1.5 text-right w-16">차이</th>
            </tr>
          </thead>
          <tbody>
            {aligned.map((row, idx) => {
              const c = row.complexItem
              const u = row.urethaneItem
              const diff = (c?.total ?? 0) - (u?.total ?? 0)

              return (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-2 py-1 font-medium">{row.name}</td>
                  {/* 복합 */}
                  <td className={`px-1 py-1 text-right ${!c ? 'bg-gray-50' : 'bg-blue-50/30'}`}>
                    {c ? fm(c.qty) : ''}
                  </td>
                  <td className={`px-1 py-1 text-right ${!c ? 'bg-gray-50' : 'bg-blue-50/30'}`}>
                    {c ? fm(c.mat) : ''}
                  </td>
                  <td className={`px-1 py-1 text-right ${!c ? 'bg-gray-50' : 'bg-blue-50/30'}`}>
                    {c ? fm(c.labor) : ''}
                  </td>
                  <td className={`px-1 py-1 text-right font-medium tabular-nums ${!c ? 'bg-gray-50' : 'bg-blue-50/30'}`}>
                    {c ? fm(c.total) : ''}
                  </td>
                  {/* 우레탄 */}
                  <td className={`px-1 py-1 text-right ${!u ? 'bg-gray-50' : 'bg-purple-50/30'}`}>
                    {u ? fm(u.qty) : ''}
                  </td>
                  <td className={`px-1 py-1 text-right ${!u ? 'bg-gray-50' : 'bg-purple-50/30'}`}>
                    {u ? fm(u.mat) : ''}
                  </td>
                  <td className={`px-1 py-1 text-right ${!u ? 'bg-gray-50' : 'bg-purple-50/30'}`}>
                    {u ? fm(u.labor) : ''}
                  </td>
                  <td className={`px-1 py-1 text-right font-medium tabular-nums ${!u ? 'bg-gray-50' : 'bg-purple-50/30'}`}>
                    {u ? fm(u.total) : ''}
                  </td>
                  {/* 차이 */}
                  <td className={`px-1 py-1 text-right tabular-nums ${
                    diff > 0 ? 'text-red-500' : diff < 0 ? 'text-blue-500' : 'text-gray-300'
                  }`}>
                    {c && u ? (diff > 0 ? '+' : '') + fm(diff) : ''}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* 합계 비교 */}
        <div className="border-t-2 border-gray-900 bg-gray-50 px-3 py-2">
          <div className="flex justify-between text-xs font-bold">
            <span>합계</span>
            <div className="flex gap-6">
              <span className="text-blue-700">{cCalc ? fm(cCalc.grandTotal) : '-'}</span>
              <span className="text-purple-700">{uCalc ? fm(uCalc.grandTotal) : '-'}</span>
              {cCalc && uCalc && (
                <span className="text-brand">
                  {fm(Math.abs(cCalc.grandTotal - uCalc.grandTotal))}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 행 정렬 알고리즘 ──
function alignRows(complexItems: EstimateItem[], urethaneItems: EstimateItem[]): AlignedRow[] {
  const result: AlignedRow[] = []
  const usedU = new Set<number>()

  // 복합 기준으로 우레탄에서 같은 이름 찾기
  for (const cItem of complexItems) {
    const uIdx = urethaneItems.findIndex((u, i) =>
      !usedU.has(i) && (u.name === cItem.name || u.name.includes(cItem.name) || cItem.name.includes(u.name))
    )
    if (uIdx >= 0) {
      usedU.add(uIdx)
      result.push({ complexItem: cItem, urethaneItem: urethaneItems[uIdx], name: cItem.name })
    } else {
      result.push({ complexItem: cItem, urethaneItem: null, name: cItem.name })
    }
  }

  // 우레탄에만 있는 항목
  urethaneItems.forEach((uItem, i) => {
    if (!usedU.has(i)) {
      result.push({ complexItem: null, urethaneItem: uItem, name: uItem.name })
    }
  })

  return result
}

// ── 요약 카드 ──
function SummaryCard({
  title,
  color,
  grandTotal,
  ppp,
  externalPpp,
  margin,
  itemCount,
}: {
  title: string
  color: 'blue' | 'purple'
  grandTotal: number
  ppp: number
  externalPpp: number
  margin: ReturnType<typeof getMarginDisplay> | null
  itemCount: number
}) {
  const borderColor = color === 'blue' ? 'border-blue-200' : 'border-purple-200'
  const bgColor = color === 'blue' ? 'bg-blue-50' : 'bg-purple-50'
  const titleColor = color === 'blue' ? 'text-blue-700' : 'text-purple-700'

  return (
    <div className={`rounded-lg border-2 p-3 ${borderColor} ${bgColor}`}>
      <h4 className={`mb-2 text-center text-sm font-bold ${titleColor}`}>{title}</h4>
      <div className="space-y-1 text-xs">
        <Row label="공사금액" value={`${fm(grandTotal)}원`} bold />
        <Row label="내부 단가" value={`${fm(ppp)}원/㎡`} />
        <Row label="고객 평단가" value={`${fm(externalPpp)}원/평`} />
        <Row label="공종 수" value={`${itemCount}개`} />
        {margin && (
          <Row
            label="마진"
            value={margin.formatted}
            bold
            valueColor={margin.current >= 50 ? 'text-green-600' : margin.current >= 40 ? 'text-yellow-600' : 'text-red-600'}
          />
        )}
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  bold = false,
  valueColor = '',
}: {
  label: string
  value: string
  bold?: boolean
  valueColor?: string
}) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}</span>
      <span className={`tabular-nums ${bold ? 'font-bold' : ''} ${valueColor}`}>{value}</span>
    </div>
  )
}
