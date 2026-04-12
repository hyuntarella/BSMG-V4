'use client'

import { useCallback, useMemo } from 'react'
import type { Estimate } from '@/lib/estimate/types'
import { calc } from '@/lib/estimate/calc'
import {
  applyUrethaneBase05,
  deriveBase05Default,
  syncWallAndTop,
  type UrethaneBase05,
} from '@/lib/estimate/syncUrethane'

/**
 * #6 우레탄 0.5mm 기준 단가 컨트롤
 *
 * 위치: 탭 바 바로 아래, 표 상단. CustomerInfoCard 에서 이동.
 *
 * 동작:
 *  - 토글 ON 시 우레탄 1차 행에서 base05 힌트 자동 유도
 *  - mat/labor/exp 입력 → applyUrethaneBase05 로 복합·우레탄 시트 동시 갱신
 *  - 벽체/상도는 우레탄 시트 값을 복합 시트에 1:1 복사 (일관성 유지)
 *
 * 목적: 고객 신뢰도 — 두 견적서 나란히 볼 때 두께 대비 단가가 일관됨을 확인.
 */
interface UrethaneBase05ControlProps {
  estimate: Estimate
  onChange: (estimate: Estimate) => void
  onSaveSnapshot?: (description: string) => void
}

const r100 = (v: number) => Math.round(v / 100) * 100

export default function UrethaneBase05Control({
  estimate,
  onChange,
  onSaveSnapshot,
}: UrethaneBase05ControlProps) {
  const enabled = estimate.sync_urethane !== false

  const complexIdx = estimate.sheets.findIndex(s => s.type === '복합')
  const urethaneIdx = estimate.sheets.findIndex(s => s.type === '우레탄')

  // 현재 base05 — 우레탄 1차에서 역산 (없으면 0으로 fallback)
  const base05: UrethaneBase05 = useMemo(() => {
    if (urethaneIdx < 0) return { mat: 0, labor: 0, exp: 0 }
    const derived = deriveBase05Default(estimate.sheets[urethaneIdx].items)
    return derived ?? { mat: 0, labor: 0, exp: 0 }
  }, [estimate, urethaneIdx])

  const applyAndPropagate = useCallback(
    (next: UrethaneBase05, description: string) => {
      if (complexIdx < 0 || urethaneIdx < 0) return
      onSaveSnapshot?.(description)

      const complexItems = estimate.sheets[complexIdx].items
      const urethaneItems = estimate.sheets[urethaneIdx].items

      // 1) 노출 우레탄 3종 배수 적용
      const { complex: c1, urethane: u1 } = applyUrethaneBase05(
        complexItems,
        urethaneItems,
        { mat: r100(next.mat), labor: r100(next.labor), exp: r100(next.exp) },
      )

      // 2) 벽체/상도 1:1 복사 (우레탄 → 복합)
      const { complex: c2, urethane: u2 } = syncWallAndTop(c1, u1, 'urethane-to-complex')

      const sheets = [...estimate.sheets]
      sheets[complexIdx] = {
        ...sheets[complexIdx],
        items: c2,
        grand_total: calc(c2.filter(i => !i.is_hidden)).grandTotal,
      }
      sheets[urethaneIdx] = {
        ...sheets[urethaneIdx],
        items: u2,
        grand_total: calc(u2.filter(i => !i.is_hidden)).grandTotal,
      }
      onChange({ ...estimate, sheets, sync_urethane: true })
    },
    [estimate, complexIdx, urethaneIdx, onChange, onSaveSnapshot],
  )

  const handleToggle = useCallback(
    (checked: boolean) => {
      if (checked) {
        // 켜는 순간: 현재 우레탄 1차에서 유도한 base05로 양쪽 시트 재정렬
        applyAndPropagate(base05, '우레탄 0.5mm 동기화 ON')
      } else {
        onSaveSnapshot?.('우레탄 0.5mm 동기화 OFF')
        onChange({ ...estimate, sync_urethane: false })
      }
    },
    [applyAndPropagate, base05, estimate, onChange, onSaveSnapshot],
  )

  const handleFieldChange = useCallback(
    (field: keyof UrethaneBase05) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = Number(e.target.value)
      if (!Number.isFinite(raw) || raw < 0) return
      const next = { ...base05, [field]: raw }
      applyAndPropagate(next, `0.5mm ${field} 입력`)
    },
    [applyAndPropagate, base05],
  )

  if (complexIdx < 0 || urethaneIdx < 0) return null

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-md border px-2.5 py-1 text-xs transition-all ${enabled ? 'border-v-accent bg-v-accent-bg' : 'border-v-b bg-white'}`}
      data-testid="urethane-base05-control"
    >
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => handleToggle(e.target.checked)}
          className="h-4 w-4 cursor-pointer rounded border-v-b accent-v-accent"
          data-testid="urethane-base05-toggle"
        />
        <span className="font-semibold text-[13px] text-v-hdr">0.5mm</span>
      </label>
      <span className="hidden text-[10px] text-v-mut sm:inline">
        1차×2 · 2차×4 · 복합노출×3
      </span>

      <div className={`ml-auto flex items-center gap-1.5 border-l border-v-b pl-2 ${enabled ? '' : 'opacity-40 pointer-events-none'}`}>
        <Field label="재료" value={base05.mat} onChange={handleFieldChange('mat')} testId="base05-mat" />
        <Field label="인건" value={base05.labor} onChange={handleFieldChange('labor')} testId="base05-labor" />
        <Field label="경비" value={base05.exp} onChange={handleFieldChange('exp')} testId="base05-exp" />
        <span className="ml-1 text-[10px] text-v-mut">원/m²</span>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  testId,
}: {
  label: string
  value: number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  testId: string
}) {
  return (
    <label className="flex items-center gap-1">
      <span className="text-[10px] text-v-mut">{label}</span>
      <input
        type="number"
        value={value || ''}
        onChange={onChange}
        placeholder="0"
        min={0}
        step={100}
        className="w-[54px] h-6 rounded-[3px] border border-v-b px-1.5 text-right font-semibold tabular-nums text-xs"
        data-testid={testId}
      />
    </label>
  )
}
