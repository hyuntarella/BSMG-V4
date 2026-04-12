'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Estimate } from '@/lib/estimate/types'

interface UseAutoSaveOptions {
  estimate: Estimate
  isDirty: boolean
  onSaved: () => void
  onConflict?: () => void
  /** 새 시트 insert 후 클라이언트 상태에 sheet.id 반영용 콜백 */
  onEstimateSync?: (updater: (prev: Estimate) => Estimate) => void
  debounceMs?: number
  enabled?: boolean
}

/**
 * 디바운스 1초 → Supabase upsert
 *
 * estimate 또는 isDirty가 변경될 때마다 타이머 리셋.
 * 1초간 변경 없으면 저장 실행.
 */
export function useAutoSave({
  estimate,
  isDirty,
  onSaved,
  onConflict,
  onEstimateSync,
  debounceMs = 1000,
  enabled = true,
}: UseAutoSaveOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingRef = useRef(false)
  /** 마지막으로 알고 있는 서버 updated_at — 낙관적 락용 */
  const lastUpdatedAtRef = useRef<string | null>(null)

  const save = useCallback(async () => {
    if (!estimate.id || savingRef.current) return
    savingRef.current = true

    try {
      const supabase = createClient()

      // ── 낙관적 락: 저장 전 서버 updated_at 확인 ──
      const { data: current } = await supabase
        .from('estimates')
        .select('updated_at')
        .eq('id', estimate.id)
        .single()

      if (current && lastUpdatedAtRef.current) {
        const serverTime = new Date(current.updated_at).getTime()
        const knownTime = new Date(lastUpdatedAtRef.current).getTime()
        if (serverTime > knownTime) {
          // 다른 세션에서 이미 수정됨 — 충돌
          console.warn('낙관적 락 충돌: 서버가 더 최신', { server: current.updated_at, known: lastUpdatedAtRef.current })
          onConflict?.()
          return
        }
      }

      const now = new Date().toISOString()

      // 1. estimates 메타 업데이트
      await supabase
        .from('estimates')
        .update({
          customer_name: estimate.customer_name,
          site_name: estimate.site_name,
          m2: estimate.m2,
          wall_m2: estimate.wall_m2,
          manager_name: estimate.manager_name,
          manager_phone: estimate.manager_phone,
          memo: estimate.memo,
          updated_at: now,
        })
        .eq('id', estimate.id)

      lastUpdatedAtRef.current = now

      // 새 시트 insert 후 반환된 ID를 모아서 클라이언트 상태에 반영
      const newSheetIds: { type: string; id: string }[] = []

      const itemFields = (sheetId: string, item: Estimate['sheets'][0]['items'][0]) => ({
        sheet_id: sheetId,
        sort_order: item.sort_order,
        name: item.name,
        spec: item.spec,
        unit: item.unit,
        qty: item.qty,
        mat: item.mat,
        labor: item.labor,
        exp: item.exp,
        mat_amount: item.mat_amount,
        labor_amount: item.labor_amount,
        exp_amount: item.exp_amount,
        total: item.total,
        is_base: item.is_base,
        is_equipment: item.is_equipment,
        is_fixed_qty: item.is_fixed_qty,
      })

      // 2. 각 시트 + 아이템 업데이트
      for (const sheet of estimate.sheets) {
        if (sheet.id) {
          // ── 기존 시트: update ──
          await supabase
            .from('estimate_sheets')
            .update({
              price_per_pyeong: sheet.price_per_pyeong,
              grand_total: sheet.grand_total,
            })
            .eq('id', sheet.id)

          // upsert by id: 기존 아이템 update, 새 아이템 insert, 삭제된 아이템 delete
          const { data: dbItems } = await supabase
            .from('estimate_items')
            .select('id')
            .eq('sheet_id', sheet.id)

          const dbIds = new Set((dbItems ?? []).map((r) => r.id))
          const clientIds = new Set(sheet.items.filter((i) => i.id).map((i) => i.id!))

          // 삭제: DB에는 있지만 클라이언트에 없는 아이템
          const toDelete = Array.from(dbIds).filter((id) => !clientIds.has(id))
          if (toDelete.length > 0) {
            await supabase.from('estimate_items').delete().in('id', toDelete)
          }

          // update: id가 있는 기존 아이템
          for (const item of sheet.items.filter((i) => i.id)) {
            await supabase
              .from('estimate_items')
              .update(itemFields(sheet.id, item))
              .eq('id', item.id!)
          }

          // insert: id가 없는 새 아이템
          const newItems = sheet.items.filter((i) => !i.id)
          if (newItems.length > 0) {
            await supabase.from('estimate_items').insert(
              newItems.map((item) => itemFields(sheet.id!, item))
            )
          }
        } else {
          // ── 새 시트: insert ──
          const { data: inserted } = await supabase
            .from('estimate_sheets')
            .insert({
              estimate_id: estimate.id,
              type: sheet.type,
              title: sheet.title,
              price_per_pyeong: sheet.price_per_pyeong,
              warranty_years: sheet.warranty_years,
              warranty_bond: sheet.warranty_bond,
              grand_total: sheet.grand_total,
              sort_order: sheet.sort_order,
            })
            .select('id')
            .single()

          if (inserted) {
            newSheetIds.push({ type: sheet.type, id: inserted.id })

            // 아이템 insert
            if (sheet.items.length > 0) {
              await supabase.from('estimate_items').insert(
                sheet.items.map((item) => itemFields(inserted.id, item))
              )
            }
          }
        }
      }

      // 새 시트 ID를 클라이언트 상태에 반영 → 다음 저장부터 update 경로
      if (newSheetIds.length > 0 && onEstimateSync) {
        onEstimateSync((prev) => ({
          ...prev,
          sheets: prev.sheets.map((s) => {
            const match = newSheetIds.find((n) => n.type === s.type && !s.id)
            return match ? { ...s, id: match.id } : s
          }),
        }))
      }

      onSaved()
    } catch (err) {
      console.error('자동 저장 실패:', err)
    } finally {
      savingRef.current = false
    }
  }, [estimate, onSaved, onConflict, onEstimateSync])

  useEffect(() => {
    if (!enabled || !isDirty || !estimate.id) return

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(save, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [estimate, isDirty, enabled, debounceMs, save])
}
