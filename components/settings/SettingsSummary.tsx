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
  materialIncreaseRate: number
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
      const equipment = (cfg.equipment_prices ?? {}) as Record<string, number>
      const warranty = (cfg.warranty ?? {}) as Record<string, number>
      const baseItems = (cfg.base_items ?? {}) as Record<string, unknown[]>
      const presets: unknown[] = Array.isArray(presetsJson.presets) ? presetsJson.presets : []

      setData({
        overheadRate: Math.round((calcRules.overhead_rate ?? 0.03) * 100),
        profitRate: Math.round((calcRules.profit_rate ?? 0.06) * 100),
        roundUnit: calcRules.round_unit ?? 100000,
        ladderPrice: equipment.ladder ?? 120000,
        skyPrice: equipment.sky ?? 350000,
        wastePrice: equipment.waste ?? 200000,
        warrantyYears: warranty.years ?? 5,
        bondYears: warranty.bond_years ?? 3,
        laborCostPerPum:
          typeof cfg.labor_cost_per_pum === 'number' ? cfg.labor_cost_per_pum : 220000,
        materialIncreaseRate:
          typeof cfg.material_increase_rate === 'number'
            ? Math.round(cfg.material_increase_rate * 100)
            : 20,
        complexCount: Array.isArray(baseItems.complex) ? baseItems.complex.length : 0,
        urethaneCount: Array.isArray(baseItems.urethane) ? baseItems.urethane.length : 0,
        presetCount: presets.length,
      })
    } catch (err) {
      console.error('설정 요약 로드 오류:', err)
    }
  }

  if (!data) return null

  const SUMMARY_ITEMS = [
    `공과잡비 ${data.overheadRate}%`,
    `기업이윤 ${data.profitRate}%`,
    `절사 ${fm(data.roundUnit / 10000)}만원`,
    `사다리차 ${fm(data.ladderPrice / 10000)}만원/일`,
    `스카이차 ${fm(data.skyPrice / 10000)}만원/일`,
    `보증 ${data.warrantyYears}년`,
  ]

  return (
    <div
      data-testid="settings-summary-bar"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2"
    >
      <span className="text-xs font-medium text-gray-500 shrink-0">현재 적용</span>
      {SUMMARY_ITEMS.map((item) => (
        <span key={item} className="text-xs text-gray-600">
          {item}
        </span>
      ))}
      <span className="text-xs text-gray-400">
        | 복합 {data.complexCount}공종 · 우레탄 {data.urethaneCount}공종 · 프리셋 {data.presetCount}개
      </span>
    </div>
  )
}
