'use client'

import { useState, useEffect } from 'react'
import { fm } from '@/lib/utils/format'

interface SummaryData {
  overheadRate: number
  profitRate: number
  roundUnit: number
  ladderPrice: number
  skyPrice: number
  wastePrice: number
  warrantyYears: number
  bondYears: number
  laborCostPerPum: number
  complexCount: number
  urethaneCount: number
  presetCount: number
}

export default function SettingsSummary() {
  const [data, setData] = useState<SummaryData | null>(null)

  useEffect(() => {
    loadSummary()
  }, [])

  async function loadSummary() {
    try {
      const [cfgRes, presetsRes] = await Promise.all([
        fetch('/api/settings/cost-config'),
        fetch('/api/settings/presets'),
      ])
      const cfgJson = await cfgRes.json()
      const presetsJson = await presetsRes.json()
      const cfg = (cfgJson.config ?? {}) as Record<string, unknown>
      const calcRules = (cfg.calc_rules ?? {}) as Record<string, number>
      const equipment = (cfg.equipment_prices ?? {}) as Record<string, unknown>
      const warranty = (cfg.warranty ?? {}) as Record<string, number>
      const baseItems = (cfg.base_items ?? {}) as Record<string, unknown[]>
      const presets: unknown[] = Array.isArray(presetsJson.presets) ? presetsJson.presets : []

      const entryTotal = (raw: unknown, fallback: number): number => {
        if (typeof raw === 'number') return raw
        if (raw && typeof raw === 'object') {
          const o = raw as Record<string, unknown>
          const m = typeof o.mat === 'number' ? o.mat : 0
          const l = typeof o.labor === 'number' ? o.labor : 0
          const e = typeof o.exp === 'number' ? o.exp : 0
          return m + l + e
        }
        return fallback
      }

      setData({
        overheadRate: Math.round((calcRules.overhead_rate ?? 0.03) * 100),
        profitRate: Math.round((calcRules.profit_rate ?? 0.06) * 100),
        roundUnit: calcRules.round_unit ?? 100000,
        ladderPrice: entryTotal(equipment.ladder, 120000),
        skyPrice: entryTotal(equipment.sky, 350000),
        wastePrice: entryTotal(equipment.waste, 200000),
        warrantyYears: warranty.years ?? 5,
        bondYears: warranty.bond_years ?? 3,
        laborCostPerPum:
          typeof cfg.labor_cost_per_pum === 'number' ? cfg.labor_cost_per_pum : 220000,
        complexCount: Array.isArray(baseItems.complex) ? baseItems.complex.length : 0,
        urethaneCount: Array.isArray(baseItems.urethane) ? baseItems.urethane.length : 0,
        presetCount: presets.length,
      })
    } catch (err) {
      console.error('설정 요약 로드 오류:', err)
    }
  }

  if (!data) return null

  const chips: { label: string; value: string }[] = [
    { label: '공과잡비', value: `${data.overheadRate}%` },
    { label: '이윤', value: `${data.profitRate}%` },
    { label: '절사', value: `${fm(data.roundUnit / 10000)}만` },
    { label: '보증', value: `${data.warrantyYears}년` },
    { label: '복합', value: `${data.complexCount}공종` },
    { label: '우레탄', value: `${data.urethaneCount}공종` },
    { label: '프리셋', value: `${data.presetCount}개` },
  ]

  return (
    <div
      data-testid="settings-summary-bar"
      className="flex flex-wrap items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-card"
    >
      <span className="mr-1 text-xs font-semibold text-ink-secondary">현재 적용</span>
      {chips.map((chip) => (
        <span
          key={chip.label}
          className="inline-flex items-center gap-1 rounded-lg bg-surface-muted px-2.5 py-1 text-xs"
        >
          <span className="text-ink-muted">{chip.label}</span>
          <span className="font-medium text-ink">{chip.value}</span>
        </span>
      ))}
    </div>
  )
}
