'use client'

import { useState, useCallback, useEffect } from 'react'
import type { Estimate, PriceMatrixRaw } from '@/lib/estimate/types'
import { useEstimate } from '@/hooks/useEstimate'
import { useCostChips } from '@/hooks/useCostChips'
import { useAcdbSuggest } from '@/hooks/useAcdbSuggest'
import CostChipsPanel from './CostChipsPanel'
import EstimateTableWrapper from './EstimateTableWrapper'
import SaveButton from './SaveButton'
import LoadButton from './LoadButton'
import CustomerInfoCard from './CustomerInfoCard'

type TabId = 'composite' | 'urethane' | 'compare'

interface EstimateEditorV5Props {
  initialEstimate: Estimate
  priceMatrix: PriceMatrixRaw
  isLens?: boolean
}

export default function EstimateEditorV5({
  initialEstimate,
  priceMatrix,
  isLens = false,
}: EstimateEditorV5Props) {
  const {
    estimate,
    setEstimate,
    isDirty,
    markClean,
    updateMeta,
    updateSheetPpp,
    addSheet,
  } = useEstimate(initialEstimate, priceMatrix)

  const [activeTab, setActiveTab] = useState<TabId>('composite')

  // --- 시트 없으면 자동 생성 ---
  useEffect(() => {
    const hasComposite = estimate.sheets.some(s => s.type === '복합')
    const hasUrethane = estimate.sheets.some(s => s.type === '우레탄')
    if (!hasComposite && !hasUrethane && estimate.m2 > 0) {
      addSheet('복합')
      addSheet('우레탄')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // --- 칩 상태 ---
  const compositeChips = useCostChips({ areaM2: estimate.m2 || 100, method: '복합' })
  const urethaneChips = useCostChips({ areaM2: estimate.m2 || 100, method: '우레탄' })

  // --- 칩 선택 → 시트 평단가 갱신 ---
  useEffect(() => {
    const price = compositeChips.effectivePrice
    if (price === null) return
    const idx = estimate.sheets.findIndex(s => s.type === '복합')
    if (idx < 0) return
    if (estimate.sheets[idx].price_per_pyeong === price) return
    updateSheetPpp(idx, price, true)
  }, [compositeChips.effectivePrice]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const price = urethaneChips.effectivePrice
    if (price === null) return
    const idx = estimate.sheets.findIndex(s => s.type === '우레탄')
    if (idx < 0) return
    if (estimate.sheets[idx].price_per_pyeong === price) return
    updateSheetPpp(idx, price, true)
  }, [urethaneChips.effectivePrice]) // eslint-disable-line react-hooks/exhaustive-deps

  // --- acdb ---
  const acdbSuggest = useAcdbSuggest({ companyId: estimate.company_id ?? null })

  // --- 시트 인덱스 ---
  const compositeIdx = estimate.sheets.findIndex(s => s.type === '복합')
  const urethaneIdx = estimate.sheets.findIndex(s => s.type === '우레탄')

  // --- 면적 변경 핸들러 ---
  const handleAreaChange = useCallback((m2: number) => {
    updateMeta('m2', m2)
  }, [updateMeta])

  // --- estimate onChange (EstimateTableWrapper 용) ---
  const handleEstimateChange = useCallback((updated: Estimate) => {
    setEstimate(updated)
  }, [setEstimate])

  // --- lens 돌아가기 ---
  const handleLensBack = useCallback(() => {
    window.close()
  }, [])

  const tabClass = (tab: TabId) =>
    `px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
      activeTab === tab
        ? 'border-blue-600 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* 상단 바 */}
      <div className="sticky top-[49px] z-30 border-b bg-white px-4 py-2.5 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            {isLens && (
              <button
                onClick={handleLensBack}
                className="flex items-center gap-1 rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                lens
              </button>
            )}
            <span className="text-sm font-bold text-gray-900">방수명가 견적서</span>
            {estimate.mgmt_no && (
              <span className="text-xs text-gray-500">{estimate.mgmt_no}</span>
            )}
            {isDirty && <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" title="변경됨" />}
          </div>
          <div className="flex items-center gap-2">
            <LoadButton onLoad={setEstimate} />
            {estimate.id && (
              <SaveButton
                estimateId={estimate.id}
                estimate={estimate}
                onSaved={markClean}
              />
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pt-4 space-y-4">
        {/* 기본정보 카드 */}
        <CustomerInfoCard
          estimate={estimate}
          onMetaChange={updateMeta}
          onAreaChange={handleAreaChange}
          isLens={isLens}
        />

        {/* 칩 UI */}
        <div className="rounded-lg border bg-white p-4">
          <CostChipsPanel
            compositeChips={compositeChips}
            urethaneChips={urethaneChips}
          />
        </div>

        {/* 탭 */}
        <div className="flex border-b bg-white">
          <button className={tabClass('composite')} onClick={() => setActiveTab('composite')}>
            복합
          </button>
          <button className={tabClass('urethane')} onClick={() => setActiveTab('urethane')}>
            우레탄
          </button>
          <button className={tabClass('compare')} onClick={() => setActiveTab('compare')}>
            비교
          </button>
        </div>

        {/* 테이블 영역 */}
        <div className="rounded-lg border bg-white p-4">
          {activeTab === 'composite' && compositeIdx >= 0 && (
            <EstimateTableWrapper
              estimate={estimate}
              sheetIndex={compositeIdx}
              onChange={handleEstimateChange}
              acdbSuggest={acdbSuggest}
            />
          )}

          {activeTab === 'urethane' && urethaneIdx >= 0 && (
            <EstimateTableWrapper
              estimate={estimate}
              sheetIndex={urethaneIdx}
              onChange={handleEstimateChange}
              acdbSuggest={acdbSuggest}
            />
          )}

          {activeTab === 'compare' && (
            <div className="space-y-6">
              <h3 className="text-sm font-semibold text-gray-700">복합 vs 우레탄 비교</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* 복합 요약 */}
                <div className="rounded border p-3">
                  <p className="mb-2 text-sm font-semibold text-blue-700">복합방수</p>
                  {compositeIdx >= 0 ? (
                    <CompareCard sheet={estimate.sheets[compositeIdx]} m2={estimate.m2} />
                  ) : (
                    <p className="text-sm text-gray-400">시트 없음</p>
                  )}
                </div>
                {/* 우레탄 요약 */}
                <div className="rounded border p-3">
                  <p className="mb-2 text-sm font-semibold text-purple-700">우레탄방수</p>
                  {urethaneIdx >= 0 ? (
                    <CompareCard sheet={estimate.sheets[urethaneIdx]} m2={estimate.m2} />
                  ) : (
                    <p className="text-sm text-gray-400">시트 없음</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 시트 없음 안내 */}
          {activeTab === 'composite' && compositeIdx < 0 && (
            <EmptySheetGuide type="복합" onAdd={() => addSheet('복합')} />
          )}
          {activeTab === 'urethane' && urethaneIdx < 0 && (
            <EmptySheetGuide type="우레탄" onAdd={() => addSheet('우레탄')} />
          )}
        </div>
      </div>
    </div>
  )
}

// --- 비교 카드 ---
function CompareCard({ sheet, m2 }: { sheet: { price_per_pyeong: number; grand_total: number; items: { name: string; total: number; is_hidden?: boolean }[] }; m2: number }) {
  const visibleItems = sheet.items.filter(i => !i.is_hidden)
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-500">평단가</span>
        <span className="font-medium">{sheet.price_per_pyeong.toLocaleString()}원/m2</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">공종 수</span>
        <span className="font-medium">{visibleItems.length}개</span>
      </div>
      <div className="flex justify-between border-t pt-2">
        <span className="font-semibold text-gray-700">합계</span>
        <span className="font-bold text-gray-900">{sheet.grand_total.toLocaleString()}원</span>
      </div>
      {m2 > 0 && (
        <div className="flex justify-between text-xs text-gray-400">
          <span>m2당</span>
          <span>{Math.round(sheet.grand_total / m2).toLocaleString()}원</span>
        </div>
      )}
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
        className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        {type} 시트 추가
      </button>
    </div>
  )
}
