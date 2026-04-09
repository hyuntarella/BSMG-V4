'use client'

import { useCallback } from 'react'
import type { Estimate } from '@/lib/estimate/types'

interface CustomerInfoCardProps {
  estimate: Estimate
  onMetaChange: (field: keyof Estimate, value: string | number) => void
  onAreaChange: (m2: number) => void
  isLens?: boolean
}

export default function CustomerInfoCard({
  estimate,
  onMetaChange,
  onAreaChange,
  isLens = false,
}: CustomerInfoCardProps) {
  const handleChange = useCallback(
    (field: keyof Estimate) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const val = e.target.type === 'number' ? Number(e.target.value) : e.target.value
      if (field === 'm2') {
        onAreaChange(Number(e.target.value))
      } else {
        onMetaChange(field, val)
      }
    },
    [onMetaChange, onAreaChange],
  )

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        {/* 관리번호 */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">관리번호</label>
          <p className="text-sm font-semibold text-gray-800">{estimate.mgmt_no ?? '-'}</p>
        </div>

        {/* 견적일 */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">견적일</label>
          <input
            type="date"
            value={estimate.date ?? ''}
            onChange={handleChange('date')}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </div>

        {/* 고객명 */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            고객명
            {isLens && estimate.source === 'lens' && (
              <span className="ml-1 text-[10px] text-green-600">lens</span>
            )}
          </label>
          <input
            type="text"
            value={estimate.customer_name ?? ''}
            onChange={handleChange('customer_name')}
            placeholder="고객명"
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </div>

        {/* 현장 주소 */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            주소
            {isLens && estimate.source === 'lens' && (
              <span className="ml-1 text-[10px] text-green-600">lens</span>
            )}
          </label>
          <input
            type="text"
            value={estimate.site_name ?? ''}
            onChange={handleChange('site_name')}
            placeholder="현장 주소"
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </div>

        {/* 공사명 */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">공사명</label>
          <select
            value="옥상"
            disabled
            className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-1 text-sm text-gray-600"
          >
            <option value="옥상">옥상 방수공사</option>
          </select>
          <p className="mt-0.5 text-[10px] text-gray-400">Phase 4: 옥상 고정</p>
        </div>

        {/* 면적 */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">면적 (m2)</label>
          <input
            type="number"
            value={estimate.m2 || ''}
            onChange={handleChange('m2')}
            placeholder="85"
            min={1}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </div>

        {/* 담당자 */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">담당자</label>
          <input
            type="text"
            value={estimate.manager_name ?? ''}
            onChange={handleChange('manager_name')}
            placeholder="담당자명"
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </div>

        {/* 특기사항 */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">특기사항</label>
          <textarea
            value={estimate.memo ?? ''}
            onChange={handleChange('memo')}
            placeholder="하자보수 5년..."
            rows={1}
            className="w-full resize-none rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </div>
      </div>
    </div>
  )
}
