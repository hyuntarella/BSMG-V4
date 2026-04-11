'use client'

import { useState, useEffect } from 'react'
import { fm } from '@/lib/utils/format'

// ── 추가공종 구조 ──
// cost_config.extra_items = {
//   [공종명]: { mat: number, labor: number, exp: number }
// }

interface ExtraItemEntry {
  mat: number
  labor: number
  exp: number
}

interface ExtraItemDef {
  key: string
  name: string
  unit: string
}

// quickChipConfig.ts '보수·추가' 카테고리와 1:1 대응.
const EXTRA_ITEMS: ExtraItemDef[] = [
  { key: '바탕조정제 부분미장', name: '바탕조정제 부분미장', unit: '식' },
  { key: '드라이비트 하부절개', name: '드라이비트 하부절개', unit: '식' },
  { key: '드라이비트 부분절개', name: '드라이비트 부분절개', unit: '식' },
]

const DEFAULT_ENTRY: ExtraItemEntry = { mat: 0, labor: 0, exp: 0 }

export default function ExtraItemsEditor() {
  const [values, setValues] = useState<Record<string, ExtraItemEntry>>(() =>
    Object.fromEntries(EXTRA_ITEMS.map((item) => [item.key, { ...DEFAULT_ENTRY }]))
  )
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
      if (res.ok && json.config?.extra_items) {
        const ei = json.config.extra_items as Record<string, Partial<ExtraItemEntry>>
        setValues((prev) => {
          const next = { ...prev }
          for (const item of EXTRA_ITEMS) {
            const saved = ei[item.key]
            if (saved) {
              next[item.key] = {
                mat: typeof saved.mat === 'number' ? saved.mat : 0,
                labor: typeof saved.labor === 'number' ? saved.labor : 0,
                exp: typeof saved.exp === 'number' ? saved.exp : 0,
              }
            }
          }
          return next
        })
      }
    } catch (err) {
      console.error('추가공종 로드 오류:', err)
    } finally {
      setLoading(false)
    }
  }

  function updateField(key: string, field: keyof ExtraItemEntry, value: number) {
    setValues((prev) => ({
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
        body: JSON.stringify({ section: 'extra_items', value: values }),
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
        견적서의 &quot;보수·추가&quot; 빠른추가 칩 클릭 시 기본 단가로 주입됩니다.
      </p>

      <div className="space-y-3">
        {EXTRA_ITEMS.map((item) => {
          const entry = values[item.key]
          const total = entry.mat + entry.labor + entry.exp
          return (
            <div key={item.key} className="rounded-lg border border-gray-200 p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">{item.name}</p>
                  <p className="text-xs text-gray-400">단위: {item.unit}</p>
                </div>
                <p className="text-xs tabular-nums text-gray-500">합계 {fm(total)}원</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
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
                        step={1000}
                        onChange={(e) =>
                          updateField(item.key, field, parseInt(e.target.value, 10) || 0)
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
