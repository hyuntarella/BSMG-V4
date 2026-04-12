'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import type { AreaRange, Method, PriceMatrixRow } from '@/lib/estimate/types'
import { COMPLEX_BASE, URETHANE_BASE } from '@/lib/estimate/constants'

/** 칩 식별 키 */
type ChipKey = `${Method}|${AreaRange}|${number}`

function makeChipKey(method: Method, areaRange: AreaRange, ppp: number): ChipKey {
  return `${method}|${areaRange}|${ppp}`
}

/**
 * 전체 P매트릭스 상태 관리 훅.
 *
 * - 진입 시 1회 bulk 로드
 * - 클라이언트 메모리에서 method/areaRange/ppp 필터링
 * - dirty 추적: 변경된 칩만 서버 PUT
 * - React.memo 친화적: 하위 컴포넌트에 안정적 참조 전달
 */
export function usePriceMatrixStore() {
  const [allRows, setAllRows] = useState<PriceMatrixRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  /** 원본 스냅샷 (dirty 비교용) */
  const snapshotRef = useRef<PriceMatrixRow[]>([])

  /** 변경된 칩 키 집합 */
  const [dirtyChips, setDirtyChips] = useState<Set<ChipKey>>(new Set())

  /** 삭제 예약 칩 (서버 DELETE 필요) */
  const [deletedChips, setDeletedChips] = useState<
    { method: Method; areaRange: AreaRange; ppp: number }[]
  >([])

  const dirty = dirtyChips.size > 0 || deletedChips.length > 0

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }, [])

  // ── 로드 ──
  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings/price-matrix/bulk')
      const json = await res.json()
      if (res.ok) {
        const rows: PriceMatrixRow[] = json.rows ?? []
        setAllRows(rows)
        snapshotRef.current = rows.map((r) => ({ ...r }))
        setDirtyChips(new Set())
        setDeletedChips([])
      }
    } catch (err) {
      console.error('P매트릭스 벌크 로드 오류:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── 필터링 (method × areaRange) ──
  const getRowsFor = useCallback(
    (method: Method, areaRange: AreaRange): PriceMatrixRow[] => {
      return allRows.filter(
        (r) => r.method === method && r.area_range === areaRange,
      )
    },
    [allRows],
  )

  const getPppList = useCallback(
    (method: Method, areaRange: AreaRange): number[] => {
      const set = new Set<number>()
      for (const r of allRows) {
        if (r.method === method && r.area_range === areaRange) {
          set.add(r.price_per_pyeong)
        }
      }
      return Array.from(set).sort((a, b) => a - b)
    },
    [allRows],
  )

  // ── 셀 값 조회 ──
  const getCellValue = useCallback(
    (
      method: Method,
      areaRange: AreaRange,
      ppp: number,
      itemIndex: number,
      field: 'mat' | 'labor' | 'exp',
    ): number => {
      const row = allRows.find(
        (r) =>
          r.method === method &&
          r.area_range === areaRange &&
          r.price_per_pyeong === ppp &&
          r.item_index === itemIndex,
      )
      return row ? row[field] : 0
    },
    [allRows],
  )

  // ── 셀 편집 커밋 ──
  const commitCellEdit = useCallback(
    (
      method: Method,
      areaRange: AreaRange,
      ppp: number,
      itemIndex: number,
      field: 'mat' | 'labor' | 'exp',
      value: number,
    ) => {
      const chipKey = makeChipKey(method, areaRange, ppp)

      setAllRows((prev) => {
        const idx = prev.findIndex(
          (r) =>
            r.method === method &&
            r.area_range === areaRange &&
            r.price_per_pyeong === ppp &&
            r.item_index === itemIndex,
        )
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], [field]: value }
          return updated
        }
        // 새 행 생성
        return [
          ...prev,
          {
            company_id: '',
            area_range: areaRange,
            method,
            price_per_pyeong: ppp,
            item_index: itemIndex,
            mat: field === 'mat' ? value : 0,
            labor: field === 'labor' ? value : 0,
            exp: field === 'exp' ? value : 0,
          },
        ]
      })

      setDirtyChips((prev) => new Set(prev).add(chipKey))
    },
    [],
  )

  // ── 평단가 추가 ──
  const addPpp = useCallback(
    (method: Method, areaRange: AreaRange, ppp: number) => {
      const baseItems = method === '복합' ? COMPLEX_BASE : URETHANE_BASE
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
      setAllRows((prev) => [...prev, ...seeded])
      setDirtyChips((prev) => new Set(prev).add(makeChipKey(method, areaRange, ppp)))
    },
    [],
  )

  // ── 평단가 삭제 ──
  const deletePpp = useCallback(
    (method: Method, areaRange: AreaRange, ppp: number) => {
      setAllRows((prev) =>
        prev.filter(
          (r) =>
            !(
              r.method === method &&
              r.area_range === areaRange &&
              r.price_per_pyeong === ppp
            ),
        ),
      )
      // 서버에도 존재하는 행이면 삭제 예약
      const existsInSnapshot = snapshotRef.current.some(
        (r) =>
          r.method === method &&
          r.area_range === areaRange &&
          r.price_per_pyeong === ppp,
      )
      if (existsInSnapshot) {
        setDeletedChips((prev) => [...prev, { method, areaRange, ppp }])
      }
      // dirty 에서 제거 (삭제된 칩은 deletedChips로 관리)
      setDirtyChips((prev) => {
        const next = new Set(prev)
        next.delete(makeChipKey(method, areaRange, ppp))
        return next
      })
    },
    [],
  )

  // ── 저장 (변경분만) ──
  const save = useCallback(async () => {
    setSaving(true)
    try {
      const errors: string[] = []

      // 1) 삭제 요청
      for (const { method, areaRange, ppp } of deletedChips) {
        const res = await fetch(
          `/api/settings/price-matrix?area_range=${encodeURIComponent(areaRange)}&method=${encodeURIComponent(method)}&price_per_pyeong=${ppp}`,
          { method: 'DELETE' },
        )
        if (!res.ok) {
          const json = await res.json()
          errors.push(`삭제 실패 (${method} ${areaRange} ${ppp}): ${json.error}`)
        }
      }

      // 2) 변경/추가된 칩 rows PUT
      if (dirtyChips.size > 0) {
        const rowsToSave: PriceMatrixRow[] = []
        const chipArray = Array.from(dirtyChips)
        for (const chipKey of chipArray) {
          const [method, areaRange, pppStr] = chipKey.split('|') as [Method, AreaRange, string]
          const ppp = Number(pppStr)
          const chipRows = allRows.filter(
            (r) =>
              r.method === method &&
              r.area_range === areaRange &&
              r.price_per_pyeong === ppp,
          )
          rowsToSave.push(...chipRows)
        }
        if (rowsToSave.length > 0) {
          const res = await fetch('/api/settings/price-matrix', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows: rowsToSave }),
          })
          if (!res.ok) {
            const json = await res.json()
            errors.push(`저장 실패: ${json.error}`)
          }
        }
      }

      if (errors.length > 0) {
        showToast(errors.join('; '))
      } else {
        // 스냅샷 갱신
        snapshotRef.current = allRows.map((r) => ({ ...r }))
        setDirtyChips(new Set())
        setDeletedChips([])
        showToast('저장됨')
      }
    } catch (err) {
      showToast(`저장 오류: ${err}`)
    } finally {
      setSaving(false)
    }
  }, [allRows, dirtyChips, deletedChips, showToast])

  // ── 현재 평단가 계산 (해당 칩의 row 합산 / 공종 수) ──
  const computeUnitPrice = useCallback(
    (method: Method, areaRange: AreaRange, ppp: number): number => {
      const chipRows = allRows.filter(
        (r) =>
          r.method === method &&
          r.area_range === areaRange &&
          r.price_per_pyeong === ppp,
      )
      if (chipRows.length === 0) return 0
      let total = 0
      for (const r of chipRows) {
        total += r.mat + r.labor + r.exp
      }
      return total
    },
    [allRows],
  )

  // ── 스냅샷 기준 원래 평단가 ──
  const computeOriginalUnitPrice = useCallback(
    (method: Method, areaRange: AreaRange, ppp: number): number => {
      const chipRows = snapshotRef.current.filter(
        (r) =>
          r.method === method &&
          r.area_range === areaRange &&
          r.price_per_pyeong === ppp,
      )
      if (chipRows.length === 0) return 0
      let total = 0
      for (const r of chipRows) {
        total += r.mat + r.labor + r.exp
      }
      return total
    },
    [],
  )

  return {
    allRows,
    loading,
    saving,
    toast,
    dirty,
    loadAll,
    getRowsFor,
    getPppList,
    getCellValue,
    commitCellEdit,
    addPpp,
    deletePpp,
    save,
    showToast,
    computeUnitPrice,
    computeOriginalUnitPrice,
  }
}

export type PriceMatrixStore = ReturnType<typeof usePriceMatrixStore>
