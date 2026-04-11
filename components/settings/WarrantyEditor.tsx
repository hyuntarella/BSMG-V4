'use client'

import { useState, useEffect } from 'react'

export default function WarrantyEditor() {
  const [years, setYears] = useState(5)
  const [bondYears, setBondYears] = useState(3)
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
        const w = json.config.warranty as Record<string, number>
        if (typeof w.years === 'number') setYears(w.years)
        if (typeof w.bond_years === 'number') setBondYears(w.bond_years)
      }
    } catch (err) {
      console.error('보증 설정 로드 오류:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/cost-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'warranty',
          value: { years, bond_years: bondYears },
        }),
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
      <div className="space-y-4">
        {/* 하자보수년수 */}
        <div className="rounded-lg border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">하자보수년수</p>
              <p className="mt-0.5 text-xs text-gray-400">견적서 하단에 표시되는 기본 하자보수 기간</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={years}
                min={1}
                max={20}
                step={1}
                onChange={(e) => setYears(parseInt(e.target.value, 10) || 1)}
                className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm tabular-nums"
              />
              <span className="text-sm text-gray-500">년</span>
            </div>
          </div>
        </div>

        {/* 하자보증기간 */}
        <div className="rounded-lg border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">하자보증기간</p>
              <p className="mt-0.5 text-xs text-gray-400">이행보증보험 증권 기간</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={bondYears}
                min={1}
                max={20}
                step={1}
                onChange={(e) => setBondYears(parseInt(e.target.value, 10) || 1)}
                className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm tabular-nums"
              />
              <span className="text-sm text-gray-500">년</span>
            </div>
          </div>
        </div>
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
