'use client'

import type { AreaRange, Method } from '@/lib/estimate/types'
import { AREA_BOUNDARIES } from '@/lib/estimate/constants'
import PriceMatrixChips from '@/components/settings/PriceMatrixChips'
import PriceMatrixControls from '@/components/settings/PriceMatrixControls'
import PriceMatrixDetailTable from '@/components/settings/PriceMatrixDetailTable'
import { usePriceMatrixEditor } from '@/components/settings/usePriceMatrixEditor'

const AREA_RANGES: AreaRange[] = AREA_BOUNDARIES
  .filter((b) => b.max !== Infinity)
  .map((b) => b.label)
  .concat(['200평이상'])

const METHODS: Method[] = ['복합', '우레탄']

export default function PriceMatrixEditor() {
  const s = usePriceMatrixEditor()

  return (
    <div className="space-y-4">
      <PriceMatrixControls
        areaRanges={AREA_RANGES}
        methods={METHODS}
        areaRange={s.areaRange}
        method={s.method}
        onAreaRangeChange={s.setAreaRange}
        onMethodChange={s.setMethod}
        toast={s.toast}
        saving={s.saving}
        canSave={s.rows.length > 0}
        onSave={s.handleSave}
      />

      {s.loading ? (
        <div className="py-12 text-center text-sm text-gray-400">로딩 중…</div>
      ) : (
        <div className="space-y-4">
          <PriceMatrixChips
            pppList={s.pppList}
            selectedPpp={s.selectedPpp}
            onSelect={s.setSelectedPpp}
            onAdd={s.handleAddPpp}
            onDelete={s.handleDeletePpp}
          />
          {s.pppList.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center text-sm text-gray-500">
              해당 면적대/공법의 단가 데이터가 없습니다. 위{' '}
              <span className="font-medium">+ 평단가 추가</span> 를 눌러 시작하세요
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
            <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500">
              위에서 평단가를 선택하세요
            </div>
          )}
        </div>
      )}
    </div>
  )
}
