'use client'

import { useState, useEffect } from 'react'
import { fm } from '@/lib/utils/format'

interface EquipmentPrices {
  ladder: number
  sky: number
  waste: number
}

const EQUIPMENT_DEFAULTS: EquipmentPrices = {
  ladder: 120000,
  sky: 350000,
  waste: 200000,
}

const EQUIPMENT_LABELS: { key: keyof EquipmentPrices; name: string; unit: string }[] = [
  { key: 'ladder', name: '사다리차', unit: '일당' },
  { key: 'sky', name: '스카이차', unit: '일당' },
  { key: 'waste', name: '폐기물처리비', unit: '식' },
]

export default function EquipmentEditor() {
  const [prices, setPrices] = useState<EquipmentPrices>({ ...EQUIPMENT_DEFAULTS })
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
        const ep = json.config.equipment_prices as Partial<EquipmentPrices>
        setPrices({
          ladder: ep.ladder ?? EQUIPMENT_DEFAULTS.ladder,
          sky: ep.sky ?? EQUIPMENT_DEFAULTS.sky,
          waste: ep.waste ?? EQUIPMENT_DEFAULTS.waste,
        })
      }
    } catch (err) {
      console.error('장비단가 로드 오류:', err)
    } finally {
      setLoading(false)
    }
  }

  function updatePrice(key: keyof EquipmentPrices, value: number) {
    setPrices((prev) => ({ ...prev, [key]: value }))
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {EQUIPMENT_LABELS.map(({ key, name, unit }) => (
          <div key={key} className="rounded-lg border border-gray-200 p-4">
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700">{name}</p>
              <p className="text-xs text-gray-400">{unit}당 기본 단가</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={prices[key]}
                min={0}
                step={10000}
                onChange={(e) => updatePrice(key, parseInt(e.target.value, 10) || 0)}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-right text-sm tabular-nums"
              />
              <span className="shrink-0 text-sm text-gray-500">원</span>
            </div>
            <p className="mt-1.5 text-right text-xs text-gray-400">{fm(prices[key])}원</p>
          </div>
        ))}
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
