'use client'

import { useState, useEffect } from 'react'
import {
  WARRANTY_OPTIONS,
  DEFAULT_WARRANTY_OPTION_BY_METHOD,
  deriveOptionFromYearsBond,
  deriveYearsBond,
  formatWarrantyOption,
  type WarrantyOption,
} from '@/lib/estimate/warrantyOptions'

// ── 규칙서 보증 탭 ──
//
// 신형 구조: cost_config.warranty = { complex: '8/5', urethane: '3/3' }
// 구형 구조: cost_config.warranty = { years: 5, bond_years: 3 }  ← legacy single value
//
// 로드 시 구형이면 years/bond_years 로 옵션 역추론해 두 메서드에 동일 적용.
// 저장은 항상 신형으로만.

interface WarrantyBySheetType {
  complex: WarrantyOption
  urethane: WarrantyOption
}

function defaultWarranty(): WarrantyBySheetType {
  return {
    complex: DEFAULT_WARRANTY_OPTION_BY_METHOD['복합'],
    urethane: DEFAULT_WARRANTY_OPTION_BY_METHOD['우레탄'],
  }
}

export default function WarrantyEditor() {
  const [values, setValues] = useState<WarrantyBySheetType>(() => defaultWarranty())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    setLoading(true)
    try {
      const res = await fetch('/api/settings/cost-config')
      const json = await res.json()
      if (res.ok && json.config?.warranty) {
        const w = json.config.warranty as Record<string, unknown>

        // 신형: { complex: '8/5', urethane: '3/3' }
        const hasNew =
          typeof w.complex === 'string' &&
          typeof w.urethane === 'string' &&
          WARRANTY_OPTIONS.includes(w.complex as WarrantyOption) &&
          WARRANTY_OPTIONS.includes(w.urethane as WarrantyOption)

        if (hasNew) {
          setValues({
            complex: w.complex as WarrantyOption,
            urethane: w.urethane as WarrantyOption,
          })
          return
        }

        // 구형: { years, bond_years } — 옵션 역추론 후 두 메서드에 동일 적용
        const legacyYears = typeof w.years === 'number' ? w.years : undefined
        const legacyBond = typeof w.bond_years === 'number' ? w.bond_years : undefined
        const inferred = deriveOptionFromYearsBond(legacyYears, legacyBond)
        if (inferred) {
          setValues({ complex: inferred, urethane: inferred })
        } else {
          setValues(defaultWarranty())
        }
      }
    } catch (err) {
      console.error('보증 설정 로드 오류:', err)
    } finally {
      setLoading(false)
    }
  }

  function updateOption(method: 'complex' | 'urethane', option: WarrantyOption) {
    setValues((prev) => ({ ...prev, [method]: option }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/cost-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'warranty', value: values }),
      })
      const json = await res.json()
      showToast(res.ok ? '저장됨' : `저장 실패: ${json.error}`)
    } catch (err) {
      showToast(`저장 오류: ${err}`)
    } finally {
      setSaving(false)
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-gray-400">로딩 중…</div>
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-500">
        공법별 기본 하자보증 옵션을 설정합니다. 견적서 각 시트 탭에서 개별 변경 가능.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <WarrantyCard
          title="복합방수"
          value={values.complex}
          onChange={(v) => updateOption('complex', v)}
        />
        <WarrantyCard
          title="우레탄방수"
          value={values.urethane}
          onChange={(v) => updateOption('urethane', v)}
        />
      </div>

      <div className="flex items-center justify-end gap-3">
        {toast && (
          <span className="rounded bg-green-100 px-3 py-1 text-sm text-green-700">{toast}</span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-brand px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  )
}

// ── 개별 카드 ──
interface WarrantyCardProps {
  title: string
  value: WarrantyOption
  onChange: (v: WarrantyOption) => void
}

function WarrantyCard({ title, value, onChange }: WarrantyCardProps) {
  const derived = deriveYearsBond(value)
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-3">
        <p className="text-sm font-medium text-gray-700">{title}</p>
        <p className="mt-0.5 text-xs text-gray-400">
          하자보증기간 {derived.years}년 / 하자보증서 {derived.bond}년
        </p>
      </div>
      <div className="space-y-1.5">
        {WARRANTY_OPTIONS.map((opt) => (
          <label
            key={opt}
            className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm transition-colors ${
              value === opt
                ? 'border-brand bg-brand/5 text-brand'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name={`warranty-${title}`}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="h-3.5 w-3.5 accent-brand"
            />
            <span className="font-medium">{opt}</span>
            <span className="text-xs text-gray-400">({formatWarrantyOption(opt)})</span>
          </label>
        ))}
      </div>
    </div>
  )
}
