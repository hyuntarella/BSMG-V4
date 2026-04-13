'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { Estimate, PriceMatrixRaw } from '@/lib/estimate/types'
import { useEstimate } from '@/hooks/useEstimate'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useCostChips } from '@/hooks/useCostChips'
import { useAcdbSuggest } from '@/hooks/useAcdbSuggest'
import { useWarrantyDefaults } from '@/hooks/useWarrantyDefaults'
import { deriveYearsBond, DEFAULT_WARRANTY_OPTION_BY_METHOD } from '@/lib/estimate/warrantyOptions'
import { getAR } from '@/lib/estimate/areaRange'
import CostChipsPanel from './CostChipsPanel'
import EstimateTableWrapper from './EstimateTableWrapper'
import SaveButton from './SaveButton'
import LoadButton from './LoadButton'
import CustomerInfoCard from './CustomerInfoCard'
import BasePriceBar from './BasePriceBar'
import WarrantySelect from './WarrantySelect'
import UrethaneBase05Control from './UrethaneBase05Control'
import CompareSidebar from './CompareSidebar'
import SidePanel from './SidePanel'

type TabId = 'composite' | 'urethane'

interface EstimateEditorFormProps {
  initialEstimate: Estimate
  priceMatrix: PriceMatrixRaw
  isLens?: boolean
}

