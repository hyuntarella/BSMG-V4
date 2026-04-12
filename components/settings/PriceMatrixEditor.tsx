'use client'

import { useState, useEffect } from 'react'
import type { AreaRange, Method } from '@/lib/estimate/types'
import { AREA_BOUNDARIES, SMALL_PRESETS } from '@/lib/estimate/constants'
import AreaRangeTabPanel from '@/components/settings/AreaRangeTabPanel'
import SmallPresetEditor from '@/components/settings/SmallPresetEditor'
import { usePriceMatrixStore, type PriceMatrixStore } from '@/components/settings/usePriceMatrixStore'

const AREA_RANGES: AreaRange[] = AREA_BOUNDARIES
  .filter((b) => b.max !== Infinity)
  .map((b) => b.label)
  .concat(['200평이상']) as AreaRange[]

const METHODS: Method[] = ['복합', '우레탄']

export interface SmallPresetsState {
  complex: Record<string, [number, number, number][]>
  urethane: Record<string, [number, number, number][]>
}

interface Props {
  /** 외부 store 주입 (page.tsx에서 사용). 없으면 내부 생성 (SettingsPanel 호환). */
  store?: PriceMatrixStore
  smallPresets?: SmallPresetsState
  onSmallPresetsChange?: (v: SmallPresetsState) => void
}

/**
 * 단가표 편집기 — 공법 세그먼트 + 면적대 탭 + 칩 + 상세 테이블.
 * store 없이 호출하면 자체 store 생성 (estimate SettingsPanel 호환).
 */
export default function PriceMatrixEditor({ store: externalStore, smallPresets, onSmallPresetsChange }: Props) {
  const internalStore = usePriceMatrixStore()
  const store = externalStore ?? internalStore

  // 내부 store 사용 시 자체 로드
  const [internalLoaded, setInternalLoaded] = useState(false)
  useEffect(() => {
    if (!externalStore && !internalLoaded) {
      internalStore.loadAll().then(() => setInternalLoaded(true))
    }
  }, [externalStore, internalStore, internalLoaded])

  // 내부 SMALL_PRESETS fallback
  const [internalPresets, setInternalPresets] = useState<SmallPresetsState>({
    complex: Object.fromEntries(
      Object.entries(SMALL_PRESETS).map(([k, v]) => [k, v.map((r) => [...r])]),
    ),
    urethane: {},
  })
  const effectivePresets = smallPresets ?? internalPresets
  const effectiveOnChange = onSmallPresetsChange ?? setInternalPresets

  const [method, setMethod] = useState<Method>('복합')
  const [activeTab, setActiveTab] = useState<AreaRange>('20평이하')

  const isSmallRange = activeTab === '20평이하'

  if (!externalStore && !internalLoaded && !internalStore.loading) {
    return null
  }

  if (store.loading) {
    return <div className="py-8 text-center text-sm text-ink-muted">로딩 중…</div>
  }

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

      {/* 면적대 탭 */}
      <div className="flex gap-1 rounded-lg bg-surface-muted p-1">
        {AREA_RANGES.map((ar) => (
          <button
            key={ar}
            onClick={() => setActiveTab(ar)}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all ${
              activeTab === ar
                ? 'bg-white text-ink shadow-card'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            {ar}
          </button>
        ))}
      </div>

      {/* 콘텐츠 */}
      <div>
        {isSmallRange ? (
          <SmallPresetEditor
            method={method}
            presets={effectivePresets}
            onChange={effectiveOnChange}
          />
        ) : (
          <AreaRangeTabPanel
            key={`${method}-${activeTab}`}
            method={method}
            areaRange={activeTab}
            store={store}
          />
        )}
      </div>
    </div>
  )
}
