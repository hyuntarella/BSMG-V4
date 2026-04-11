'use client'

import { useEffect, useState } from 'react'
import {
  WARRANTY_OPTIONS,
  DEFAULT_WARRANTY_OPTION_BY_METHOD,
  deriveOptionFromYearsBond,
  type WarrantyOption,
} from '@/lib/estimate/warrantyOptions'
import type { Method } from '@/lib/estimate/types'

// ── 규칙서 보증 탭 기본값 로드 ──
//
// /api/settings/cost-config 에서 warranty 섹션을 읽어 메서드별 기본 옵션 반환.
// 신형 구조: { complex: '8/5', urethane: '3/3' }
// 구형 구조: { years, bond_years } → 옵션 역추론 후 양 메서드에 동일 적용.
// 로드 전/실패 시 DEFAULT_WARRANTY_OPTION_BY_METHOD 를 그대로 사용.

export type WarrantyDefaults = Record<Method, WarrantyOption>

export function useWarrantyDefaults() {
  const [defaults, setDefaults] = useState<WarrantyDefaults>({
    '복합': DEFAULT_WARRANTY_OPTION_BY_METHOD['복합'],
    '우레탄': DEFAULT_WARRANTY_OPTION_BY_METHOD['우레탄'],
  })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/settings/cost-config')
        if (!res.ok) return
        const json = await res.json()
        const w = (json.config?.warranty ?? null) as Record<string, unknown> | null
        if (!w) return

        // 신형
        const hasNew =
          typeof w.complex === 'string' &&
          typeof w.urethane === 'string' &&
          WARRANTY_OPTIONS.includes(w.complex as WarrantyOption) &&
          WARRANTY_OPTIONS.includes(w.urethane as WarrantyOption)
        if (hasNew && !cancelled) {
          setDefaults({
            '복합': w.complex as WarrantyOption,
            '우레탄': w.urethane as WarrantyOption,
          })
          return
        }

        // 구형 — years/bond_years 에서 옵션 역추론 후 동일 적용
        const legacyYears = typeof w.years === 'number' ? w.years : undefined
        const legacyBond = typeof w.bond_years === 'number' ? w.bond_years : undefined
        const inferred = deriveOptionFromYearsBond(legacyYears, legacyBond)
        if (inferred && !cancelled) {
          setDefaults({ '복합': inferred, '우레탄': inferred })
        }
      } catch (err) {
        console.error('warranty defaults load 오류:', err)
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { defaults, loaded }
}
