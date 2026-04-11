'use client'

import {
  WARRANTY_OPTIONS,
  getWarrantyOption,
  formatWarrantyOption,
  DEFAULT_WARRANTY_OPTION_BY_METHOD,
  type WarrantyOption,
} from '@/lib/estimate/warrantyOptions'
import type { EstimateSheet } from '@/lib/estimate/types'

// ── 견적서 시트 하자보증 옵션 선택 드롭다운 ──
//
// 평단가 현황 바 옆에 배치. 선택 즉시 sheet.warranty_option 과 파생 years/bond 업데이트.
// 현재 옵션을 추론 불가한 레거시 시트는 메서드별 기본값으로 표시.

interface WarrantySelectProps {
  sheet: EstimateSheet
  onChange: (option: WarrantyOption) => void
}

export default function WarrantySelect({ sheet, onChange }: WarrantySelectProps) {
  const current = getWarrantyOption(sheet) ?? DEFAULT_WARRANTY_OPTION_BY_METHOD[sheet.type]

  return (
    <label className="flex items-center gap-1.5 pr-3 text-xs text-gray-500">
      <span className="shrink-0">하자보증</span>
      <select
        value={current}
        onChange={(e) => onChange(e.target.value as WarrantyOption)}
        data-testid={`warranty-select-${sheet.type}`}
        className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 outline-none focus:border-brand"
      >
        {WARRANTY_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt} ({formatWarrantyOption(opt)})
          </option>
        ))}
      </select>
    </label>
  )
}
