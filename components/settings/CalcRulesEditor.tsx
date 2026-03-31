'use client'

import { useState, useEffect } from 'react'
import { fm } from '@/lib/utils/format'

const ROUND_OPTIONS = [
  { value: 10000, label: '1만원 단위' },
  { value: 50000, label: '5만원 단위' },
  { value: 100000, label: '10만원 단위' },
  { value: 500000, label: '50만원 단위' },
  { value: 1000000, label: '100만원 단위' },
]

export default function CalcRulesEditor() {
  const [overheadRate, setOverheadRate] = useState(3)
  const [profitRate, setProfitRate] = useState(6)
  const [roundUnit, setRoundUnit] = useState(100000)
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
      if (res.ok && json.config?.calc_rules) {
        const cr = json.config.calc_rules as Record<string, number>
        if (typeof cr.overhead_rate === 'number') setOverheadRate(Math.round(cr.overhead_rate * 100))
        if (typeof cr.profit_rate === 'number') setProfitRate(Math.round(cr.profit_rate * 100))
        if (typeof cr.round_unit === 'number') setRoundUnit(cr.round_unit)
      }
    } catch (err) {
      console.error('계산규칙 로드 오류:', err)
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
          section: 'calc_rules',
          value: {
            overhead_rate: overheadRate / 100,
            profit_rate: profitRate / 100,
            round_unit: roundUnit,
          },
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

  // ── 미리보기 계산 (예시 소계 1,000,000원) ──
  const PREVIEW_BASE = 1000000
  const overhead = Math.round(PREVIEW_BASE * (overheadRate / 100))
  const profit = Math.round((PREVIEW_BASE + overhead) * (profitRate / 100))
  const subtotal = PREVIEW_BASE + overhead + profit
  const rounded = Math.floor(subtotal / roundUnit) * roundUnit

  if (loading) {
    return <div className="py-12 text-center text-sm text-gray-400">로딩 중…</div>
  }

  return (
    <div className="space-y-6">
      {/* 필드 카드 */}
      <div className="space-y-4">
        {/* 공과잡비 */}
        <div className="rounded-lg border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">공과잡비</p>
              <p className="mt-0.5 text-xs text-gray-400">소계의 N%를 공과잡비로 추가</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={overheadRate}
                min={0}
                max={50}
                step={0.01}
                onChange={(e) => setOverheadRate(parseFloat(e.target.value) || 0)}
                className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm tabular-nums"
              />
              <span className="text-sm text-gray-500">%</span>
              <span className="text-xs text-gray-400">현재: {overheadRate}%</span>
            </div>
          </div>
        </div>

        {/* 기업이윤 */}
        <div className="rounded-lg border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">기업이윤</p>
              <p className="mt-0.5 text-xs text-gray-400">(소계+공과잡비)의 N%를 기업이윤으로 추가</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={profitRate}
                min={0}
                max={50}
                step={0.01}
                onChange={(e) => setProfitRate(parseFloat(e.target.value) || 0)}
                className="w-20 rounded border border-gray-300 px-2 py-1 text-right text-sm tabular-nums"
              />
              <span className="text-sm text-gray-500">%</span>
              <span className="text-xs text-gray-400">현재: {profitRate}%</span>
            </div>
          </div>
        </div>

        {/* 절사 단위 */}
        <div className="rounded-lg border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">절사 단위</p>
              <p className="mt-0.5 text-xs text-gray-400">합계를 N원 단위로 내림 절사</p>
            </div>
            <select
              value={roundUnit}
              onChange={(e) => setRoundUnit(parseInt(e.target.value, 10))}
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            >
              {ROUND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 미리보기 */}
      <div className="rounded-lg bg-gray-50 p-4">
        <p className="mb-2 text-xs font-medium text-gray-600">미리보기 (예시 소계 {fm(PREVIEW_BASE)}원)</p>
        <div className="space-y-1 text-xs text-gray-600 tabular-nums">
          <div className="flex justify-between">
            <span>소계</span>
            <span>{fm(PREVIEW_BASE)}원</span>
          </div>
          <div className="flex justify-between">
            <span>공과잡비 {overheadRate}%</span>
            <span>+ {fm(overhead)}원</span>
          </div>
          <div className="flex justify-between">
            <span>기업이윤 {profitRate}%</span>
            <span>+ {fm(profit)}원</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-1">
            <span>계</span>
            <span>{fm(subtotal)}원</span>
          </div>
          <div className="flex justify-between font-medium text-gray-700">
            <span>합계 (절사)</span>
            <span>{fm(rounded)}원</span>
          </div>
        </div>
      </div>

      {/* 저장 버튼 */}
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
