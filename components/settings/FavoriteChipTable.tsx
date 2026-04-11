'use client'

import type { QuickChip } from '@/lib/estimate/quickChipConfig'
import { fm } from '@/lib/utils/format'

interface FavoriteChipTableProps {
  chips: QuickChip[]
  onChange: (next: QuickChip[]) => void
}

/**
 * 즐겨찾기 한 카테고리 내부의 칩 테이블 편집기.
 * FavoritesEditor 에서 카테고리마다 1개씩 렌더.
 */
export default function FavoriteChipTable({ chips, onChange }: FavoriteChipTableProps) {
  function update(idx: number, patch: Partial<QuickChip>) {
    onChange(chips.map((c, i) => (i === idx ? { ...c, ...patch } : c)))
  }
  function remove(idx: number) {
    onChange(chips.filter((_, i) => i !== idx))
  }
  function numField(val: number, handler: (v: number) => void) {
    return (
      <input
        type="number"
        min={0}
        value={val}
        onChange={(e) => handler(parseInt(e.target.value, 10) || 0)}
        className="w-20 rounded border border-gray-200 px-1.5 py-1 text-right text-xs tabular-nums"
      />
    )
  }

  return (
    <table className="w-full text-xs">
      <thead className="text-gray-500">
        <tr className="border-b border-gray-100">
          <th className="py-1 text-left font-medium">공종명</th>
          <th className="py-1 text-left font-medium">라벨</th>
          <th className="py-1 text-left font-medium w-14">단위</th>
          <th className="py-1 text-right font-medium w-20">재료</th>
          <th className="py-1 text-right font-medium w-20">노무</th>
          <th className="py-1 text-right font-medium w-20">경비</th>
          <th className="py-1 text-center font-medium w-10">장비</th>
          <th className="py-1 text-right font-medium w-20">합계</th>
          <th className="py-1 text-center font-medium w-10">×</th>
        </tr>
      </thead>
      <tbody>
        {chips.map((c, i) => (
          <tr key={i} className="border-b border-gray-50">
            <td className="py-1 pr-1">
              <input
                value={c.name}
                onChange={(e) => update(i, { name: e.target.value })}
                className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs"
              />
            </td>
            <td className="py-1 pr-1">
              <input
                value={c.label}
                onChange={(e) => update(i, { label: e.target.value })}
                className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs"
              />
            </td>
            <td className="py-1 pr-1">
              <input
                value={c.unit}
                onChange={(e) => update(i, { unit: e.target.value })}
                className="w-14 rounded border border-gray-200 px-1.5 py-1 text-xs"
              />
            </td>
            <td className="py-1 pr-1 text-right">{numField(c.mat, (v) => update(i, { mat: v }))}</td>
            <td className="py-1 pr-1 text-right">
              {numField(c.labor, (v) => update(i, { labor: v }))}
            </td>
            <td className="py-1 pr-1 text-right">{numField(c.exp, (v) => update(i, { exp: v }))}</td>
            <td className="py-1 pr-1 text-center">
              <input
                type="checkbox"
                checked={c.is_equipment}
                onChange={(e) => update(i, { is_equipment: e.target.checked })}
              />
            </td>
            <td className="py-1 pr-1 text-right tabular-nums text-gray-500">
              {fm(c.mat + c.labor + c.exp)}
            </td>
            <td className="py-1 text-center">
              <button
                onClick={() => remove(i)}
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
