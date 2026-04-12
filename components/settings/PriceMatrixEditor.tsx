'use client'

import { useState } from 'react'
import type { AreaRange, Method } from '@/lib/estimate/types'
import { AREA_BOUNDARIES } from '@/lib/estimate/constants'
import PriceMatrixAccordionItem from '@/components/settings/PriceMatrixAccordionItem'

const AREA_RANGES: AreaRange[] = AREA_BOUNDARIES
  .filter((b) => b.max !== Infinity)
  .map((b) => b.label)
  .concat(['200평이상'])

const METHODS: Method[] = ['복합', '우레탄']

/**
 * 단가표 편집기 — 공법 세그먼트 + 면적대 아코디언.
 * 각 아코디언 항목은 독립 데이터 + 독립 저장.
 */
export default function PriceMatrixEditor() {
  const [method, setMethod] = useState<Method>('복합')

  return (
    <div className="space-y-5">
      {/* 공법 세그먼트 컨트롤 */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-ink-secondary">공법</span>
        <div className="inline-flex rounded-lg bg-surface-muted p-1">
          {METHODS.map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`rounded-md px-5 py-1.5 text-sm font-medium transition-all ${
                method === m
                  ? 'bg-white text-ink shadow-card'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* 면적대 아코디언 */}
      <div className="space-y-2">
        {AREA_RANGES.map((ar, idx) => (
          <PriceMatrixAccordionItem
            key={`${ar}-${method}`}
            areaRange={ar}
            method={method}
            defaultOpen={idx === 0}
          />
        ))}
      </div>
    </div>
  )
}
