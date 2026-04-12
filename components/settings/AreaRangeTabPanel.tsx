'use client'

import { memo, useState, useCallback, useMemo } from 'react'
import type { AreaRange, Method } from '@/lib/estimate/types'
import { COMPLEX_BASE, URETHANE_BASE } from '@/lib/estimate/constants'
import PriceMatrixChips from '@/components/settings/PriceMatrixChips'
import PriceMatrixDetailTable from '@/components/settings/PriceMatrixDetailTable'
import type { PriceMatrixStore } from '@/components/settings/usePriceMatrixStore'

/** 면적대별 대표 평수 (마진 미리보기용) */
const AREA_MIDPOINTS: Record<AreaRange, number> = {
  '20평이하': 15,
  '50평미만': 35,
  '50~100평': 75,
  '100~200평': 150,
  '200평이상': 250,
}

interface Props {
  method: Method
  areaRange: AreaRange
  store: PriceMatrixStore
}

/**
 * 면적대 탭 패널 — 칩 목록 + 상세 테이블.
 * React.memo로 감싸 다른 면적대 편집 시 리렌더 방지.
 */
function AreaRangeTabPanelInner({ method, areaRange, store }: Props) {
  const [selectedPpp, setSelectedPpp] = useState<number | null>(null)
  const baseItems = method === '복합' ? COMPLEX_BASE : URETHANE_BASE
  const midPyeong = AREA_MIDPOINTS[areaRange]

  const pppList = store.getPppList(method, areaRange)

  // 선택된 ppp가 목록에서 사라지면 리셋
  const effectivePpp = pppList.includes(selectedPpp ?? -1) ? selectedPpp : null

  const handleAdd = useCallback(
    (ppp: number) => {
      store.addPpp(method, areaRange, ppp)
      setSelectedPpp(ppp)
    },
    [store, method, areaRange],
  )

  const handleDelete = useCallback(
    (ppp: number) => {
      const ok = window.confirm(
        `평당 ${ppp.toLocaleString()}원 전체를 삭제합니다.\n(${areaRange} / ${method})\n되돌릴 수 없습니다.`,
      )
      if (!ok) return
      store.deletePpp(method, areaRange, ppp)
      if (selectedPpp === ppp) setSelectedPpp(null)
    },
    [store, method, areaRange, selectedPpp],
  )

  return (
    <div className="space-y-4">
      <PriceMatrixChips
        pppList={pppList}
        selectedPpp={effectivePpp}
        onSelect={setSelectedPpp}
        onAdd={handleAdd}
        onDelete={handleDelete}
        marginPyeong={midPyeong}
      />

      {pppList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-faint/30 py-10 text-center text-sm text-ink-muted">
          단가 데이터 없음 — 위 <span className="font-medium">+ 추가</span>를 눌러 시작
        </div>
      ) : effectivePpp !== null ? (
        <PriceMatrixDetailTable
          items={baseItems}
          method={method}
          areaRange={areaRange}
          ppp={effectivePpp}
          store={store}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-ink-faint/30 py-6 text-center text-sm text-ink-muted">
          위에서 평단가를 선택하세요
        </div>
      )}
    </div>
  )
}

const AreaRangeTabPanel = memo(AreaRangeTabPanelInner)
export default AreaRangeTabPanel
