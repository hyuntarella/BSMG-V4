'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { AreaRange, Method, PriceMatrixRow } from '@/lib/estimate/types'
import { AREA_BOUNDARIES, COMPLEX_BASE, URETHANE_BASE } from '@/lib/estimate/constants'
import PriceMatrixChips from '@/components/settings/PriceMatrixChips'
import PriceMatrixControls from '@/components/settings/PriceMatrixControls'
import PriceMatrixDetailTable, {
  type PriceMatrixEditingCell,
} from '@/components/settings/PriceMatrixDetailTable'

const AREA_RANGES: AreaRange[] = AREA_BOUNDARIES
  .filter((b) => b.max !== Infinity)
  .map((b) => b.label)
  .concat(['200평이상'])

const METHODS: Method[] = ['복합', '우레탄']

export default function PriceMatrixEditor() {
  const [areaRange, setAreaRange] = useState<AreaRange>('50~100평')
  const [method, setMethod] = useState<Method>('복합')
  const [rows, setRows] = useState<PriceMatrixRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedPpp, setSelectedPpp] = useState<number | null>(null)
  const [editingCell, setEditingCell] = useState<PriceMatrixEditingCell | null>(null)
  const [editValue, setEditValue] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setEditingCell(null)
    try {
      const res = await fetch(
        `/api/settings/price-matrix?area_range=${encodeURIComponent(areaRange)}&method=${encodeURIComponent(method)}`,
      )
      const json = await res.json()
      if (res.ok) {
        setRows(json.rows ?? [])
      } else {
        console.error('P매트릭스 로드 실패:', json.error)
        setRows([])
      }
    } catch (err) {
      console.error('P매트릭스 로드 오류:', err)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [areaRange, method])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 면적대/공법 변경 시 선택 + 편집 상태 리셋 (유령 셀 편집 방지)
  useEffect(() => {
    setSelectedPpp(null)
    setEditingCell(null)
  }, [areaRange, method])

  const pppList = useMemo(
    () => Array.from(new Set(rows.map((r) => r.price_per_pyeong))).sort((a, b) => a - b),
    [rows],
  )
  const baseItems = method === '복합' ? COMPLEX_BASE : URETHANE_BASE

  const getCellValue = useCallback(
    (ppp: number, itemIndex: number, field: 'mat' | 'labor' | 'exp'): number => {
      const row = rows.find(
        (r) => r.price_per_pyeong === ppp && r.item_index === itemIndex,
      )
      return row ? row[field] : 0
    },
    [rows],
  )

  const startEdit = useCallback(
    (itemIndex: number, field: 'mat' | 'labor' | 'exp') => {
      if (selectedPpp === null) return
      const val = getCellValue(selectedPpp, itemIndex, field)
      setEditingCell({ item_index: itemIndex, field })
      setEditValue(String(val))
    },
    [selectedPpp, getCellValue],
  )

  const commitEdit = useCallback(() => {
    if (!editingCell || selectedPpp === null) return
    const parsed = parseInt(editValue, 10)
    if (isNaN(parsed)) {
      setEditingCell(null)
      return
    }
    const ppp = selectedPpp
    setRows((prev) => {
      const existing = prev.find(
        (r) => r.price_per_pyeong === ppp && r.item_index === editingCell.item_index,
      )
      if (existing) {
        return prev.map((r) =>
          r.price_per_pyeong === ppp && r.item_index === editingCell.item_index
            ? { ...r, [editingCell.field]: parsed }
            : r,
        )
      }
      // 새 행 추가 (DB에 없었던 경우)
      return [
        ...prev,
        {
          company_id: '',
          area_range: areaRange,
          method,
          price_per_pyeong: ppp,
          item_index: editingCell.item_index,
          mat: editingCell.field === 'mat' ? parsed : 0,
          labor: editingCell.field === 'labor' ? parsed : 0,
          exp: editingCell.field === 'exp' ? parsed : 0,
        },
      ]
    })
    setEditingCell(null)
  }, [editingCell, editValue, selectedPpp, areaRange, method])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/price-matrix', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const json = await res.json()
      if (res.ok) {
        showToast('저장됨')
      } else {
        showToast(`저장 실패: ${json.error}`)
      }
    } catch (err) {
      showToast(`저장 오류: ${err}`)
    } finally {
      setSaving(false)
    }
  }, [rows])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  return (
    <div className="space-y-4">
      <PriceMatrixControls
        areaRanges={AREA_RANGES}
        methods={METHODS}
        areaRange={areaRange}
        method={method}
        onAreaRangeChange={setAreaRange}
        onMethodChange={setMethod}
        toast={toast}
        saving={saving}
        canSave={rows.length > 0}
        onSave={handleSave}
      />

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400">로딩 중…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center text-sm text-gray-500">
          해당 면적대/공법의 단가 데이터가 없습니다
        </div>
      ) : (
        <div className="space-y-4">
          <PriceMatrixChips
            pppList={pppList}
            selectedPpp={selectedPpp}
            onSelect={setSelectedPpp}
          />
          {selectedPpp !== null ? (
            <PriceMatrixDetailTable
              items={baseItems}
              ppp={selectedPpp}
              getCellValue={getCellValue}
              editingCell={editingCell}
              editValue={editValue}
              onStartEdit={startEdit}
              onChangeEdit={setEditValue}
              onCommitEdit={commitEdit}
              onCancelEdit={() => setEditingCell(null)}
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
