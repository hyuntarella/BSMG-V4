import type { EstimateItem, EstimateSheet } from '@/lib/estimate/types'
import { calc } from '@/lib/estimate/calc'

/**
 * LLM 응답의 command를 실제 estimate state에 적용
 */

export interface VoiceCommand {
  action: string
  target?: string
  field?: string
  value?: number
  delta?: number
  name?: string
  spec?: string
  unit?: string
  qty?: number
  category?: string
  percent?: number
  position?: number
  confidence: number
}

export interface CommandResult {
  success: boolean
  message: string
  updatedItems?: EstimateItem[]
}

/**
 * 단일 명령을 시트에 적용
 */
export function applyCommand(
  sheet: EstimateSheet,
  command: VoiceCommand,
): CommandResult {
  const items = [...sheet.items]

  switch (command.action) {
    case 'update_item':
      return updateItem(items, command)

    case 'add_item':
      return addItem(items, command)

    case 'remove_item':
      return removeItem(items, command)

    case 'bulk_adjust':
      return bulkAdjust(items, command)

    case 'set_grand_total':
      return setGrandTotal(items, command)

    case 'reorder_item':
      return reorderItem(items, command)

    default:
      return { success: false, message: `미지원 action: ${command.action}` }
  }
}

/**
 * 명령 배열을 순차 적용
 */
export function applyCommands(
  sheet: EstimateSheet,
  commands: VoiceCommand[],
): { sheet: EstimateSheet; results: CommandResult[] } {
  const results: CommandResult[] = []
  let currentItems = [...sheet.items]

  for (const cmd of commands) {
    const tempSheet = { ...sheet, items: currentItems }
    const result = applyCommand(tempSheet, cmd)
    results.push(result)
    if (result.success && result.updatedItems) {
      currentItems = result.updatedItems
    }
  }

  const calcResult = calc(currentItems)
  const updatedSheet: EstimateSheet = {
    ...sheet,
    items: currentItems,
    grand_total: calcResult.grandTotal,
  }

  return { sheet: updatedSheet, results }
}

// ── 개별 명령 구현 ──

function findItem(items: EstimateItem[], target: string): number {
  return items.findIndex(
    it => it.name === target || it.name.includes(target) || target.includes(it.name)
  )
}

function recalcItem(item: EstimateItem): EstimateItem {
  const mat_amount = Math.round(item.qty * item.mat)
  const labor_amount = Math.round(item.qty * item.labor)
  const exp_amount = Math.round(item.qty * item.exp)
  return {
    ...item,
    mat_amount,
    labor_amount,
    exp_amount,
    total: mat_amount + labor_amount + exp_amount,
  }
}

function updateItem(items: EstimateItem[], cmd: VoiceCommand): CommandResult {
  if (!cmd.target || !cmd.field) {
    return { success: false, message: '항목명과 필드가 필요합니다' }
  }

  const idx = findItem(items, cmd.target)
  if (idx === -1) {
    return { success: false, message: `"${cmd.target}" 항목을 찾을 수 없습니다` }
  }

  const item = { ...items[idx] }
  const field = cmd.field as keyof Pick<EstimateItem, 'mat' | 'labor' | 'exp' | 'qty'>

  if (!(field in item)) {
    return { success: false, message: `"${cmd.field}" 필드가 없습니다` }
  }

  if (cmd.delta !== undefined) {
    ;(item[field] as number) += cmd.delta
  } else if (cmd.value !== undefined) {
    ;(item[field] as number) = cmd.value
  }

  items[idx] = recalcItem(item)
  return { success: true, message: `${cmd.target} ${cmd.field} 수정`, updatedItems: items }
}

function addItem(items: EstimateItem[], cmd: VoiceCommand): CommandResult {
  if (!cmd.name) {
    return { success: false, message: '추가할 공종명이 필요합니다' }
  }

  const newItem = recalcItem({
    sort_order: items.length + 1,
    name: cmd.name,
    spec: cmd.spec ?? '',
    unit: cmd.unit ?? 'm²',
    qty: cmd.qty ?? 0,
    mat: 0,
    labor: 0,
    exp: 0,
    mat_amount: 0,
    labor_amount: 0,
    exp_amount: 0,
    total: 0,
    is_base: false,
    is_equipment: false,
    is_fixed_qty: false,
  })

  items.push(newItem)
  return { success: true, message: `${cmd.name} 추가`, updatedItems: items }
}

function removeItem(items: EstimateItem[], cmd: VoiceCommand): CommandResult {
  if (!cmd.target) {
    return { success: false, message: '삭제할 항목명이 필요합니다' }
  }

  const idx = findItem(items, cmd.target)
  if (idx === -1) {
    return { success: false, message: `"${cmd.target}" 항목을 찾을 수 없습니다` }
  }

  const removed = items.splice(idx, 1)[0]
  // sort_order 재정렬
  items.forEach((it, i) => { it.sort_order = i + 1 })
  return { success: true, message: `${removed.name} 삭제`, updatedItems: items }
}

function bulkAdjust(items: EstimateItem[], cmd: VoiceCommand): CommandResult {
  const percent = cmd.percent ?? 0
  const category = cmd.category ?? 'all'
  const multiplier = 1 + percent / 100

  const updated = items.map(item => {
    const copy = { ...item }
    if (category === 'mat' || category === 'all') {
      copy.mat = Math.round(copy.mat * multiplier)
    }
    if (category === 'labor' || category === 'all') {
      copy.labor = Math.round(copy.labor * multiplier)
    }
    if (category === 'exp' || category === 'all') {
      copy.exp = Math.round(copy.exp * multiplier)
    }
    return recalcItem(copy)
  })

  return {
    success: true,
    message: `${category} ${percent > 0 ? '+' : ''}${percent}% 조정`,
    updatedItems: updated,
  }
}

function setGrandTotal(items: EstimateItem[], cmd: VoiceCommand): CommandResult {
  if (!cmd.value) {
    return { success: false, message: '목표 총액이 필요합니다' }
  }

  const current = calc(items)
  if (current.grandTotal === 0) {
    return { success: false, message: '현재 총액이 0입니다' }
  }

  const ratio = cmd.value / current.grandTotal
  const adjusted = items.map(item => {
    const copy = { ...item }
    copy.mat = Math.round(copy.mat * ratio)
    copy.labor = Math.round(copy.labor * ratio)
    copy.exp = Math.round(copy.exp * ratio)
    return recalcItem(copy)
  })

  return {
    success: true,
    message: `총액 ${cmd.value.toLocaleString()}원으로 조정`,
    updatedItems: adjusted,
  }
}

function reorderItem(items: EstimateItem[], cmd: VoiceCommand): CommandResult {
  if (!cmd.target || cmd.position === undefined) {
    return { success: false, message: '항목명과 위치가 필요합니다' }
  }

  const idx = findItem(items, cmd.target)
  if (idx === -1) {
    return { success: false, message: `"${cmd.target}" 항목을 찾을 수 없습니다` }
  }

  const [item] = items.splice(idx, 1)
  const newIdx = Math.max(0, Math.min(items.length, cmd.position - 1))
  items.splice(newIdx, 0, item)
  items.forEach((it, i) => { it.sort_order = i + 1 })

  return { success: true, message: `${cmd.target}을 ${cmd.position}번째로 이동`, updatedItems: items }
}
