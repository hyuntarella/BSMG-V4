'use client'

import { useState, useCallback, useRef } from 'react'
import type { Estimate, EstimateItem, EstimateSheet, PriceMatrixRaw } from '@/lib/estimate/types'
import { buildItems } from '@/lib/estimate/buildItems'
import { calc } from '@/lib/estimate/calc'
import { getMargin } from '@/lib/estimate/margin'
import { getAR } from '@/lib/estimate/areaRange'
import type { VoiceCommand } from '@/lib/voice/commands'
import { applyCommands } from '@/lib/voice/commands'
import { routeCommands } from '@/lib/voice/confidenceRouter'

/** 장비 기본 옵션: 사다리차 1일, 폐기물 1식, 드라이비트 포함, 스카이차 미포함 */
const DEFAULT_EQUIPMENT_OPTIONS = {
  ladder: { days: 1 },
  sky: { days: 0 },
  waste: { days: 1 },
  dryvit: true,
} as const

// ── 스냅샷 ──
export interface Snapshot {
  estimate: Estimate
  description: string
  type: 'voice' | 'manual' | 'auto'
  timestamp: number
}

// ── 변경 셀 추적 ──
export type ModifiedCells = Map<string, 'added' | 'changed'>

export function useEstimate(initialEstimate: Estimate, priceMatrix: PriceMatrixRaw) {
  const [estimate, setEstimate] = useState<Estimate>(initialEstimate)
  const [isDirty, setIsDirty] = useState(false)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [modifiedCells, setModifiedCells] = useState<ModifiedCells>(new Map())

  // ── 스냅샷 저장 (변경 전 상태) ──
  const saveSnapshot = useCallback((description: string, type: Snapshot['type'] = 'manual') => {
    setSnapshots(prev => [...prev, {
      estimate: JSON.parse(JSON.stringify(estimate)),
      description,
      type,
      timestamp: Date.now(),
    }])
  }, [estimate])

  // ── 특정 시점으로 복원 ──
  const restoreTo = useCallback((index: number) => {
    if (index < 0 || index >= snapshots.length) return
    setEstimate(JSON.parse(JSON.stringify(snapshots[index].estimate)))
    setModifiedCells(new Map())
    setIsDirty(true)
  }, [snapshots])

  // ── 변경 셀 마킹 ──
  const markCell = useCallback((key: string, type: 'added' | 'changed' = 'changed') => {
    setModifiedCells(prev => {
      const next = new Map(prev)
      next.set(key, type)
      return next
    })
  }, [])

  // ── 메타 업데이트 ──
  const updateMeta = useCallback(
    (field: keyof Estimate, value: string | number | boolean) => {
      console.log('[USE_EST] updateMeta', { field, value })
      saveSnapshot(`${String(field)} 변경`, 'manual')
      setEstimate(prev => {
        const updated = { ...prev, [field]: value }
        if (field === 'm2' || field === 'wall_m2') {
          updated.sheets = prev.sheets.map(sheet =>
            rebuildSheet(sheet, updated.m2, updated.wall_m2, priceMatrix)
          )
        }
        return updated
      })
      setIsDirty(true)
      markCell(`meta:${String(field)}`)
    },
    [priceMatrix, saveSnapshot, markCell],
  )

  // ── 시트 필드 업데이트 ──
  const updateSheet = useCallback(
    (sheetIndex: number, field: string, value: number) => {
      saveSnapshot(`시트${sheetIndex} ${field} 변경`, 'manual')
      setEstimate(prev => {
        const sheets = [...prev.sheets]
        const sheet = { ...sheets[sheetIndex], [field]: value }
        if (field === 'price_per_pyeong') {
          sheets[sheetIndex] = rebuildSheet(sheet, prev.m2, prev.wall_m2, priceMatrix)
        } else {
          sheets[sheetIndex] = sheet
        }
        return { ...prev, sheets }
      })
      setIsDirty(true)
      markCell(`sheet:${sheetIndex}:${field}`)
    },
    [priceMatrix, saveSnapshot, markCell],
  )

  // ── 평단가 변경 (재생성 여부 분기) ──
  const updateSheetPpp = useCallback(
    (sheetIndex: number, ppp: number, rebuild: boolean) => {
      console.log('[USE_EST] updateSheetPpp', { sheetIndex, ppp, rebuild })
      saveSnapshot(`시트${sheetIndex} 평단가 변경`, 'manual')
      setEstimate(prev => {
        const sheets = [...prev.sheets]
        const sheet = { ...sheets[sheetIndex], price_per_pyeong: ppp }
        if (rebuild) {
          sheets[sheetIndex] = rebuildSheet(sheet, prev.m2, prev.wall_m2, priceMatrix)
        } else {
          // 평단가만 변경, 기존 items 유지, grand_total은 items 기준으로 재계산
          const calcResult = calc(sheet.items)
          sheets[sheetIndex] = { ...sheet, grand_total: calcResult.grandTotal }
        }
        return { ...prev, sheets }
      })
      setIsDirty(true)
      markCell(`sheet:${sheetIndex}:price_per_pyeong`)
    },
    [priceMatrix, saveSnapshot, markCell],
  )

  // ── 아이템 필드 업데이트 (#9 수량 오버라이드 포함) ──
  const updateItem = useCallback(
    (sheetIndex: number, itemIndex: number, field: string, value: number) => {
      console.log('[USE_EST] updateItem', { sheetIndex, itemIndex, field, value })
      saveSnapshot(`${estimate.sheets[sheetIndex]?.items[itemIndex]?.name ?? ''} ${field} 변경`, 'manual')
      setEstimate(prev => {
        const sheets = [...prev.sheets]
        const items = [...sheets[sheetIndex].items]
        const item = { ...items[itemIndex], [field]: value }

        // #9 수량 오버라이드: 원본 백업
        if (field === 'qty' && item.original_qty == null) {
          item.original_qty = items[itemIndex].qty
        }

        item.mat_amount = Math.round(item.qty * item.mat)
        item.labor_amount = Math.round(item.qty * item.labor)
        item.exp_amount = Math.round(item.qty * item.exp)
        item.total = item.mat_amount + item.labor_amount + item.exp_amount

        items[itemIndex] = item
        const calcResult = calc(items.filter(i => !i.is_hidden))
        sheets[sheetIndex] = { ...sheets[sheetIndex], items, grand_total: calcResult.grandTotal }
        console.log('[USE_EST] updateItem → setState done', {
          itemName: items[itemIndex]?.name,
          newTotal: item.total,
          grandTotal: calcResult.grandTotal,
        })
        return { ...prev, sheets }
      })
      setIsDirty(true)
      markCell(`item:${sheetIndex}:${itemIndex}:${field}`)
    },
    [estimate.sheets, saveSnapshot, markCell],
  )

  // ── 아이템 텍스트 필드 업데이트 (#7 단위, #8 이름·규격 오버라이드) ──
  const updateItemText = useCallback(
    (sheetIndex: number, itemIndex: number, field: 'name' | 'spec' | 'unit', value: string) => {
      saveSnapshot(`${estimate.sheets[sheetIndex]?.items[itemIndex]?.name ?? ''} ${field} 변경`, 'manual')
      setEstimate(prev => {
        const sheets = [...prev.sheets]
        const items = [...sheets[sheetIndex].items]
        const item = { ...items[itemIndex], [field]: value }

        // #7,8 오버라이드: 원본 백업 (최초 변경 시에만)
        if (field === 'name' && !items[itemIndex].original_name) {
          item.original_name = items[itemIndex].name
        }
        if (field === 'spec' && !items[itemIndex].original_spec) {
          item.original_spec = items[itemIndex].spec
        }
        if (field === 'unit' && !items[itemIndex].original_unit) {
          item.original_unit = items[itemIndex].unit
        }

        items[itemIndex] = item
        sheets[sheetIndex] = { ...sheets[sheetIndex], items }
        return { ...prev, sheets }
      })
      setIsDirty(true)
      markCell(`item:${sheetIndex}:${itemIndex}:${field}`)
    },
    [estimate.sheets, saveSnapshot, markCell],
  )

  // ── 음성 명령 적용 ──
  const applyVoiceCommands = useCallback(
    (commands: VoiceCommand[], sheetIndex: number = 0) => {
      const routing = routeCommands(commands)
      if (!routing.shouldExecute) return { executed: false, routing }

      saveSnapshot(commands.map(c => `${c.action} ${c.target ?? ''}`).join(', '), 'voice')
      setEstimate(prev => {
        const sheets = [...prev.sheets]
        if (!sheets[sheetIndex]) return prev
        const { sheet: updatedSheet } = applyCommands(sheets[sheetIndex], commands)
        sheets[sheetIndex] = updatedSheet
        return { ...prev, sheets }
      })
      setIsDirty(true)

      // 음성 변경 셀 마킹
      commands.forEach(c => {
        if (c.target) markCell(`voice:${sheetIndex}:${c.target}:${c.field ?? c.action}`)
      })

      return { executed: true, routing }
    },
    [saveSnapshot, markCell],
  )

  // ── 시트 추가 ──
  const addSheet = useCallback(
    (type: '복합' | '우레탄') => {
      setEstimate(prev => {
        if (prev.sheets.some(s => s.type === type)) return prev
        const ar = getAR(prev.m2 || 100)
        const methodData = priceMatrix[ar]?.[type]
        const prices = methodData ? Object.keys(methodData).map(Number).sort((a, b) => a - b) : []
        const ppp = prices[Math.floor(prices.length / 2)] ?? 35000

        const { items, calcResult } = buildItems({
          method: type, m2: prev.m2, wallM2: prev.wall_m2,
          pricePerPyeong: ppp, priceMatrix,
          options: DEFAULT_EQUIPMENT_OPTIONS,
        })

        const newSheet: EstimateSheet = {
          type,
          title: type === '복합' ? '복합방수' : '우레탄방수',
          price_per_pyeong: ppp,
          warranty_years: 5, warranty_bond: 3,
          grand_total: calcResult.grandTotal,
          sort_order: type === '복합' ? 0 : 1,
          items,
        }

        const sheets = [...prev.sheets, newSheet].sort((a, b) => a.sort_order - b.sort_order)
        return { ...prev, sheets }
      })
      setIsDirty(true)
    },
    [priceMatrix],
  )

  // ── 마진율 ──
  const getSheetMargin = useCallback(
    (sheetIndex: number): number => {
      const sheet = estimate.sheets[sheetIndex]
      if (!sheet) return 0
      return getMargin(sheet.type, estimate.m2, sheet.grand_total)
    },
    [estimate],
  )

  // ── 공종 추가 ──
  const addItem = useCallback(
    (sheetIndex: number, item: Partial<EstimateItem>) => {
      setEstimate((prev) => {
        const sheets = [...prev.sheets]
        if (!sheets[sheetIndex]) return prev

        const items = [...sheets[sheetIndex].items]
        const newIndex = items.length
        const qty = item.qty ?? 1
        const mat = item.mat ?? 0
        const labor = item.labor ?? 0
        const exp = item.exp ?? 0
        const mat_amount = Math.round(qty * mat)
        const labor_amount = Math.round(qty * labor)
        const exp_amount = Math.round(qty * exp)
        const total = mat_amount + labor_amount + exp_amount

        const newItem: EstimateItem = {
          sort_order: newIndex + 1,
          name: item.name ?? '',
          spec: item.spec ?? '',
          unit: item.unit ?? 'm²',
          qty,
          mat,
          labor,
          exp,
          mat_amount,
          labor_amount,
          exp_amount,
          total,
          is_base: false,
          is_equipment: item.is_equipment ?? false,
          is_fixed_qty: item.is_fixed_qty ?? false,
        }

        items.push(newItem)
        const calcResult = calc(items)
        sheets[sheetIndex] = { ...sheets[sheetIndex], items, grand_total: calcResult.grandTotal }

        return { ...prev, sheets }
      })
      setIsDirty(true)
    },
    [],
  )

  // ── 시트 삭제 ──
  const removeSheet = useCallback(
    (sheetIndex: number) => {
      saveSnapshot(`시트 삭제: ${estimate.sheets[sheetIndex]?.type ?? ''}`, 'manual')
      setEstimate(prev => {
        const sheets = prev.sheets.filter((_, i) => i !== sheetIndex)
        return { ...prev, sheets }
      })
      setIsDirty(true)
    },
    [estimate.sheets, saveSnapshot],
  )

  // ── 공종 순서 변경 ──
  const moveItem = useCallback(
    (sheetIndex: number, fromIndex: number, toIndex: number) => {
      const items = estimate.sheets[sheetIndex]?.items
      if (!items) return
      if (toIndex < 0 || toIndex >= items.length) return
      saveSnapshot(`${items[fromIndex]?.name ?? ''} 순서 변경`, 'manual')
      setEstimate(prev => {
        const sheets = [...prev.sheets]
        if (!sheets[sheetIndex]) return prev
        const newItems = [...sheets[sheetIndex].items]
        const [moved] = newItems.splice(fromIndex, 1)
        newItems.splice(toIndex, 0, moved)
        const reordered = newItems.map((item, i) => ({ ...item, sort_order: i + 1 }))
        sheets[sheetIndex] = { ...sheets[sheetIndex], items: reordered }
        return { ...prev, sheets }
      })
      setIsDirty(true)
    },
    [estimate.sheets, saveSnapshot],
  )

  // ── 공종 삭제 ──
  const removeItem = useCallback(
    (sheetIndex: number, itemIndex: number) => {
      saveSnapshot(`${estimate.sheets[sheetIndex]?.items[itemIndex]?.name ?? ''} 삭제`, 'manual')
      setEstimate(prev => {
        const sheets = [...prev.sheets]
        if (!sheets[sheetIndex]) return prev
        const items = sheets[sheetIndex].items
          .filter((_, i) => i !== itemIndex)
          .map((item, i) => ({ ...item, sort_order: i + 1 }))
        const calcResult = calc(items)
        sheets[sheetIndex] = { ...sheets[sheetIndex], items, grand_total: calcResult.grandTotal }
        return { ...prev, sheets }
      })
      setIsDirty(true)
    },
    [estimate.sheets, saveSnapshot],
  )

  // ── undo (직전 스냅샷에서 sheets만 복원 — 메타 필드는 현재값 유지) ──
  const undo = useCallback(() => {
    if (snapshots.length === 0) return
    const last = snapshots[snapshots.length - 1]
    setEstimate(prev => ({
      ...prev,
      sheets: JSON.parse(JSON.stringify(last.estimate.sheets)),
    }))
    setSnapshots(prev => prev.slice(0, -1))
    setModifiedCells(new Map())
    setIsDirty(true)
  }, [snapshots])

  // ── 음성 플로우 완료 → 한 번에 견적서 생성 ──
  const initFromVoiceFlow = useCallback(
    (data: { area: number; wallM2: number; complexPpp: number | null; urethanePpp: number | null }) => {
      setEstimate(prev => {
        const m2 = data.area || prev.m2 || 100
        const wallM2 = data.wallM2 ?? prev.wall_m2
        const updated = { ...prev, m2, wall_m2: wallM2 }
        const sheets: EstimateSheet[] = []

        // 복합 시트
        if (!prev.sheets.some(s => s.type === '복합')) {
          const ar = getAR(m2)
          const methodData = priceMatrix[ar]?.['복합']
          const prices = methodData ? Object.keys(methodData).map(Number).sort((a, b) => a - b) : []
          const ppp = data.complexPpp ?? prices[Math.floor(prices.length / 2)] ?? 35000

          const { items, calcResult } = buildItems({
            method: '복합', m2, wallM2, pricePerPyeong: ppp, priceMatrix,
            options: DEFAULT_EQUIPMENT_OPTIONS,
          })
          sheets.push({
            type: '복합', title: '복합방수', price_per_pyeong: ppp,
            warranty_years: 5, warranty_bond: 3, grand_total: calcResult.grandTotal,
            sort_order: 0, items,
          })
        }

        // 우레탄 시트
        if (!prev.sheets.some(s => s.type === '우레탄')) {
          const ar = getAR(m2)
          const methodData = priceMatrix[ar]?.['우레탄']
          const prices = methodData ? Object.keys(methodData).map(Number).sort((a, b) => a - b) : []
          const ppp = data.urethanePpp ?? prices[Math.floor(prices.length / 2)] ?? 30000

          const { items, calcResult } = buildItems({
            method: '우레탄', m2, wallM2, pricePerPyeong: ppp, priceMatrix,
            options: DEFAULT_EQUIPMENT_OPTIONS,
          })
          sheets.push({
            type: '우레탄', title: '우레탄방수', price_per_pyeong: ppp,
            warranty_years: 5, warranty_bond: 3, grand_total: calcResult.grandTotal,
            sort_order: 1, items,
          })
        }

        const allSheets = [...prev.sheets, ...sheets].sort((a, b) => a.sort_order - b.sort_order)
        return { ...updated, sheets: allSheets }
      })
      setIsDirty(true)
    },
    [priceMatrix],
  )

  // ── lump 금액 설정 (#11) ──
  const setLumpAmount = useCallback(
    (sheetIndex: number, itemIndex: number, amount: number) => {
      saveSnapshot('lump 금액 설정', 'manual')
      setEstimate(prev => {
        const sheets = [...prev.sheets]
        if (!sheets[sheetIndex]) return prev
        const items = [...sheets[sheetIndex].items]
        const item = { ...items[itemIndex] }

        item.lump_amount = amount
        item.mat_amount = 0
        item.labor_amount = 0
        item.exp_amount = amount
        item.total = amount

        items[itemIndex] = item
        const calcResult = calc(items.filter(i => !i.is_hidden))
        sheets[sheetIndex] = { ...sheets[sheetIndex], items, grand_total: calcResult.grandTotal }
        return { ...prev, sheets }
      })
      setIsDirty(true)
    },
    [saveSnapshot],
  )

  // ── 자유입력 공종 추가 (#12) ──
  const addFreeItem = useCallback(
    (sheetIndex: number, formData: {
      name: string
      spec?: string
      unit?: string
      qty?: number
      mat?: number
      labor?: number
      exp?: number
    }) => {
      saveSnapshot('자유입력 공종 추가', 'manual')
      setEstimate(prev => {
        const sheets = [...prev.sheets]
        if (!sheets[sheetIndex]) return prev
        const items = [...sheets[sheetIndex].items]
        const qty = formData.qty ?? 1
        const mat = formData.mat ?? 0
        const labor = formData.labor ?? 0
        const exp = formData.exp ?? 0
        const mat_amount = Math.round(qty * mat)
        const labor_amount = Math.round(qty * labor)
        const exp_amount = Math.round(qty * exp)

        const newItem: EstimateItem = {
          sort_order: items.length + 1,
          name: formData.name,
          spec: formData.spec ?? '',
          unit: formData.unit ?? 'm²',
          qty,
          mat,
          labor,
          exp,
          mat_amount,
          labor_amount,
          exp_amount,
          total: mat_amount + labor_amount + exp_amount,
          is_base: false,
          is_equipment: false,
          is_fixed_qty: false,
        }

        items.push(newItem)
        const calcResult = calc(items.filter(i => !i.is_hidden))
        sheets[sheetIndex] = { ...sheets[sheetIndex], items, grand_total: calcResult.grandTotal }
        return { ...prev, sheets }
      })
      setIsDirty(true)
    },
    [saveSnapshot],
  )

  // ── 단가 잠금 토글 (#4) ──
  const toggleLock = useCallback(
    (sheetIndex: number, itemIndex: number) => {
      setEstimate(prev => {
        const sheets = [...prev.sheets]
        if (!sheets[sheetIndex]) return prev
        const items = [...sheets[sheetIndex].items]
        items[itemIndex] = { ...items[itemIndex], is_locked: !items[itemIndex].is_locked }
        sheets[sheetIndex] = { ...sheets[sheetIndex], items }
        return { ...prev, sheets }
      })
      setIsDirty(true)
    },
    [],
  )

  // ── 공종 숨김 토글 (#5) ──
  const toggleHide = useCallback(
    (sheetIndex: number, itemIndex: number) => {
      setEstimate(prev => {
        const sheets = [...prev.sheets]
        if (!sheets[sheetIndex]) return prev
        const items = [...sheets[sheetIndex].items]
        items[itemIndex] = { ...items[itemIndex], is_hidden: !items[itemIndex].is_hidden }
        const calcResult = calc(items.filter(i => !i.is_hidden))
        sheets[sheetIndex] = { ...sheets[sheetIndex], items, grand_total: calcResult.grandTotal }
        return { ...prev, sheets }
      })
      setIsDirty(true)
    },
    [],
  )

  // ── CRM 자동채움 (#16) ──
  // CrmRecord 필드명: customerName, address, manager, phone, area (camelCase)
  const fillFromCrm = useCallback(
    (crmCustomer: {
      customerName?: string | null
      address?: string | null
      manager?: string | null
      phone?: string | null
      area?: string | null
    }) => {
      saveSnapshot('CRM 자동채움', 'manual')
      setEstimate(prev => {
        const updated = { ...prev }
        if (crmCustomer.customerName) updated.customer_name = crmCustomer.customerName
        if (crmCustomer.address) updated.site_name = crmCustomer.address
        if (crmCustomer.manager) updated.manager_name = crmCustomer.manager
        if (crmCustomer.phone) updated.manager_phone = crmCustomer.phone
        if (crmCustomer.area) {
          const pyeong = parseFloat(crmCustomer.area)
          if (!isNaN(pyeong) && pyeong > 0) {
            updated.m2 = Math.round(pyeong * 3.3058)
          }
        }
        return updated
      })
      setIsDirty(true)
    },
    [saveSnapshot],
  )

  const markClean = useCallback(() => setIsDirty(false), [])

  return {
    estimate,
    setEstimate,
    isDirty,
    markClean,
    updateMeta,
    updateSheet,
    updateSheetPpp,
    updateItem,
    updateItemText,
    addItem,
    removeItem,
    removeSheet,
    moveItem,
    applyVoiceCommands,
    addSheet,
    initFromVoiceFlow,
    getSheetMargin,
    undo,
    setLumpAmount,
    addFreeItem,
    toggleLock,
    toggleHide,
    fillFromCrm,
    // 스냅샷
    snapshots,
    restoreTo,
    modifiedCells,
    saveSnapshot,
  }
}

function rebuildSheet(
  sheet: EstimateSheet, m2: number, wallM2: number, priceMatrix: PriceMatrixRaw,
): EstimateSheet {
  const { items, calcResult } = buildItems({
    method: sheet.type, m2, wallM2,
    pricePerPyeong: sheet.price_per_pyeong, priceMatrix,
    preserveLockedItems: sheet.items,
    options: DEFAULT_EQUIPMENT_OPTIONS,
  })
  return { ...sheet, items, grand_total: calcResult.grandTotal }
}
