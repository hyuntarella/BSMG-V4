'use client'

import type { Estimate } from '@/lib/estimate/types'

interface CoverSheetProps {
  estimate: Estimate
  onUpdate: (field: keyof Estimate, value: string | number) => void
}

export default function CoverSheet({ estimate, onUpdate }: CoverSheetProps) {
  return (
    <div className="space-y-6">
      {/* 제목 */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-brand">견 적 서</h2>
      </div>

      {/* 정보 그리드 */}
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="관리번호"
          value={estimate.mgmt_no ?? ''}
          onChange={(v) => onUpdate('mgmt_no', v)}
        />
        <Field
          label="일자"
          value={estimate.date}
          onChange={(v) => onUpdate('date', v)}
        />
        <Field
          label="고객명"
          value={estimate.customer_name ?? ''}
          onChange={(v) => onUpdate('customer_name', v)}
        />
        <Field
          label="현장명"
          value={estimate.site_name ?? ''}
          onChange={(v) => onUpdate('site_name', v)}
        />
        <Field
          label="담당자"
          value={estimate.manager_name ?? ''}
          onChange={(v) => onUpdate('manager_name', v)}
        />
        <Field
          label="연락처"
          value={estimate.manager_phone ?? ''}
          onChange={(v) => onUpdate('manager_phone', v)}
        />
      </div>

      {/* 면적 */}
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="면적 (m²)"
          value={String(estimate.m2)}
          onChange={(v) => onUpdate('m2', parseFloat(v) || 0)}
        />
        <Field
          label="벽체 면적 (m)"
          value={String(estimate.wall_m2)}
          onChange={(v) => onUpdate('wall_m2', parseFloat(v) || 0)}
        />
      </div>

      {/* 메모 */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">메모/특이사항</label>
        <textarea
          value={estimate.memo ?? ''}
          onChange={(e) => onUpdate('memo', e.target.value)}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      {/* 시트 요약 */}
      {estimate.sheets.length > 0 && (
        <div className="rounded-md bg-gray-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">견적 요약</h3>
          <div className="space-y-1">
            {estimate.sheets.map((sheet, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{sheet.title ?? sheet.type}</span>
                <span className="font-semibold tabular-nums">
                  {sheet.grand_total.toLocaleString()}원
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />
    </div>
  )
}
