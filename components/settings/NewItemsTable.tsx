'use client'

import type { NewItemEntry, NewItemsMap } from '@/hooks/useNewItems'
import { fm } from '@/lib/utils/format'

interface NewItemsTableProps {
  items: NewItemsMap
  onUpdate: (name: string, patch: Partial<NewItemEntry>) => void
  onRemove: (name: string) => void
  onPromoteFavorites: (name: string) => void
  onPromoteOther: (name: string) => void
}

export default function NewItemsTable({
  items,
  onUpdate,
  onRemove,
  onPromoteFavorites,
  onPromoteOther,
}: NewItemsTableProps) {
  const rows = Object.entries(items)
  if (rows.length === 0) {
    return (
      <p className="rounded border border-dashed border-gray-300 py-6 text-center text-xs text-gray-400">
        자동 등록된 신규 공종이 없습니다. 견적서 저장 시 규칙서에 없는 공종이 여기에 추가됩니다.
      </p>
    )
  }

  return (
    <table className="w-full text-xs">
      <thead className="border-b border-gray-200 text-gray-500">
        <tr>
          <th className="py-1 text-left font-medium">공종명</th>
          <th className="py-1 text-left font-medium w-14">단위</th>
          <th className="py-1 text-right font-medium w-20">재료</th>
          <th className="py-1 text-right font-medium w-20">노무</th>
          <th className="py-1 text-right font-medium w-20">경비</th>
          <th className="py-1 text-right font-medium w-20">합계</th>
          <th className="py-1 text-center font-medium w-40">액션</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([name, e]) => (
          <tr key={name} className="border-b border-gray-50">
            <td className="py-1 pr-1 font-medium text-gray-700">{name}</td>
            <td className="py-1 pr-1">
              <input
                value={e.unit}
                onChange={(ev) => onUpdate(name, { unit: ev.target.value })}
                className="w-14 rounded border border-gray-200 px-1.5 py-1 text-xs"
              />
            </td>
            <td className="py-1 pr-1 text-right">
              <NumCell value={e.mat} onChange={(v) => onUpdate(name, { mat: v })} />
            </td>
            <td className="py-1 pr-1 text-right">
              <NumCell value={e.labor} onChange={(v) => onUpdate(name, { labor: v })} />
            </td>
            <td className="py-1 pr-1 text-right">
              <NumCell value={e.exp} onChange={(v) => onUpdate(name, { exp: v })} />
            </td>
            <td className="py-1 pr-1 text-right tabular-nums text-gray-500">
              {fm(e.mat + e.labor + e.exp)}
            </td>
            <td className="py-1 text-center">
              <button
                onClick={() => onPromoteFavorites(name)}
                className="mr-1 rounded border border-blue-200 px-1.5 py-0.5 text-[11px] text-blue-600 hover:bg-blue-50"
              >
                즐겨찾기
              </button>
              <button
                onClick={() => onPromoteOther(name)}
                className="mr-1 rounded border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50"
              >
                기타
              </button>
              <button
                onClick={() => onRemove(name)}
                className="text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function NumCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      min={0}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
      className="w-20 rounded border border-gray-200 px-1.5 py-1 text-right text-xs tabular-nums"
    />
  )
}
