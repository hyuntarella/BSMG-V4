'use client'

import { useState } from 'react'
import type { EstimateSheet, EstimateItem, CalcResult } from '@/lib/estimate/types'
import { calc } from '@/lib/estimate/calc'
import { fm } from '@/lib/utils/format'
import { getMarginDisplay, pricePerM2ToPyeong } from '@/lib/estimate/costBreakdown'
import type { ModifiedCells } from '@/hooks/useEstimate'
import InlineCell from './InlineCell'
import MarginGauge from './MarginGauge'
import AddItemModal from './AddItemModal'

/** 실시간 음성 감지 하이라이트 (Web Speech API interim) */
export interface RealtimeHighlight {
  /** 감지된 공종명 (행 노란 하이라이트) */
  itemName?: string
  /** 감지된 필드 (셀 포커스 테두리) */
  field?: string
  /** 미리보기 값 (연한 색 텍스트) */
  previewValue?: number
}

interface WorkSheetProps {
  sheet: EstimateSheet
  m2: number
  wallM2?: number
  margin: number
  modifiedCells?: ModifiedCells
  /** 셀 하이라이트 레벨 (0=없음, 1=직전, 2=2턴전, 3=3턴전) */
  getCellHighlightLevel?: (cellKey: string) => number
  /** 현재 시트 인덱스 (하이라이트 키 생성용) */
  sheetIndex?: number
  /** 실시간 음성 감지 하이라이트 (Web Speech API interim) */
  realtimeHighlight?: RealtimeHighlight
  onItemChange: (itemIndex: number, field: string, value: number) => void
  onItemTextChange?: (itemIndex: number, field: 'name' | 'spec' | 'unit', value: string) => void
  onSheetChange: (field: string, value: number) => void
  onPppChange?: (ppp: number, rebuild: boolean) => void
  onMetaChange?: (field: 'm2' | 'wall_m2', value: number) => void
  onAddItem?: (item: Partial<EstimateItem>) => void
  onRemoveItem?: (itemIndex: number) => void
  onMoveItem?: (fromIndex: number, toIndex: number) => void
}

