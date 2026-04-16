import type { DetailSheet, DetailItem } from './types'
import { ROUND_UNIT } from '@/lib/estimate/constants'

export interface DetailCalcResult {
  subtotal: {
    material: number
    labor: number
    expense: number
    total: number
  }
  overhead: number
  profit: number
  beforeRound: number
  grandTotal: number
}

export function calcDetailSheet(sheet: DetailSheet): DetailCalcResult {
  let material = 0
  let labor = 0
  let expense = 0

  for (const row of sheet.rows) {
    if (row.kind !== 'item') continue
    const item = row as DetailItem
    material += item.material?.amount ?? 0
    labor += item.labor?.amount ?? 0
    expense += item.expense?.amount ?? 0
  }

  const total = material + labor + expense
  const overhead = Math.round(total * sheet.overheadRate)
  const profit = Math.round(total * sheet.profitRate)
  const beforeRound = total + overhead + profit
  const grandTotal = Math.floor(beforeRound / ROUND_UNIT) * ROUND_UNIT

  return {
    subtotal: { material, labor, expense, total },
    overhead,
    profit,
    beforeRound,
    grandTotal,
  }
}
