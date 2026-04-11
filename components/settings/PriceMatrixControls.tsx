'use client'

import type { AreaRange, Method } from '@/lib/estimate/types'

interface Props {
  areaRanges: readonly AreaRange[]
  methods: readonly Method[]
  areaRange: AreaRange
  method: Method
  onAreaRangeChange: (v: AreaRange) => void
  onMethodChange: (v: Method) => void
  toast: string | null
  saving: boolean
  canSave: boolean
  onSave: () => void
}

/**
 * 단가표 1단계 — 컨트롤 바.
 * 면적대/공법 드롭다운 + 저장 버튼 + 토스트.
 */
export default function PriceMatrixControls({
  areaRanges,
  methods,
  areaRange,
  method,
  onAreaRangeChange,
  onMethodChange,
  toast,
  saving,
  canSave,
  onSave,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-600">면적대</label>
        <select
          value={areaRange}
          onChange={(e) => onAreaRangeChange(e.target.value as AreaRange)}
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        >
          {areaRanges.map((ar) => (
            <option key={ar} value={ar}>
              {ar}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-600">공법</label>
        <select
          value={method}
          onChange={(e) => onMethodChange(e.target.value as Method)}
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        >
          {methods.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {toast && (
          <span className="rounded bg-green-100 px-3 py-1 text-sm text-green-700">
            {toast}
          </span>
        )}
        <button
          onClick={onSave}
          disabled={saving || !canSave}
          className="rounded bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  )
}