export default function EstimateEditorForm({
  initialEstimate,
  priceMatrix,
  isLens = false,
}: EstimateEditorFormProps) {
  const {
    estimate,
    setEstimate,
    isDirty,
    markClean,
    updateMeta,
    updateSheetPpp,
    updateSheetWarranty,
    addSheet,
    undo,
    redo,
    saveSnapshot,
    snapshots,
    redoSnapshots,
  } = useEstimate(initialEstimate, priceMatrix)

  useAutoSave({ estimate, isDirty, onSaved: markClean, onEstimateSync: setEstimate, enabled: !!estimate.id })

  // --- 전역 Ctrl+Z (undo) / Ctrl+Shift+Z, Ctrl+Y (redo) ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        undo()
      } else if (
        (e.ctrlKey && e.shiftKey && (e.key === 'z' || e.key === 'Z')) ||
        (e.ctrlKey && (e.key === 'y' || e.key === 'Y'))
      ) {
        e.preventDefault()
        e.stopPropagation()
        redo()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [undo, redo])

  const [activeTab, setActiveTab] = useState<TabId>('composite')

  // --- 시트 없으면 자동 생성 ---
  useEffect(() => {
    const hasComposite = estimate.sheets.some(s => s.type === '복합')
    const hasUrethane = estimate.sheets.some(s => s.type === '우레탄')
    if (!hasComposite) addSheet('복합')
    if (!hasUrethane) addSheet('우레탄')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // --- 규칙서 보증 기본값 ---
  const { defaults: warrantyDefaults, loaded: warrantyLoaded } = useWarrantyDefaults()
  useEffect(() => {
    if (!warrantyLoaded) return
    setEstimate(prev => {
      let touched = false
      const sheets = prev.sheets.map(s => {
        if (s.id) return s
        const hardcoded = DEFAULT_WARRANTY_OPTION_BY_METHOD[s.type]
        if (s.warranty_option !== hardcoded) return s
        const target = warrantyDefaults[s.type]
        if (target === s.warranty_option) return s
        touched = true
        const { years, bond } = deriveYearsBond(target)
        return { ...s, warranty_option: target, warranty_years: years, warranty_bond: bond }
      })
      return touched ? { ...prev, sheets } : prev
    })
  }, [warrantyLoaded, warrantyDefaults, setEstimate])

  // --- 칩 핸들러 ---
  const estimateRef = useRef(estimate)
  estimateRef.current = estimate

  const handleCompositePriceChange = useCallback((price: number) => {
    const idx = estimateRef.current.sheets.findIndex(s => s.type === '복합')
    if (idx < 0) return
    if (estimateRef.current.sheets[idx].price_per_pyeong === price) return
    updateSheetPpp(idx, price, true)
  }, [updateSheetPpp])

  const handleUrethanePriceChange = useCallback((price: number) => {
    const idx = estimateRef.current.sheets.findIndex(s => s.type === '우레탄')
    if (idx < 0) return
    if (estimateRef.current.sheets[idx].price_per_pyeong === price) return
    updateSheetPpp(idx, price, true)
  }, [updateSheetPpp])

  const compositeChips = useCostChips({
    areaM2: estimate.m2 || 100,
    method: '복합',
    priceMatrix,
    onPriceChange: handleCompositePriceChange,
  })
  const urethaneChips = useCostChips({
    areaM2: estimate.m2 || 100,
    method: '우레탄',
    priceMatrix,
    onPriceChange: handleUrethanePriceChange,
  })

  const acdbSuggest = useAcdbSuggest({ companyId: estimate.company_id ?? null })

  const compositeIdx = estimate.sheets.findIndex(s => s.type === '복합')
  const urethaneIdx = estimate.sheets.findIndex(s => s.type === '우레탄')

  const handleAreaChange = useCallback((m2: number) => {
    updateMeta('m2', m2)
  }, [updateMeta])

  const handleEstimateChange = useCallback((updated: Estimate) => {
    setEstimate(updated)
  }, [setEstimate])

  const handleLensBack = useCallback(() => {
    window.close()
  }, [])

  // 현재 시트
  const activeSheetIdx = activeTab === 'composite' ? compositeIdx : urethaneIdx
  const activeSheet = activeSheetIdx >= 0 ? estimate.sheets[activeSheetIdx] : null
  const activeChips = activeTab === 'composite' ? compositeChips : urethaneChips

  // 면적대 배지
  const areaLabel = getAR(estimate.m2 || 100)
  const isSmall = areaLabel === '20평이하'

  // 외곽 프레임: body에 estimate-edit-body 클래스 부착
  useEffect(() => {
    document.body.classList.add('estimate-edit-body')
    return () => { document.body.classList.remove('estimate-edit-body') }
  }, [])

  const tabClass = (tab: TabId) =>
    `px-5 py-3 cursor-pointer font-semibold text-[13px] border-b-2 tracking-tight transition-colors ${
      activeTab === tab
        ? 'text-v-accent border-v-accent border-b-[3px]'
        : 'text-v-mut border-transparent hover:text-v-hdr'
    }`

  return (
    <div className="flex h-[calc(100vh-40px)] max-h-[960px] w-[1480px] max-w-full flex-row overflow-hidden rounded-[14px] bg-[#F2F2F7] shadow-v-frame relative">

      {/* ===== 좌측 갑지·검수 사이드바 (상시 노출, 읽기 전용) ===== */}
      <CompareSidebar
        estimate={estimate}
        compositeSheet={compositeIdx >= 0 ? estimate.sheets[compositeIdx] : undefined}
        urethaneSheet={urethaneIdx >= 0 ? estimate.sheets[urethaneIdx] : undefined}
      />

      {/* ===== 우측 편집 영역 ===== */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

      {/* ===== TOP BAR ===== */}
      <div className="flex h-11 shrink-0 items-center border-b border-v-b2 bg-white px-3 gap-[3px]">
        {isLens && (
          <button
            onClick={handleLensBack}
            className="mr-2 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
          >
            lens
          </button>
        )}
        <button className={tabClass('composite')} onClick={() => setActiveTab('composite')}>
          복합 을지
        </button>
        <button className={tabClass('urethane')} onClick={() => setActiveTab('urethane')}>
          우레탄 을지
        </button>
        <div className="flex-1" />
        <LoadButton onLoad={setEstimate} />
        <button
          className="rounded border border-v-b bg-transparent px-3 py-1 text-xs font-medium text-v-hdr hover:bg-v-hov disabled:opacity-40"
          onClick={undo}
          disabled={snapshots.length === 0}
          title="Undo Ctrl+Z"
        >
          ↶ 되돌리기
        </button>
        <button
          className="rounded border border-v-b bg-transparent px-3 py-1 text-xs font-medium text-v-hdr hover:bg-v-hov disabled:opacity-40"
          onClick={redo}
          disabled={redoSnapshots.length === 0}
          title="Redo Ctrl+Shift+Z"
        >
          ↷ 다시하기
        </button>
      </div>

      {/* ===== META BAR ===== */}
      <div className="shrink-0 bg-white shadow-v-sm">
        <CustomerInfoCard
          estimate={estimate}
          onMetaChange={updateMeta}
          onAreaChange={handleAreaChange}
          isLens={isLens}
        />
      </div>

      {/* ===== PRICE BAR ===== */}
      {activeSheet && (
        <div className="flex shrink-0 items-center gap-[10px] border-t border-v-b2 bg-white px-3 py-[7px] flex-nowrap overflow-x-auto">
          {/* 면적 입력 + 배지 */}
          <div className="flex items-end gap-2 pr-2">
            <div className="flex flex-col gap-[2px]">
              <label className="text-[10px] font-semibold text-v-mut tracking-wider">면적 m²</label>
              <input
                type="number"
                value={estimate.m2 || ''}
                onChange={(e) => handleAreaChange(Number(e.target.value) || 0)}
                className="w-[72px] rounded-md border border-v-b bg-v-hov px-[7px] py-[5px] text-right text-xs tabular-nums h-[30px] focus:outline-none focus:bg-white focus:border-v-accent focus:ring-[3px] focus:ring-[rgba(0,122,255,.15)]"
              />
            </div>
            <div className="flex flex-col gap-[2px]">
              <label className="text-[10px] font-semibold text-v-mut tracking-wider">벽체 m²</label>
              <input
                type="number"
                value={estimate.wall_m2 || ''}
                onChange={(e) => updateMeta('wall_m2', Number(e.target.value) || 0)}
                className="w-[72px] rounded-md border border-v-b bg-v-hov px-[7px] py-[5px] text-right text-xs tabular-nums h-[30px] focus:outline-none focus:bg-white focus:border-v-accent focus:ring-[3px] focus:ring-[rgba(0,122,255,.15)]"
              />
            </div>
            <span className="inline-flex items-center shrink-0 whitespace-nowrap rounded-2xl bg-v-accent-bg px-2 h-5 text-[10px] font-bold text-v-accent leading-none">
              {areaLabel}
            </span>
            {isSmall && (
              <span className="inline-flex items-center shrink-0 whitespace-nowrap rounded-2xl bg-[#fff4e6] px-2 h-5 text-[10px] font-bold text-[#d48806] leading-none">
                20평이하
              </span>
            )}
          </div>

          {/* 구분선 */}
          <div className="h-9 w-px bg-v-b self-center" />

          {/* 칩 */}
          <div className="flex items-center gap-1 max-w-[720px] flex-wrap">
            <CostChipsPanel
              compositeChips={activeTab === 'composite' ? activeChips : compositeChips}
              urethaneChips={activeTab === 'urethane' ? activeChips : urethaneChips}
              inlineMode={activeTab}
            />
          </div>

          {/* 0.5mm 토글 */}
          <UrethaneBase05Control
            estimate={estimate}
            onChange={handleEstimateChange}
            onSaveSnapshot={saveSnapshot}
          />

          <div className="flex-1" />

          {/* 평단가 */}
          <div className="flex flex-col gap-[1px] px-[10px] py-[2px]">
            <span className="text-[10px] font-semibold text-v-mut tracking-wider">선택 평단가</span>
            <span className="text-lg font-bold tabular-nums text-v-hdr leading-tight tracking-tight">
              {activeSheet.price_per_pyeong.toLocaleString()}
            </span>
          </div>
          <BasePriceBar sheet={activeSheet} m2={estimate.m2} />
        </div>
      )}

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 overflow-auto bg-[#F2F2F7] pb-[76px]">
        <div className="flex gap-2 p-[10px_12px]">
          {/* 테이블 */}
          <div className="min-w-0 flex-1">
            {activeSheetIdx >= 0 ? (
              <>
                <div className="overflow-hidden rounded-[10px] bg-white shadow-v-sm">
                  <EstimateTableWrapper
                    estimate={estimate}
                    sheetIndex={activeSheetIdx}
                    onChange={handleEstimateChange}
                    acdbSuggest={acdbSuggest}
                    onUndo={undo}
                    onSaveSnapshot={saveSnapshot}
                  />
                </div>

                {/* 특기사항 */}
                <div className="mt-2 rounded-[10px] bg-white p-[10px_14px] shadow-v-sm">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-[10px] font-bold text-v-mut tracking-wider">특기사항</h4>
                    <div className="flex items-center gap-[6px]">
                      <WarrantySelect
                        sheet={activeSheet!}
                        onChange={(opt) => updateSheetWarranty(activeSheetIdx, opt)}
                      />
                    </div>
                  </div>
                  <div className="text-[10px] text-v-mut mt-1">* 부가가치세별도</div>
                </div>
              </>
            ) : (
              <EmptySheetGuide
                type={activeTab === 'composite' ? '복합' : '우레탄'}
                onAdd={() => addSheet(activeTab === 'composite' ? '복합' : '우레탄')}
              />
            )}
          </div>

          {/* 장비/보수 사이드 패널 (우측) */}
          <div className="w-[148px] shrink-0">
            <SidePanel
              estimate={estimate}
              onChange={handleEstimateChange}
              onSaveSnapshot={saveSnapshot}
            />
          </div>
        </div>
      </div>

      </div>

      {/* ===== FAB ===== */}
      <div className="absolute right-[18px] bottom-[18px] z-30 flex gap-[10px]">
        {estimate.id && (
          <SaveButton
            estimateId={estimate.id}
            estimate={estimate}
            onSaved={markClean}
            fabStyle
          />
        )}
      </div>
    </div>
  )
}

// --- 빈 시트 안내 ---
function EmptySheetGuide({ type, onAdd }: { type: '복합' | '우레탄'; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="text-sm text-gray-500">{type}방수 시트가 없습니다</p>
      <button
        onClick={onAdd}
        className="rounded bg-[#007AFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0062CC]"
      >
        {type} 시트 추가
      </button>
    </div>
  )
}
