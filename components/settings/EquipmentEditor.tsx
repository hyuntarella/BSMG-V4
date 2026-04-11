'use client'

import { useState, useEffect } from 'react'
import { fm } from '@/lib/utils/format'

// ── 장비단가 구조 ──
//
// 신형: 각 장비가 { mat, labor, exp } 3필드 구조.
// 레거시: 각 장비가 number 단일값 → load 시 { mat:0, labor:0, exp:<기존> } 로 승격.
// 저장 시 신형만 PUT 한다.

interface PriceEntry {
  mat: number
  labor: number
  exp: number
}

type EquipmentKey = 'ladder' | 'sky' | 'waste' | 'forklift' | 'crane' | 'ropeman'

type EquipmentPrices = Record<EquipmentKey, PriceEntry>

// 기본값 — quickChipConfig.ts 와 동일한 수치를 기준으로 함.
const DEFAULT_PRICES: EquipmentPrices = {
  ladder: { mat: 0, labor: 0, exp: 120000 },
  sky: { mat: 0, labor: 0, exp: 350000 },
  waste: { mat: 0, labor: 0, exp: 200000 },
  forklift: { mat: 0, labor: 0, exp: 700000 },
  crane: { mat: 0, labor: 0, exp: 1500000 },
  ropeman: { mat: 0, labor: 450000, exp: 600000 },
}

const EQUIPMENT_LABELS: { key: EquipmentKey; name: string; unit: string }[] = [
  { key: 'ladder', name: '사다리차', unit: '일' },
  { key: 'sky', name: '스카이차', unit: '일' },
  { key: 'waste', name: '폐기물처리비', unit: '식' },
  { key: 'forklift', name: '포크레인', unit: '대' },
  { key: 'crane', name: '크레인', unit: '대' },
  { key: 'ropeman', name: '로프공', unit: '인' },
]

// 저장된 값 → 신형 구조로 정규화. number 는 exp 로 승격.
function normalizeEntry(raw: unknown, fallback: PriceEntry): PriceEntry {
  if (typeof raw === 'number') {
    return { mat: 0, labor: 0, exp: raw }
  }
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

export default function EquipmentEditor() {
  const [prices, setPrices] = useState<EquipmentPrices>(() => ({ ...DEFAULT_PRICES }))
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
      if (res.ok && json.config?.equipment_prices) {
        const ep = json.config.equipment_prices as Record<string, unknown>
        setPrices({
          ladder: normalizeEntry(ep.ladder, DEFAULT_PRICES.ladder),
          sky: normalizeEntry(ep.sky, DEFAULT_PRICES.sky),
          waste: normalizeEntry(ep.waste, DEFAULT_PRICES.waste),
          forklift: normalizeEntry(ep.forklift, DEFAULT_PRICES.forklift),
          crane: normalizeEntry(ep.crane, DEFAULT_PRICES.crane),
          ropeman: normalizeEntry(ep.ropeman, DEFAULT_PRICES.ropeman),
        })
      }
    } catch (err) {
      console.error('장비단가 로드 오류:', err)
    } finally {
      setLoading(false)
    }
  }

  function updateField(key: EquipmentKey, field: keyof PriceEntry, value: number) {
    setPrices((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/cost-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'equipment_prices', value: prices }),
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {EQUIPMENT_LABELS.map(({ key, name, unit }) => {
          const entry = prices[key]
          const total = entry.mat + entry.labor + entry.exp
          return (
            <div key={key} className="rounded-lg border border-gray-200 p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">{name}</p>
                  <p className="text-xs text-gray-400">{unit}당 기본 단가</p>
                </div>
                <p className="text-xs tabular-nums text-gray-500">합계 {fm(total)}원</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['mat', 'labor', 'exp'] as const).map((field) => (
                  <div key={field}>
                    <label className="mb-1 block text-xs text-gray-500">
                      {field === 'mat' ? '재료비' : field === 'labor' ? '인건비' : '경비'}
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={entry[field]}
                        min={0}
                        step={10000}
                        onChange={(e) =>
                          updateField(key, field, parseInt(e.target.value, 10) || 0)
                        }
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-right text-sm tabular-nums"
                      />
                      <span className="shrink-0 text-xs text-gray-500">원</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
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
