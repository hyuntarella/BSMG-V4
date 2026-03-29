'use client'

import type { EstimateSheet, EstimateItem } from '@/lib/estimate/types'
import { fm } from '@/lib/utils/format'
import { calc } from '@/lib/estimate/calc'
import { getMarginDisplay } from '@/lib/estimate/costBreakdown'

interface CompareSheetProps {
  sheets: EstimateSheet[]
  m2: number
}

/** 같은 공종끼리 행 정렬 */
interface AlignedRow {
  name: string
  cItem: EstimateItem | null
  uItem: EstimateItem | null
}

export default function CompareSheet({ sheets, m2 }: CompareSheetProps) {
  const complex = sheets.find(s => s.type === '복합')
  const urethane = sheets.find(s => s.type === '우레탄')

  if (!complex && !urethane) {
    return <div className="flex h-40 items-center justify-center text-sm text-gray-400">비교할 시트가 없습니다</div>
  }

  const cCalc = complex ? calc(complex.items) : null
  const uCalc = urethane ? calc(urethane.items) : null
  const pyeong = m2 / 3.306
  const cMargin = complex ? getMarginDisplay(complex.price_per_pyeong, pyeong) : null
  const uMargin = urethane ? getMarginDisplay(urethane.price_per_pyeong, pyeong) : null
  const aligned = alignRows(complex?.items ?? [], urethane?.items ?? [])

  return (
    <div className="mx-auto max-w-[1200px] bg-white p-3">
      <h3 className="mb-3 text-center text-sm font-bold">복합 vs 우레탄 비교</h3>

      {/* 차이 요약 */}
      {cCalc && uCalc && (
        <div className="mb-3 rounded bg-gray-100 px-3 py-2 text-center text-sm">
          {cCalc.grandTotal >= uCalc.grandTotal ? '복합' : '우레탄'}이{' '}
          <span className="font-bold text-brand">{fm(Math.abs(cCalc.grandTotal - uCalc.grandTotal))}원</span> 높음
          {cMargin && uMargin && (
            <span className="ml-3 text-xs text-gray-500">
              복합 마진 {cMargin.formatted} / 우레탄 마진 {uMargin.formatted}
            </span>
          )}
        </div>
      )}

      {/* 양옆 세부내역 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr>
              {/* 복합 헤더 */}
              <th colSpan={5} className="bg-blue-900 px-2 py-1.5 text-center text-white">
                복합방수 {cCalc ? fm(cCalc.grandTotal) + '원' : ''}
              </th>
              {/* 품명 (공유 열) */}
              <th rowSpan={2} className="bg-gray-900 px-2 py-1.5 text-center text-white min-w-[80px]">품명</th>
              {/* 우레탄 헤더 */}
              <th colSpan={5} className="bg-purple-900 px-2 py-1.5 text-center text-white">
                우레탄방수 {uCalc ? fm(uCalc.grandTotal) + '원' : ''}
              </th>
            </tr>
            <tr className="text-white">
              <th className="bg-blue-800 px-1 py-1 text-right w-10">수량</th>
              <th className="bg-blue-800 px-1 py-1 text-right w-12">재료</th>
              <th className="bg-blue-800 px-1 py-1 text-right w-12">노무</th>
              <th className="bg-blue-800 px-1 py-1 text-right w-12">경비</th>
              <th className="bg-blue-800 px-1 py-1 text-right w-16">금액</th>
              <th className="bg-purple-800 px-1 py-1 text-right w-10">수량</th>
              <th className="bg-purple-800 px-1 py-1 text-right w-12">재료</th>
              <th className="bg-purple-800 px-1 py-1 text-right w-12">노무</th>
              <th className="bg-purple-800 px-1 py-1 text-right w-12">경비</th>
              <th className="bg-purple-800 px-1 py-1 text-right w-16">금액</th>
            </tr>
          </thead>
          <tbody>
            {aligned.map((row, idx) => (
              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                {/* 복합 */}
                <td className={`px-1 py-1 text-right ${row.cItem ? 'bg-blue-50/30' : 'bg-gray-50'}`}>{row.cItem ? fm(row.cItem.qty) : ''}</td>
                <td className={`px-1 py-1 text-right ${row.cItem ? 'bg-blue-50/30' : 'bg-gray-50'}`}>{row.cItem ? fm(row.cItem.mat) : ''}</td>
                <td className={`px-1 py-1 text-right ${row.cItem ? 'bg-blue-50/30' : 'bg-gray-50'}`}>{row.cItem ? fm(row.cItem.labor) : ''}</td>
                <td className={`px-1 py-1 text-right ${row.cItem ? 'bg-blue-50/30' : 'bg-gray-50'}`}>{row.cItem ? fm(row.cItem.exp) : ''}</td>
                <td className={`px-1 py-1 text-right font-medium tabular-nums ${row.cItem ? 'bg-blue-50/30' : 'bg-gray-50'}`}>{row.cItem ? fm(row.cItem.total) : ''}</td>
                {/* 품명 (가운데) */}
                <td className="px-2 py-1 text-center font-medium bg-gray-50">{row.name}</td>
                {/* 우레탄 */}
                <td className={`px-1 py-1 text-right ${row.uItem ? 'bg-purple-50/30' : 'bg-gray-50'}`}>{row.uItem ? fm(row.uItem.qty) : ''}</td>
                <td className={`px-1 py-1 text-right ${row.uItem ? 'bg-purple-50/30' : 'bg-gray-50'}`}>{row.uItem ? fm(row.uItem.mat) : ''}</td>
                <td className={`px-1 py-1 text-right ${row.uItem ? 'bg-purple-50/30' : 'bg-gray-50'}`}>{row.uItem ? fm(row.uItem.labor) : ''}</td>
                <td className={`px-1 py-1 text-right ${row.uItem ? 'bg-purple-50/30' : 'bg-gray-50'}`}>{row.uItem ? fm(row.uItem.exp) : ''}</td>
                <td className={`px-1 py-1 text-right font-medium tabular-nums ${row.uItem ? 'bg-purple-50/30' : 'bg-gray-50'}`}>{row.uItem ? fm(row.uItem.total) : ''}</td>
              </tr>
            ))}
          </tbody>
          {/* 합계 행 */}
          <tfoot>
            <tr className="border-t-2 border-gray-900 font-bold">
              <td colSpan={4} className="bg-blue-50 px-2 py-1.5 text-right">합계</td>
              <td className="bg-blue-50 px-1 py-1.5 text-right tabular-nums">{cCalc ? fm(cCalc.grandTotal) : '-'}</td>
              <td className="bg-gray-100 px-2 py-1.5 text-center" />
              <td colSpan={4} className="bg-purple-50 px-2 py-1.5 text-right">합계</td>
              <td className="bg-purple-50 px-1 py-1.5 text-right tabular-nums">{uCalc ? fm(uCalc.grandTotal) : '-'}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function alignRows(complexItems: EstimateItem[], urethaneItems: EstimateItem[]): AlignedRow[] {
  const result: AlignedRow[] = []
  const usedU = new Set<number>()

  for (const cItem of complexItems) {
    const uIdx = urethaneItems.findIndex((u, i) =>
      !usedU.has(i) && (u.name === cItem.name || u.name.includes(cItem.name) || cItem.name.includes(u.name))
    )
    if (uIdx >= 0) {
      usedU.add(uIdx)
      result.push({ name: cItem.name, cItem, uItem: urethaneItems[uIdx] })
    } else {
      result.push({ name: cItem.name, cItem, uItem: null })
    }
  }

  urethaneItems.forEach((uItem, i) => {
    if (!usedU.has(i)) result.push({ name: uItem.name, cItem: null, uItem })
  })

  return result
}
