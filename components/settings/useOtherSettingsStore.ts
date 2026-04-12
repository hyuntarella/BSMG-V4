'use client'

import { useState, useCallback, useRef } from 'react'
import type { CostBreakpoint } from '@/lib/estimate/constants'
import { COST_BREAKPOINTS, LABOR_COST_PER_PUM } from '@/lib/estimate/constants'
import {
  WARRANTY_OPTIONS,
  DEFAULT_WARRANTY_OPTION_BY_METHOD,
  deriveOptionFromYearsBond,
  type WarrantyOption,
} from '@/lib/estimate/warrantyOptions'

interface PriceEntry {
  mat: number
  labor: number
  exp: number
}

type EquipmentKey = 'ladder' | 'sky' | 'waste' | 'forklift' | 'crane' | 'ropeman'

export interface OtherSettingsState {
  laborCostPerPum: number
  breakpoints: CostBreakpoint[]
  overheadRate: number
  profitRate: number
  roundUnit: number
  equipment: Record<EquipmentKey, PriceEntry>
  warrantyComplex: WarrantyOption
  warrantyUrethane: WarrantyOption
}

const DEFAULT_EQUIPMENT: Record<EquipmentKey, PriceEntry> = {
  ladder: { mat: 0, labor: 0, exp: 120000 },
  sky: { mat: 0, labor: 0, exp: 350000 },
  waste: { mat: 0, labor: 0, exp: 200000 },
  forklift: { mat: 0, labor: 0, exp: 700000 },
  crane: { mat: 0, labor: 0, exp: 1500000 },
  ropeman: { mat: 0, labor: 450000, exp: 600000 },
}

function normalizeEntry(raw: unknown, fallback: PriceEntry): PriceEntry {
  if (typeof raw === 'number') return { mat: 0, labor: 0, exp: raw }
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    return {
      mat: typeof obj.mat === 'number' ? obj.mat : fallback.mat,
      labor: typeof obj.labor === 'number' ? obj.labor : fallback.labor,
      exp: typeof obj.exp === 'number' ? obj.exp : fallback.exp,
    }
  }
  return fallback
}

function defaultState(): OtherSettingsState {
  return {
    laborCostPerPum: LABOR_COST_PER_PUM,
    breakpoints: COST_BREAKPOINTS.map((bp) => ({ ...bp })),
    overheadRate: 3,
    profitRate: 6,
    roundUnit: 100000,
    equipment: { ...DEFAULT_EQUIPMENT },
    warrantyComplex: DEFAULT_WARRANTY_OPTION_BY_METHOD['복합'],
    warrantyUrethane: DEFAULT_WARRANTY_OPTION_BY_METHOD['우레탄'],
  }
}

/**
 * 기타 설정 상태 관리 훅.
 * cost-config 1회 로드, dirty 추적, 통합 저장.
 */
export function useOtherSettingsStore() {
  const [state, setState] = useState<OtherSettingsState>(defaultState)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const snapshotRef = useRef<string>('')
  const dirty = JSON.stringify(state) !== snapshotRef.current

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings/cost-config')
      const json = await res.json()
      const cfg = (json.config ?? {}) as Record<string, unknown>

      const s: OtherSettingsState = defaultState()

      // labor_cost_per_pum
      if (typeof cfg.labor_cost_per_pum === 'number') {
        s.laborCostPerPum = cfg.labor_cost_per_pum
      }

      // cost_breakpoints
      if (Array.isArray(cfg.cost_breakpoints) && cfg.cost_breakpoints.length > 0) {
        s.breakpoints = cfg.cost_breakpoints as CostBreakpoint[]
      }

      // calc_rules
      const cr = (cfg.calc_rules ?? {}) as Record<string, number>
      if (typeof cr.overhead_rate === 'number') s.overheadRate = Math.round(cr.overhead_rate * 100)
      if (typeof cr.profit_rate === 'number') s.profitRate = Math.round(cr.profit_rate * 100)
      if (typeof cr.round_unit === 'number') s.roundUnit = cr.round_unit

      // equipment
      const ep = (cfg.equipment_prices ?? {}) as Record<string, unknown>
      const eqKeys: EquipmentKey[] = ['ladder', 'sky', 'waste', 'forklift', 'crane', 'ropeman']
      for (const k of eqKeys) {
        s.equipment[k] = normalizeEntry(ep[k], DEFAULT_EQUIPMENT[k])
      }

      // warranty
      const w = (cfg.warranty ?? {}) as Record<string, unknown>
      const hasNew =
        typeof w.complex === 'string' &&
        typeof w.urethane === 'string' &&
        WARRANTY_OPTIONS.includes(w.complex as WarrantyOption) &&
        WARRANTY_OPTIONS.includes(w.urethane as WarrantyOption)

      if (hasNew) {
        s.warrantyComplex = w.complex as WarrantyOption
        s.warrantyUrethane = w.urethane as WarrantyOption
      } else {
        const legacyYears = typeof w.years === 'number' ? w.years : undefined
        const legacyBond = typeof w.bond_years === 'number' ? w.bond_years : undefined
        const inferred = deriveOptionFromYearsBond(legacyYears, legacyBond)
        if (inferred) {
          s.warrantyComplex = inferred
          s.warrantyUrethane = inferred
        }
      }

      setState(s)
      snapshotRef.current = JSON.stringify(s)
    } catch (err) {
      console.error('기타 설정 로드 오류:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const save = useCallback(async () => {
    setSaving(true)
    try {
      const config: Record<string, unknown> = {}

      // 먼저 기존 전체 config 읽기
      const getRes = await fetch('/api/settings/cost-config')
      const getJson = await getRes.json()
      const existing = (getJson.config ?? {}) as Record<string, unknown>

      // 기존 유지 + 변경 분만 교체
      Object.assign(config, existing, {
        labor_cost_per_pum: state.laborCostPerPum,
        cost_breakpoints: state.breakpoints,
        calc_rules: {
          overhead_rate: state.overheadRate / 100,
          profit_rate: state.profitRate / 100,
          round_unit: state.roundUnit,
        },
        equipment_prices: state.equipment,
        warranty: {
          complex: state.warrantyComplex,
          urethane: state.warrantyUrethane,
        },
      })

      const res = await fetch('/api/settings/cost-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      })
      const json = await res.json()
      if (res.ok) {
        snapshotRef.current = JSON.stringify(state)
        showToast('저장됨')
      } else {
        showToast(`저장 실패: ${json.error}`)
      }
    } catch (err) {
      showToast(`저장 오류: ${err}`)
    } finally {
      setSaving(false)
    }
  }, [state, showToast])

  return {
    state,
    setState,
    loading,
    saving,
    toast,
    dirty,
    load,
    save,
    showToast,
  }
}
