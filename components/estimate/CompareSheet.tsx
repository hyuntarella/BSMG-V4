'use client'

import type { EstimateSheet } from '@/lib/estimate/types'
import { fm } from '@/lib/utils/format'
import { calc } from '@/lib/estimate/calc'
import { getMargin } from '@/lib/estimate/margin'

interface CompareSheetProps {
  sheets: EstimateSheet[]
  m2: number
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

  return (
    <div className="space-y-4">
      <h3 className="text-center text-sm font-semibold text-gray-700">
        복합 vs 우레탄 비교
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {complex && <SheetCard sheet={complex} m2={m2} />}
        {urethane && <SheetCard sheet={urethane} m2={m2} />}
      </div>

      {/* 차이 요약 */}
      {complex && urethane && <DiffSummary complex={complex} urethane={urethane} />}
    </div>
  )
}

function SheetCard({ sheet, m2 }: { sheet: EstimateSheet; m2: number }) {
  const result = calc(sheet.items)
  const margin = getMargin(sheet.type, m2, result.grandTotal)
  const isComplex = sheet.type === '복합'

  return (
    <div
      className={`rounded-lg border-2 p-4 ${
        isComplex ? 'border-blue-200 bg-blue-50' : 'border-purple-200 bg-purple-50'
      }`}
    >
      <h4
        className={`mb-3 text-center text-sm font-bold ${
          isComplex ? 'text-blue-700' : 'text-purple-700'
        }`}
      >
        {sheet.title ?? sheet.type}
      </h4>

      <div className="space-y-2">
        <Row label="공사금액" value={`${fm(result.grandTotal)}원`} bold />
        <Row label="평단가" value={`${fm(sheet.price_per_pyeong)}원/평`} />
        <Row label="공종 수" value={`${sheet.items.length}개`} />
        <Row label="소계" value={`${fm(result.subtotal)}원`} />
        <Row label="공과잡비" value={`${fm(result.overhead)}원`} />
        <Row label="기업이윤" value={`${fm(result.profit)}원`} />
        <div className="border-t pt-1">
          <Row
            label="마진율"
            value={`${margin.toFixed(1)}%`}
            bold
            valueColor={
              margin >= 50 ? 'text-green-600' : margin >= 45 ? 'text-yellow-600' : 'text-red-600'
            }
          />
        </div>
      </div>
    </div>
  )
}

function DiffSummary({
  complex,
  urethane,
}: {
  complex: EstimateSheet
  urethane: EstimateSheet
}) {
  const cResult = calc(complex.items)
  const uResult = calc(urethane.items)
  const diff = cResult.grandTotal - uResult.grandTotal
  const higher = diff > 0 ? '복합' : '우레탄'

  return (
    <div className="rounded-lg bg-gray-100 p-3 text-center text-sm">
      <span className="font-medium">{higher}</span>이{' '}
      <span className="font-bold tabular-nums text-brand">{fm(Math.abs(diff))}원</span>{' '}
      높음
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
    <div className="flex justify-between text-xs">
      <span className="text-gray-600">{label}</span>
      <span
        className={`tabular-nums ${bold ? 'font-bold' : ''} ${valueColor}`}
      >
        {value}
      </span>
    </div>
  )
}
