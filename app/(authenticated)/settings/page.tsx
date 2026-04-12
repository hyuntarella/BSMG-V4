'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Header from '@/components/layout/Header'
import SettingsSidebar, { type SettingsMenu } from '@/components/settings/SettingsSidebar'
import SettingsSummary from '@/components/settings/SettingsSummary'
import PriceMatrixEditor, { type SmallPresetsState } from '@/components/settings/PriceMatrixEditor'
import FavoriteItemsPage from '@/components/settings/FavoriteItemsPage'
import OtherSettingsPage from '@/components/settings/OtherSettingsPage'
import { usePriceMatrixStore } from '@/components/settings/usePriceMatrixStore'
import { useOtherSettingsStore } from '@/components/settings/useOtherSettingsStore'
import { SMALL_PRESETS } from '@/lib/estimate/constants'

export default function SettingsPage() {
  const [menu, setMenu] = useState<SettingsMenu>('단가표')
  const [initialLoading, setInitialLoading] = useState(true)

  // ── 단가표 store ──
  const pmStore = usePriceMatrixStore()

  // ── SMALL_PRESETS 상태 ──
  const [smallPresets, setSmallPresets] = useState<SmallPresetsState>({
    complex: {},
    urethane: {},
  })
  const smallPresetsSnapshotRef = useRef<string>('')
  const smallPresetsDirty = JSON.stringify(smallPresets) !== smallPresetsSnapshotRef.current

  // 단가표 탭 dirty = P매트릭스 dirty OR SMALL_PRESETS dirty
  const priceTabDirty = pmStore.dirty || smallPresetsDirty

  // ── 기타 설정 store ──
  const otherStore = useOtherSettingsStore()

  // ── 초기 로드 (1회) ──
  useEffect(() => {
    async function loadAll() {
      setInitialLoading(true)
      await Promise.all([pmStore.loadAll(), otherStore.load(), loadSmallPresets()])
      setInitialLoading(false)
    }
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadSmallPresets() {
    try {
      const res = await fetch('/api/settings/cost-config')
      const json = await res.json()
      const cfg = (json.config ?? {}) as Record<string, unknown>
      const saved = cfg.small_presets as SmallPresetsState | undefined
      if (saved && typeof saved === 'object') {
        const merged: SmallPresetsState = {
          complex: { ...convertPresets(SMALL_PRESETS), ...(saved.complex ?? {}) },
          urethane: saved.urethane ?? {},
        }
        setSmallPresets(merged)
        smallPresetsSnapshotRef.current = JSON.stringify(merged)
      } else {
        const defaults: SmallPresetsState = {
          complex: convertPresets(SMALL_PRESETS),
          urethane: {},
        }
        setSmallPresets(defaults)
        smallPresetsSnapshotRef.current = JSON.stringify(defaults)
      }
    } catch {
      const defaults: SmallPresetsState = {
        complex: convertPresets(SMALL_PRESETS),
        urethane: {},
      }
      setSmallPresets(defaults)
      smallPresetsSnapshotRef.current = JSON.stringify(defaults)
    }
  }

  // ── 탭 전환 시 dirty 확인 ──
  const handleMenuChange = useCallback(
    (next: SettingsMenu) => {
      const currentDirty =
        menu === '단가표' ? priceTabDirty :
        menu === '기타 설정' ? otherStore.dirty :
        false

      if (currentDirty) {
        const ok = window.confirm('저장 안 된 변경사항이 있습니다. 탭을 전환하시겠습니까?')
        if (!ok) return
      }
      setMenu(next)
    },
    [menu, priceTabDirty, otherStore.dirty],
  )

  // ── 단가표 저장 ──
  const [priceSaving, setPriceSaving] = useState(false)
  const [priceToast, setPriceToast] = useState<string | null>(null)

  const handlePriceSave = useCallback(async () => {
    setPriceSaving(true)
    try {
      // P매트릭스 저장
      if (pmStore.dirty) {
        await pmStore.save()
      }

      // SMALL_PRESETS 저장
      if (smallPresetsDirty) {
        const res = await fetch('/api/settings/cost-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: 'small_presets', value: smallPresets }),
        })
        if (res.ok) {
          smallPresetsSnapshotRef.current = JSON.stringify(smallPresets)
        } else {
          const json = await res.json()
          setPriceToast(`프리셋 저장 실패: ${json.error}`)
          setPriceSaving(false)
          return
        }
      }

      setPriceToast('저장됨')
      setTimeout(() => setPriceToast(null), 2500)
    } catch (err) {
      setPriceToast(`저장 오류: ${err}`)
      setTimeout(() => setPriceToast(null), 2500)
    } finally {
      setPriceSaving(false)
    }
  }, [pmStore, smallPresets, smallPresetsDirty])

  // ── 로딩 ──
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-surface">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            <p className="text-sm text-ink-muted">설정 로딩 중…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* 헤더 + 저장 버튼 */}
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-xl font-bold text-ink">설정</h1>

          {/* 탭별 저장 버튼 */}
          {menu === '단가표' && (
            <SaveButton
              dirty={priceTabDirty}
              saving={priceSaving}
              toast={priceToast ?? pmStore.toast}
              onSave={handlePriceSave}
            />
          )}
          {menu === '기타 설정' && (
            <SaveButton
              dirty={otherStore.dirty}
              saving={otherStore.saving}
              toast={otherStore.toast}
              onSave={otherStore.save}
            />
          )}
        </div>

        <div className="mb-5">
          <SettingsSummary />
        </div>

        <div className="mb-5">
          <SettingsSidebar active={menu} onChange={handleMenuChange} />
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-card">
          {menu === '단가표' && (
            <PriceMatrixEditor
              store={pmStore}
              smallPresets={smallPresets}
              onSmallPresetsChange={setSmallPresets}
            />
          )}
          {menu === '자주 쓰는 공종' && <FavoriteItemsPage />}
          {menu === '기타 설정' && (
            <OtherSettingsPage
              state={otherStore.state}
              onChange={otherStore.setState}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ── 통합 저장 버튼 ──
function SaveButton({
  dirty,
  saving,
  toast,
  onSave,
}: {
  dirty: boolean
  saving: boolean
  toast: string | null
  onSave: () => void
}) {
  return (
    <div className="flex items-center gap-3">
      {dirty && (
        <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600">
          변경사항 있음
        </span>
      )}
      {toast && (
        <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
          {toast}
        </span>
      )}
      <button
        onClick={onSave}
        disabled={!dirty || saving}
        className="btn-primary !px-4 !py-1.5 !text-sm disabled:opacity-40"
      >
        {saving ? '저장 중…' : '저장'}
      </button>
    </div>
  )
}

// ── 헬퍼 ──
function convertPresets(
  raw: Record<string, [number, number, number][]>,
): Record<string, [number, number, number][]> {
  const result: Record<string, [number, number, number][]> = {}
  for (const [k, v] of Object.entries(raw)) {
    result[k] = v.map((r) => [...r])
  }
  return result
}
