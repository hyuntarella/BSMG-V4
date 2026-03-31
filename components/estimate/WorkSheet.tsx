'use client'

import { useState } from 'react'
import type { EstimateSheet, EstimateItem, CalcResult } from '@/lib/estimate/types'
import { calc } from '@/lib/estimate/calc'
import { fm } from '@/lib/utils/format'
import InlineCell from './InlineCell'
import MarginGauge from './MarginGauge'
import AddItemModal from './AddItemModal'

interface WorkSheetProps {
  sheet: EstimateSheet
  m2: number
  margin: number
  onItemChange: (itemIndex: number, field: string, value: number) => void
  onSheetChange: (field: string, value: number) => void
  onAddItem?: (item: Partial<EstimateItem>) => void
}

export default function WorkSheet({
  sheet,
  m2,
  margin,
  onItemChange,
  onSheetChange,
  onAddItem,
}: WorkSheetProps) {
  const [addModalOpen, setAddModalOpen] = useState(false)
  const calcResult: CalcResult = calc(sheet.items)
  const pyeong = (m2 / 3.306).toFixed(1)

  return (
    <div className="space-y-3">
      {/* 상단 정보 바 */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg bg-white p-3 shadow-sm">
        <div className="text-sm">
          <span className="text-gray-500">면적</span>{' '}
          <span className="font-semibold">{fm(m2)}m²</span>
          <span className="ml-1 text-xs text-gray-400">({pyeong}평)</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-500">평단가</span>{' '}
          <span className="font-semibold">
            <InlineCell
              value={sheet.price_per_pyeong}
              onSave={(v) => onSheetChange('price_per_pyeong', v as number)}
              className="inline-block w-20"
            />
          </span>
          <span className="text-xs text-gray-400">원/평</span>
        </div>
        <MarginGauge margin={margin} />
      </div>

      {/* 공종 테이블 */}
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-brand text-white">
              <th className="w-8 px-1 py-2 text-center">#</th>
              <th className="min-w-[100px] px-2 py-2 text-left">품명</th>
              <th className="min-w-[80px] px-1 py-2 text-left">규격</th>
              <th className="w-10 px-1 py-2 text-center">단위</th>
              <th className="w-14 px-1 py-2 text-right">수량</th>
              <th className="w-16 px-1 py-2 text-right">재료비</th>
              <th className="w-16 px-1 py-2 text-right">노무비</th>
              <th className="w-16 px-1 py-2 text-right">경비</th>
              <th className="w-20 px-1 py-2 text-right">금액</th>
            </tr>
          </thead>
          <tbody>
            {sheet.items.map((item, idx) => (
              <tr
                key={idx}
                className={`border-b hover:bg-blue-50 ${
                  item.is_equipment ? 'bg-amber-50' : ''
                }`}
              >
                <td className="px-1 py-1.5 text-center text-gray-400">
                  {item.sort_order}
                </td>
                <td className="px-2 py-1.5 font-medium">{item.name}</td>
                <td className="px-1 py-1.5 text-gray-500">{item.spec}</td>
                <td className="px-1 py-1.5 text-center text-gray-500">{item.unit}</td>
                <td className="px-1 py-1.5">
                  <InlineCell
                    value={item.qty}
                    onSave={(v) => onItemChange(idx, 'qty', v as number)}
                  />
                </td>
                <td className="px-1 py-1.5">
                  <InlineCell
                    value={item.mat}
                    onSave={(v) => onItemChange(idx, 'mat', v as number)}
                  />
                </td>
                <td className="px-1 py-1.5">
                  <InlineCell
                    value={item.labor}
                    onSave={(v) => onItemChange(idx, 'labor', v as number)}
                  />
                </td>
                <td className="px-1 py-1.5">
                  <InlineCell
                    value={item.exp}
                    onSave={(v) => onItemChange(idx, 'exp', v as number)}
                  />
                </td>
                <td className="px-1 py-1.5 text-right font-medium tabular-nums">
                  {fm(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 합계 영역 */}
        <div className="border-t-2 border-brand bg-gray-50 px-3 py-2">
          <SummaryRow label="소계" value={calcResult.subtotal} />
          <SummaryRow label="공과잡비 (3%)" value={calcResult.overhead} />
          <SummaryRow label="기업이윤 (6%)" value={calcResult.profit} />
          <SummaryRow label="계" value={calcResult.totalBeforeRound} />
          <div className="mt-1 flex justify-between border-t pt-1">
            <span className="text-sm font-bold text-brand">합계 (10만원 절사)</span>
            <span className="text-base font-bold tabular-nums text-brand">
              {fm(calcResult.grandTotal)}원
            </span>
          </div>
        </div>
      </div>

      {/* 공종 추가 버튼 */}
      {onAddItem && (
        <button
          onClick={() => setAddModalOpen(true)}
          className="w-full rounded border border-dashed border-gray-300 py-2 text-xs text-gray-500 hover:bg-gray-50"
        >
          + 공종 추가
        </button>
      )}

      {/* 공종 추가 모달 */}
      <AddItemModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={(item) => {
          onAddItem?.(item)
          setAddModalOpen(false)
        }}
      />
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between py-0.5 text-xs text-gray-600">
      <span>{label}</span>
      <span className="tabular-nums">{fm(value)}</span>
    </div>
  )
}
