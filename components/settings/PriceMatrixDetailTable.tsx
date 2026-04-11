'use client'

import type { BaseItem } from '@/lib/estimate/types'
import { fm } from '@/lib/utils/format'

export interface PriceMatrixEditingCell {
  item_index: number
  field: 'mat' | 'labor' | 'exp'
}

interface Props {
  items: BaseItem[]
  ppp: number
  getCellValue: (
    ppp: number,
    itemIndex: number,
    field: 'mat' | 'labor' | 'exp',
  ) => number
  editingCell: PriceMatrixEditingCell | null
  editValue: string
  onStartEdit: (itemIndex: number, field: 'mat' | 'labor' | 'exp') => void
  onChangeEdit: (v: string) => void
  onCommitEdit: () => void
  onCancelEdit: () => void
}

/**
 * 단가표 3단계 — 선택된 평단가의 공종별 4열 표 (공종명/재료/인건/경비).
 * 가로 스크롤 없이 페이지 폭에 맞는 고정 비율 (40/20/20/20).
 * 인라인 편집 로직은 부모(PriceMatrixEditor) 가 관리하고 표는 순수 렌더.
 */
export default function PriceMatrixDetailTable({
  items,
  ppp,
  getCellValue,
  editingCell,
  editValue,
  onStartEdit,
  onChangeEdit,
  onCommitEdit,
  onCancelEdit,
}: Props) {
  return (
    <div>
      <div className="mb-2 text-sm text-gray-500">
        평당 <span className="font-medium text-gray-700">{fm(ppp)}원</span> 기준
      </div>
      <table
        className="w-full table-fixed border-collapse text-sm"
        data-testid="price-matrix-detail-table"
      >
        <colgroup>
          <col className="w-[40%]" />
          <col className="w-[20%]" />
          <col className="w-[20%]" />
          <col className="w-[20%]" />
        </colgroup>
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-200 px-3 py-2 text-left text-xs font-medium text-gray-600">
              공종
            </th>
            <th className="border border-gray-200 px-3 py-2 text-right text-xs font-medium text-gray-600">
              재료
            </th>
            <th className="border border-gray-200 px-3 py-2 text-right text-xs font-medium text-gray-600">
              인건
            </th>
            <th className="border border-gray-200 px-3 py-2 text-right text-xs font-medium text-gray-600">
              경비
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              <td className="border border-gray-200 px-3 py-2 font-medium text-gray-700 whitespace-pre-line">
                {item.name}
              </td>
              {(['mat', 'labor', 'exp'] as const).map((field) => {
                const isEditing =
                  editingCell?.item_index === idx && editingCell?.field === field
                const val = getCellValue(ppp, idx, field)
                return (
                  <td
                    key={field}
                    className={`border border-gray-200 text-right font-mono tabular-nums ${
                      isEditing
                        ? 'bg-yellow-50 p-0'
                        : 'cursor-pointer px-3 py-2 hover:bg-blue-50'
                    }`}
                    onClick={() => !isEditing && onStartEdit(idx, field)}
                    data-testid={`price-cell-${idx}-${field}`}
                  >
                    {isEditing ? (
                      <input
                        autoFocus
                        type="number"
                        value={editValue}
                        onChange={(e) => onChangeEdit(e.target.value)}
                        onBlur={onCommitEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onCommitEdit()
                          if (e.key === 'Escape') onCancelEdit()
                        }}
                        className="w-full bg-yellow-50 px-3 py-2 text-right font-mono outline-none"
                      />
                    ) : (
                      fm(val)
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
