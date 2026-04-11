'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { AreaRange, Method, PriceMatrixRow } from '@/lib/estimate/types'
import { COMPLEX_BASE, URETHANE_BASE } from '@/lib/estimate/constants'
import type { PriceMatrixEditingCell } from '@/components/settings/PriceMatrixDetailTable'

/**
 * 단가표 편집기 상태/핸들러 훅.
 * PriceMatrixEditor 를 렌더 전용으로 유지하기 위해 모든 비즈 로직을 여기로 격리.
 */
export function usePriceMatrixEditor() {
  const [areaRange, setAreaRange] = useState<AreaRange>('50~100평')
  const [method, setMethod] = useState<Method>('복합')
  const [rows, setRows] = useState<PriceMatrixRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedPpp, setSelectedPpp] = useState<number | null>(null)
  const [editingCell, setEditingCell] = useState<PriceMatrixEditingCell | null>(null)
  const [editValue, setEditValue] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }, [])

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

  const handleAddPpp = useCallback(
    (ppp: number) => {
      // 공종 × (재료/인건/경비 전부 0) 로컬 시드 — 저장 시 PUT 으로 insert 된다
      const seeded: PriceMatrixRow[] = baseItems.map((_, idx) => ({
        company_id: '',
        area_range: areaRange,
        method,
        price_per_pyeong: ppp,
        item_index: idx,
        mat: 0,
        labor: 0,
        exp: 0,
      }))
      setRows((prev) => [...prev, ...seeded])
      setSelectedPpp(ppp)
      setEditingCell(null)
    },
    [areaRange, method, baseItems],
  )

  const handleDeletePpp = useCallback(
    async (ppp: number) => {
      const ok = window.confirm(
        `평당 ${ppp.toLocaleString()}원 전체를 삭제합니다.\n(${areaRange} / ${method})\n되돌릴 수 없습니다.`,
      )
      if (!ok) return
      try {
        const res = await fetch(
          `/api/settings/price-matrix?area_range=${encodeURIComponent(areaRange)}&method=${encodeURIComponent(method)}&price_per_pyeong=${ppp}`,
          { method: 'DELETE' },
        )
        const json = await res.json()
        if (!res.ok) {
          showToast(`삭제 실패: ${json.error}`)
          return
        }
        setRows((prev) => prev.filter((r) => r.price_per_pyeong !== ppp))
        if (selectedPpp === ppp) setSelectedPpp(null)
        setEditingCell(null)
        showToast('삭제됨')
      } catch (err) {
        showToast(`삭제 오류: ${err}`)
      }
    },
    [areaRange, method, selectedPpp, showToast],
  )

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
  }, [rows, showToast])

  return {
    areaRange,
    method,
    rows,
    loading,
    saving,
    selectedPpp,
    editingCell,
    editValue,
    toast,
    pppList,
    baseItems,
    setAreaRange,
    setMethod,
    setSelectedPpp,
    setEditValue,
    setEditingCell,
    getCellValue,
    startEdit,
    commitEdit,
    handleAddPpp,
    handleDeletePpp,
    handleSave,
  }
}
