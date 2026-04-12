'use client'

import { useCallback } from 'react'
import type { Estimate } from '@/lib/estimate/types'

interface CustomerInfoCardProps {
  estimate: Estimate
  onMetaChange: (field: keyof Estimate, value: string | number | boolean) => void
  onAreaChange: (m2: number) => void
  isLens?: boolean
}

const inputCls =
  'w-full h-8 rounded-[7px] border border-v-b bg-v-hov px-[9px] py-[6px] text-[12.5px] font-sans transition-all focus:outline-none focus:bg-white focus:border-v-accent focus:ring-[3px] focus:ring-[rgba(0,122,255,.15)]'
const labelCls = 'block text-[10px] font-semibold text-v-mut tracking-wider mb-[2px]'

export default function CustomerInfoCard({
  estimate,
  onMetaChange,
  onAreaChange,
  isLens = false,
}: CustomerInfoCardProps) {
  const handleChange = useCallback(
    (field: keyof Estimate) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
    <div className="bg-white px-3 py-2">
      <div className="grid gap-2" style={{ gridTemplateColumns: '140px 130px 140px 1fr 1.6fr' }}>
        {/* 관리번호 */}
        <div>
          <label className={labelCls}>관리번호</label>
          <input
            value={estimate.mgmt_no ?? ''}
            readOnly
            className={`${inputCls} text-v-mut`}
          />
        </div>

        {/* 견적일 */}
        <div>
          <label className={labelCls}>견적일</label>
          <input
            type="date"
            value={estimate.date ?? ''}
            onChange={handleChange('date')}
            className={inputCls}
          />
        </div>

        {/* 담당자 */}
        <div>
          <label className={labelCls}>담당자</label>
          <select
            value={estimate.manager_name ?? ''}
            onChange={handleChange('manager_name')}
            className={inputCls}
          >
            <option value="">{estimate.manager_name || '-'}</option>
          </select>
        </div>

        {/* 고객명 */}
        <div>
          <label className={labelCls}>
            고객명
            {isLens && estimate.source === 'lens' && (
              <span className="ml-1 text-[10px] text-green-600">lens</span>
            )}
          </label>
          <input
            type="text"
            value={estimate.customer_name ?? ''}
            onChange={handleChange('customer_name')}
            placeholder="-"
            className={inputCls}
          />
        </div>

        {/* 주소 */}
        <div>
          <label className={labelCls}>
            주소
            {isLens && estimate.source === 'lens' && (
              <span className="ml-1 text-[10px] text-green-600">lens</span>
            )}
          </label>
          <input
            type="text"
            value={estimate.site_name ?? ''}
            onChange={handleChange('site_name')}
            placeholder="-"
            className={inputCls}
          />
        </div>
      </div>
    </div>
  )
}