export default function WorkSheet({
  sheet,
  m2,
  wallM2,
  margin,
  modifiedCells,
  getCellHighlightLevel,
  sheetIndex = 0,
  realtimeHighlight,
  onItemChange,
  onItemTextChange,
  onSheetChange,
  onPppChange,
  onMetaChange,
  onAddItem,
  onRemoveItem,
  onMoveItem,
}: WorkSheetProps) {
  const [addModalOpen, setAddModalOpen] = useState(false)
  const calcResult: CalcResult = calc(sheet.items)
  const pyeong = m2 / 3.306

  // 마진 표시 (인상 전 포함)
  const marginDisplay = getMarginDisplay(sheet.price_per_pyeong, pyeong)

  // 외부 평단가 = 총액 ÷ 평수
  const externalPpp = pyeong > 0
    ? Math.round(calcResult.grandTotal / pyeong)
    : 0

  return (
    <div className="mx-auto max-w-[1100px] bg-white p-4 text-[12px]">
      {/* 상단: 공사명 + 로고 */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-base font-extrabold text-gray-900">
          방수명가<span className="ml-0.5 text-[10px] text-brand">防水</span>
        </div>
      </div>

      {/* 공사명 */}
      <div className="mb-3 flex items-center gap-2 border-b border-gray-900 pb-2">
        <span className="bg-gray-900 px-2 py-1 text-xs font-semibold text-white">공 사 명</span>
        <span className="text-sm">
          {sheet.title ?? (sheet.type === '복합' ? '복합방수' : '우레탄방수')}
        </span>
      </div>

      {/* 상단 정보 바 */}
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-gray-500">면적</span>{' '}
          <InlineCell
            value={m2}
            onSave={(v) => onMetaChange?.('m2', v as number)}
            className="inline-block w-16 text-right font-semibold"
            readOnly={!onMetaChange}
          />
          <span className="text-gray-400">m²</span>
          <span className="ml-1 text-gray-400">({pyeong.toFixed(1)}평)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500">벽체</span>{' '}
          <InlineCell
            value={wallM2 ?? 0}
            onSave={(v) => onMetaChange?.('wall_m2', v as number)}
            className="inline-block w-14 text-right"
            readOnly={!onMetaChange}
          />
          <span className="text-gray-400">m²</span>
        </div>
        <div>
          <span className="text-gray-500">내부단가</span>{' '}
          <InlineCell
            value={sheet.price_per_pyeong}
            onSave={(v) => {
              if (onPppChange) {
                const rebuild = window.confirm(
                  '공종을 재생성하시겠습니까?\n\n확인: 새 평단가로 공종 재생성 (수동 수정 초기화)\n취소: 평단가만 변경 (기존 공종 유지)'
                )
                onPppChange(v as number, rebuild)
              } else {
                onSheetChange('price_per_pyeong', v as number)
              }
            }}
            className="inline-block w-16 text-right"
          />
          <span className="text-gray-400">원/㎡</span>
        </div>
        <div>
          <span className="text-gray-500">고객 평단가</span>{' '}
          <span className="font-bold text-brand">{fm(externalPpp)}</span>
          <span className="text-gray-400">원/평</span>
        </div>
        <div className="flex items-center gap-1">
          <MarginGauge margin={margin} />
          <span className="text-[10px] text-gray-400">{marginDisplay.formatted}</span>
        </div>
      </div>

      {/* 공종 테이블 — Figma 가로형 */}
      <div className="overflow-x-auto rounded border border-gray-800">
        <table className="w-full text-[11px]">
          <thead>
            {/* 대분류 헤더 */}
            <tr className="bg-gray-900 text-white">
              <th rowSpan={2} className="border-r border-gray-600 px-2 py-1.5 text-center w-8">#</th>
              <th rowSpan={2} className="border-r border-gray-600 px-2 py-1.5 text-left min-w-[100px]">품 명</th>
              <th rowSpan={2} className="border-r border-gray-600 px-2 py-1.5 text-left min-w-[80px]">규 격</th>
              <th rowSpan={2} className="border-r border-gray-600 px-2 py-1.5 text-center w-10">단위</th>
              <th rowSpan={2} className="border-r border-gray-600 px-2 py-1.5 text-right w-14">수 량</th>
              <th colSpan={2} className="border-r border-gray-600 px-2 py-1 text-center">재료비</th>
              <th colSpan={2} className="border-r border-gray-600 px-2 py-1 text-center">노무비</th>
              <th colSpan={2} className="border-r border-gray-600 px-2 py-1 text-center">경비</th>
              <th rowSpan={2} className="border-r border-gray-600 px-2 py-1.5 text-right w-20">금 액</th>
              <th rowSpan={2} className="px-2 py-1.5 text-center w-14">비 고</th>
            </tr>
            {/* 소분류 헤더 */}
            <tr className="bg-gray-900 text-white text-[10px]">
              <th className="border-r border-gray-600 px-1 py-1 text-right w-14">단 가</th>
              <th className="border-r border-gray-600 px-1 py-1 text-right w-18">금 액</th>
              <th className="border-r border-gray-600 px-1 py-1 text-right w-14">단 가</th>
              <th className="border-r border-gray-600 px-1 py-1 text-right w-18">금 액</th>
              <th className="border-r border-gray-600 px-1 py-1 text-right w-14">단 가</th>
              <th className="border-r border-gray-600 px-1 py-1 text-right w-18">금 액</th>
            </tr>
          </thead>
          <tbody>
            {sheet.items.map((item, idx) => {
              const hasChange = modifiedCells && Array.from(modifiedCells.keys()).some(k => k.includes(`:${idx}:`))
              // 셀별 하이라이트 레벨 계산
              const getHl = (field: string) => {
                if (!getCellHighlightLevel) return 0
                return getCellHighlightLevel(`voice:${sheetIndex}:${item.name}:${field}`)
              }
              const hlClass = (field: string) => {
                const level = getHl(field)
                if (level === 1) return 'bg-accent-200/60'
                if (level === 2) return 'bg-accent-100/50'
                if (level === 3) return 'bg-accent-50/40'
                return ''
              }
              // 실시간 하이라이트 (Web Speech API interim)
              const isRealtimeRow = realtimeHighlight?.itemName === item.name
              const isRealtimeCell = (field: string) =>
                isRealtimeRow && realtimeHighlight?.field === field
              const realtimePreview = (field: string) =>
                isRealtimeCell(field) ? realtimeHighlight?.previewValue : undefined
              return (
              <tr
                key={idx}
                className={`border-b border-gray-200 hover:bg-blue-50/50 ${
                  item.is_equipment ? 'bg-amber-50/50' : ''
                } ${hasChange ? 'bg-yellow-50' : ''} ${isRealtimeRow ? 'bg-yellow-100/60' : ''}`}
              >
                <td className="px-2 py-1 text-center text-gray-400">{item.sort_order}</td>
                <td className="px-2 py-1 font-medium">
                  <InlineCell
                    value={item.name}
                    type="text"
                    formatted={false}
                    onSave={(v) => onItemTextChange?.(idx, 'name', v as string)}
                    readOnly={!onItemTextChange}
                    className="text-left font-medium"
                  />
                </td>
                <td className="px-2 py-1 text-gray-500">
                  <InlineCell
                    value={item.spec}
                    type="text"
                    formatted={false}
                    onSave={(v) => onItemTextChange?.(idx, 'spec', v as string)}
                    readOnly={!onItemTextChange}
                    className="text-left text-gray-500"
                  />
                </td>
                <td className="px-2 py-1 text-center text-gray-500">
                  <InlineCell
                    value={item.unit}
                    type="text"
                    formatted={false}
                    onSave={(v) => onItemTextChange?.(idx, 'unit', v as string)}
                    readOnly={!onItemTextChange}
                    className="text-center text-gray-500"
                  />
                </td>
                <td className={`px-1 py-1 text-right transition-colors ${hlClass('qty')}`}>
                  <InlineCell value={item.qty} onSave={v => onItemChange(idx, 'qty', v as number)} />
                </td>
                {/* 재료비 단가/금액 */}
                <td className={`px-1 py-1 text-right transition-colors ${hlClass('mat')} ${isRealtimeCell('mat') ? 'ring-2 ring-dashed ring-accent/50' : ''}`}>
                  <InlineCell value={item.mat} onSave={v => onItemChange(idx, 'mat', v as number)} />
                  {realtimePreview('mat') !== undefined && (
                    <span className="ml-1 text-accent/50 text-[10px]">{fm(realtimePreview('mat')!)}</span>
                  )}
                </td>
                <td className={`px-1 py-1 text-right tabular-nums text-gray-600 transition-colors ${hlClass('mat')}`}>{fm(item.mat_amount)}</td>
                {/* 노무비 단가/금액 */}
                <td className={`px-1 py-1 text-right transition-colors ${hlClass('labor')} ${isRealtimeCell('labor') ? 'ring-2 ring-dashed ring-accent/50' : ''}`}>
                  <InlineCell value={item.labor} onSave={v => onItemChange(idx, 'labor', v as number)} />
                  {realtimePreview('labor') !== undefined && (
                    <span className="ml-1 text-accent/50 text-[10px]">{fm(realtimePreview('labor')!)}</span>
                  )}
                </td>
                <td className={`px-1 py-1 text-right tabular-nums text-gray-600 transition-colors ${hlClass('labor')}`}>{fm(item.labor_amount)}</td>
                {/* 경비 단가/금액 */}
                <td className={`px-1 py-1 text-right transition-colors ${hlClass('exp')} ${isRealtimeCell('exp') ? 'ring-2 ring-dashed ring-accent/50' : ''}`}>
                  <InlineCell value={item.exp} onSave={v => onItemChange(idx, 'exp', v as number)} />
                  {realtimePreview('exp') !== undefined && (
                    <span className="ml-1 text-accent/50 text-[10px]">{fm(realtimePreview('exp')!)}</span>
                  )}
                </td>
                <td className={`px-1 py-1 text-right tabular-nums text-gray-600 transition-colors ${hlClass('exp')}`}>{fm(item.exp_amount)}</td>
                {/* 합계 금액 */}
                <td className="px-1 py-1 text-right font-semibold tabular-nums">{fm(item.total)}</td>
                <td className="px-1 py-1 text-center">
                  <div className="flex items-center justify-center gap-0.5">
                    {onMoveItem && idx > 0 && (
                      <button
                        onClick={() => onMoveItem(idx, idx - 1)}
                        className="text-gray-300 hover:text-gray-600 text-[10px] cursor-pointer"
                        title="위로"
                      >↑</button>
                    )}
                    {onMoveItem && idx < sheet.items.length - 1 && (
                      <button
                        onClick={() => onMoveItem(idx, idx + 1)}
                        className="text-gray-300 hover:text-gray-600 text-[10px] cursor-pointer"
                        title="아래로"
                      >↓</button>
                    )}
                    {onRemoveItem && (
                      <button
                        onClick={() => {
                          if (window.confirm(`${item.name} 항목을 삭제하시겠습니까?`)) {
                            onRemoveItem(idx)
                          }
                        }}
                        className="text-gray-300 hover:text-red-500 text-xs cursor-pointer ml-0.5"
                        title="삭제"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>

        {/* 합계 영역 */}
        <div className="border-t-2 border-gray-900 bg-gray-50">
          <SumRow label="소 계" value={calcResult.subtotal} />
          <SumRow label="공과 잡비" value={calcResult.overhead} suffix="3%" />
          <SumRow label="기업 이윤" value={calcResult.profit} suffix="6%" />
          <SumRow label="계" value={calcResult.totalBeforeRound} />
          <div className="flex items-center justify-between border-t border-gray-900 px-3 py-2">
            <span className="text-sm font-bold">합 계</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">(단수정리)</span>
              <span className="text-base font-bold tabular-nums">{fm(calcResult.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 공종 추가 버튼 */}
      {onAddItem && (
        <button
          onClick={() => setAddModalOpen(true)}
          className="w-full rounded border border-dashed border-gray-300 py-2 text-xs text-gray-500 hover:bg-gray-50"
        >
          + 공종 추가
        </button>
      )}

      {/* 공종 추가 모달 */}
      <AddItemModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={(item) => {
          onAddItem?.(item)
          setAddModalOpen(false)
        }}
      />
    </div>
  )
}

function SumRow({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 px-3 py-1 text-xs">
      <span className="text-gray-600">
        {label}
        {suffix && <span className="ml-1 text-gray-400">({suffix})</span>}
      </span>
      <span className="tabular-nums">{fm(value)}</span>
    </div>
  )
}
