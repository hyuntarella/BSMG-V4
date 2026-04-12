'use client'

import { useState } from 'react'
import type { AreaRange, Method } from '@/lib/estimate/types'
import PriceMatrixChips from '@/components/settings/PriceMatrixChips'
import PriceMatrixDetailTable from '@/components/settings/PriceMatrixDetailTable'
import { usePriceMatrixEditor } from '@/components/settings/usePriceMatrixEditor'
import { getMarginDisplay } from '@/lib/estimate/costBreakdown'
import { fm } from '@/lib/utils/format'

/** 면적대별 대표 평수 (마진 미리보기용) */
const AREA_MIDPOINTS: Record<AreaRange, number> = {
  '20평이하': 15,
  '50평미만': 35,
  '50~100평': 75,
  '100~200평': 150,
  '200평이상': 250,
}

interface Props {
  areaRange: AreaRange
  method: Method
  defaultOpen?: boolean
}

/**
 * 아코디언 항목 — 하나의 면적대에 대한 P매트릭스 칩 + 상세 테이블.
 * 접혔을 때 칩 수 뱃지, 펼쳤을 때 전체 편집 UI.
 */
export default function PriceMatrixAccordionItem({ areaRange, method, defaultOpen }: Props) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  const s = usePriceMatrixEditor(areaRange, method)
  const midPyeong = AREA_MIDPOINTS[areaRange]

  const chipCount = s.pppList.length

  return (
    <div className="rounded-xl border border-ink-faint/20 bg-white transition-shadow hover:shadow-card">
      {/* 헤더 (항상 표시) */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className={`text-xs transition-transform ${open ? 'rotate-90' : ''}`}>
            ▶
          </span>
          <span className="text-sm font-semibold text-ink">{areaRange}</span>
          {chipCount > 0 && (
            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand tabular-nums">
              {chipCount}세트
            </span>
          )}
        </div>
        {/* 칩 미리보기 (접힌 상태) */}
        {!open && chipCount > 0 && (
          <div className="flex gap-1.5">
            {s.pppList.slice(0, 4).map((ppp) => {
              const margin = getMarginDisplay(ppp, midPyeong)
              return (
                <span
                  key={ppp}
                  className="rounded-md bg-surface-muted px-2 py-0.5 text-[10px] tabular-nums text-ink-secondary"
                >
                  {fm(ppp)} · {margin.formatted}
                </span>
              )
            })}
            {chipCount > 4 && (
              <span className="text-[10px] text-ink-muted">+{chipCount - 4}</span>
            )}
          </div>
        )}
      </button>

      {/* 상세 (펼친 상태) */}
      {open && (
        <div className="border-t border-ink-faint/10 px-4 pb-4 pt-3">
          {s.loading ? (
            <div className="py-8 text-center text-sm text-ink-muted">로딩 중…</div>
          ) : (
            <div className="space-y-4">
              {/* 칩 + 저장 버튼 */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <PriceMatrixChips
                    pppList={s.pppList}
                    selectedPpp={s.selectedPpp}
                    onSelect={s.setSelectedPpp}
                    onAdd={s.handleAddPpp}
                    onDelete={s.handleDeletePpp}
                    marginPyeong={midPyeong}
                  />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {s.toast && (
                    <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
                      {s.toast}
                    </span>
                  )}
                  <button
                    onClick={s.handleSave}
                    disabled={s.saving || s.rows.length === 0}
                    className="btn-primary !px-3 !py-1.5 !text-xs"
                  >
                    {s.saving ? '저장 중…' : '저장'}
                  </button>
                </div>
              </div>

              {/* 상세 테이블 */}
              {s.pppList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-ink-faint/30 py-10 text-center text-sm text-ink-muted">
                  단가 데이터 없음 — 위 <span className="font-medium">+ 평단가 추가</span>를 눌러 시작
                </div>
              ) : s.selectedPpp !== null ? (
                <PriceMatrixDetailTable
                  items={s.baseItems}
                  ppp={s.selectedPpp}
                  getCellValue={s.getCellValue}
                  editingCell={s.editingCell}
                  editValue={s.editValue}
                  onStartEdit={s.startEdit}
                  onChangeEdit={s.setEditValue}
                  onCommitEdit={s.commitEdit}
                  onCancelEdit={() => s.setEditingCell(null)}
                />
              ) : (
                <div className="rounded-xl border border-dashed border-ink-faint/30 py-6 text-center text-sm text-ink-muted">
                  위에서 평단가를 선택하세요
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
