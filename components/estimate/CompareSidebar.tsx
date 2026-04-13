'use client'

import type { Estimate, EstimateSheet, EstimateItem } from '@/lib/estimate/types'
import { calc } from '@/lib/estimate/calc'
import { toHangul } from '@/lib/estimate/toHangul'

const PASTEL_PALETTE = [
  { bg: '#FEE0E0', border: '#E53E3E' },
  { bg: '#FED7AA', border: '#DD6B20' },
  { bg: '#FEF3BF', border: '#D69E2E' },
  { bg: '#D4F1BA', border: '#38A169' },
  { bg: '#B8E6D5', border: '#319795' },
  { bg: '#BEE3F8', border: '#3182CE' },
  { bg: '#D6BCFA', border: '#805AD5' },
  { bg: '#FBCFE8', border: '#D53F8C' },
  { bg: '#E5DECB', border: '#8B7355' },
  { bg: '#D6D6E8', border: '#5A6878' },
]

interface CompareSidebarProps {
  estimate: Estimate
  compositeSheet?: EstimateSheet
  urethaneSheet?: EstimateSheet
}

const fmt = (n: number) => (n || 0).toLocaleString('ko-KR')

function getActualPpy(sheet: EstimateSheet): number {
  return sheet.items
    .filter(i => i.is_base && !i.is_hidden && i.unit !== '식' && i.name !== '벽체 우레탄')
    .reduce((s, i) => s + i.mat + i.labor + i.exp, 0)
}

function buildColorMap(compositeSheet?: EstimateSheet, urethaneSheet?: EstimateSheet) {
  const allNames: string[] = []
  const collect = (sheet?: EstimateSheet) => {
    if (!sheet) return
    sheet.items.filter(i => !i.is_base).forEach(i => {
      if (i.name && !allNames.includes(i.name)) allNames.push(i.name)
    })
  }
  collect(compositeSheet)
  collect(urethaneSheet)
  const map: Record<string, typeof PASTEL_PALETTE[0]> = {}
  allNames.forEach((name, i) => {
    map[name] = PASTEL_PALETTE[i % PASTEL_PALETTE.length]
  })
  return map
}

export default function CompareSidebar({
  compositeSheet,
  urethaneSheet,
}: CompareSidebarProps) {
  const cCalc = compositeSheet ? calc(compositeSheet.items.filter(i => !i.is_hidden)) : null
  const uCalc = urethaneSheet ? calc(urethaneSheet.items.filter(i => !i.is_hidden)) : null

  const colorMap = buildColorMap(compositeSheet, urethaneSheet)

  const cGrand = cCalc?.grandTotal ?? 0
  const uGrand = uCalc?.grandTotal ?? 0
  const diff = cGrand - uGrand
  const diffRate = uGrand ? ((diff / uGrand) * 100).toFixed(1) : '-'

  const cPpy = compositeSheet ? getActualPpy(compositeSheet) : 0
  const uPpy = urethaneSheet ? getActualPpy(urethaneSheet) : 0
  const cCount = compositeSheet?.items.filter(i => !i.is_hidden).length ?? 0
  const uCount = urethaneSheet?.items.filter(i => !i.is_hidden).length ?? 0

  const cBaseCount = compositeSheet?.items.filter(i => i.is_base && !i.is_hidden).length ?? 0
  const uBaseCount = urethaneSheet?.items.filter(i => i.is_base && !i.is_hidden).length ?? 0
  const maxBase = Math.max(cBaseCount, uBaseCount)

  return (
    <aside
      data-testid="compare-sidebar"
      className="w-[296px] shrink-0 h-full overflow-y-auto border-r border-v-b2 bg-[#F2F2F7] px-3 py-3"
    >
      {/* 타이틀 */}
      <div className="mb-2 text-center">
        <h2 className="text-[14px] font-extrabold tracking-[4px] text-v-hdr">갑 지 · 검 수</h2>
        <p className="mt-[1px] text-[9px] text-v-mut tracking-wider">복합 · 우레탄 비교</p>
      </div>

      {/* 금액 카드 2개 — 세로 스택 */}
      <div className="mb-2 flex flex-col gap-2">
        <AmountCard
          label="복합 방수"
          badgeColor="bg-[#E8F1FF] text-[#007AFF]"
          title="이중복합방수 3.8mm"
          grand={cGrand}
          ppy={cPpy}
          count={cCount}
        />
        <AmountCard
          label="우레탄 방수"
          badgeColor="bg-[#FFF0E6] text-[#FF6B1A]"
          title="우레탄 복합방수"
          grand={uGrand}
          ppy={uPpy}
          count={uCount}
        />
      </div>

      {/* 차액 바 — 세로 스택 */}
      <div className="mb-2 flex flex-col gap-[6px] rounded-lg bg-white p-3 shadow-v-sm">
        <DiffRow
          label="차액"
          value={`${diff > 0 ? '+' : ''}${fmt(diff)}`}
          className={diff > 0 ? 'text-[#007AFF]' : diff < 0 ? 'text-[#FF6B1A]' : ''}
        />
        <DiffRow
          label="차이율"
          value={`${diff > 0 ? '+' : ''}${diffRate}%`}
          className={diff > 0 ? 'text-[#007AFF]' : diff < 0 ? 'text-[#FF6B1A]' : ''}
        />
        <DiffRow label="특기사항" value="공법별 독립" small />
      </div>

      {/* 공종별 상세 — 세로 2표 */}
      <div className="rounded-lg bg-white p-[10px] shadow-v-sm">
        <div className="mb-2 border-b border-v-b pb-2">
          <h3 className="text-[11px] font-bold text-v-hdr">공종별 상세 비교</h3>
          <p className="mt-[1px] text-[9px] text-v-mut">기본(공법 고유) · 추가(공유)</p>
        </div>
        <div className="flex flex-col gap-2">
          <SheetTable
            badge="복합"
            badgeColor="bg-[#E8F1FF] text-[#007AFF]"
            title="이중복합방수 3.8mm"
            sheet={compositeSheet}
            calcResult={cCalc}
            colorMap={colorMap}
            maxBase={maxBase}
          />
          <SheetTable
            badge="우레탄"
            badgeColor="bg-[#FFF0E6] text-[#FF6B1A]"
            title="우레탄 복합방수"
            sheet={urethaneSheet}
            calcResult={uCalc}
            colorMap={colorMap}
            maxBase={maxBase}
          />
        </div>
      </div>
    </aside>
  )
}

function AmountCard({
  label,
  badgeColor,
  title,
  grand,
  ppy,
  count,
}: {
  label: string
  badgeColor: string
  title: string
  grand: number
  ppy: number
  count: number
}) {
  return (
    <div className="rounded-lg bg-white p-[12px_14px] shadow-v-sm">
      <span className={`inline-block rounded-lg px-[8px] py-[2px] text-[10px] font-bold tracking-wider mb-[6px] ${badgeColor}`}>
        {label}
      </span>
      <div className="text-[11px] font-bold text-v-hdr mb-2 pb-2 border-b border-v-b">{title}</div>
      <div className="text-[26px] font-extrabold tabular-nums tracking-tight text-v-hdr leading-none mb-[4px]">
        ₩{fmt(grand)}
      </div>
      <div className="inline-block rounded bg-v-grand-bg px-2 py-[3px] text-[10px] font-semibold text-v-mut mb-2 break-keep">
        {toHangul(grand)}
      </div>
      <div className="flex flex-col gap-[3px] pt-2 border-t border-dashed border-v-b">
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-v-mut">실제 평단가</span>
          <b className="font-bold text-v-hdr tabular-nums">{fmt(ppy)}</b>
        </div>
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-v-mut">공사 항목</span>
          <b className="font-bold text-v-hdr">{count}개</b>
        </div>
      </div>
    </div>
  )
}

function DiffRow({
  label,
  value,
  className = '',
  small = false,
}: {
  label: string
  value: string
  className?: string
  small?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[9px] font-bold text-v-mut tracking-wider uppercase">{label}</span>
      <span
        className={`tabular-nums tracking-tight font-extrabold text-v-hdr ${
          small ? 'text-[10px] font-medium' : 'text-[15px]'
        } ${className}`}
      >
        {value}
      </span>
    </div>
  )
}

function SheetTable({
  badge,
  badgeColor,
  title,
  sheet,
  calcResult,
  colorMap,
  maxBase,
}: {
  badge: string
  badgeColor: string
  title: string
  sheet?: EstimateSheet
  calcResult: { subtotal: number; overhead: number; profit: number; grandTotal: number } | null
  colorMap: Record<string, { bg: string; border: string }>
  maxBase: number
}) {
  if (!sheet || !calcResult) {
    return <div className="rounded border border-v-b p-3 text-center text-[10px] text-v-mut">시트 없음</div>
  }

  const baseItems = sheet.items.filter(i => i.is_base && !i.is_hidden)
  const extraItems = sheet.items.filter(i => !i.is_base && !i.is_hidden)
  const baseFillers = Math.max(0, maxBase - baseItems.length)

  const renderRow = (it: EstimateItem) => {
    const sum = it.mat + it.labor + it.exp
    const amt = Math.round(sum * it.qty)
    const c = !it.is_base ? colorMap[it.name] : null
    const bgStyle = it.is_base
      ? { background: '#FFFCF0' }
      : c ? { background: c.bg } : {}
    const nameStyle = it.is_base
      ? { background: '#FFFCF0' }
      : c ? { background: c.bg, boxShadow: `inset 2px 0 0 ${c.border}` } : {}

    return (
      <tr key={`${it.name}-${it.sort_order}`} style={bgStyle}>
        <td
          className="px-[5px] py-[4px] text-left font-semibold text-v-hdr whitespace-nowrap overflow-hidden text-ellipsis max-w-0"
          style={nameStyle}
          title={it.name}
        >
          {it.name.replace(/\n/g, ' ')}
        </td>
        <td className="px-[3px] py-[4px] text-right tabular-nums">{fmt(sum)}</td>
        <td className="px-[3px] py-[4px] text-right tabular-nums font-bold text-v-hdr">{fmt(amt)}</td>
      </tr>
    )
  }

  return (
    <div className="overflow-hidden rounded border border-v-b">
      {/* 헤더 */}
      <div className="flex items-center gap-[6px] border-b border-v-b bg-white px-[8px] py-[6px]">
        <span className={`rounded px-[6px] py-[1px] text-[9px] font-bold ${badgeColor}`}>{badge}</span>
        <span className="text-[10px] font-bold text-v-hdr truncate">{title}</span>
      </div>

      <table className="w-full border-collapse text-[10px]" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr className="border-b border-v-b">
            <th className="bg-v-hdr-bg px-[5px] py-[4px] text-left font-semibold text-v-mut text-[9px] tracking-wider uppercase" style={{ width: '52%' }}>공종</th>
            <th className="bg-v-hdr-bg px-[3px] py-[4px] text-right font-semibold text-v-mut text-[9px]" style={{ width: '22%' }}>단가</th>
            <th className="bg-v-hdr-bg px-[3px] py-[4px] text-right font-semibold text-v-mut text-[9px]" style={{ width: '26%' }}>금액</th>
          </tr>
        </thead>
        <tbody>
          {baseItems.length > 0 && (
            <>
              <tr>
                <td colSpan={3} className="bg-v-base-bg px-[5px] pt-[5px] pb-[2px] text-left text-[8px] font-bold text-[#8B6914] tracking-wider uppercase">
                  기본 공종
                </td>
              </tr>
              {baseItems.map(renderRow)}
              {Array.from({ length: baseFillers }).map((_, i) => (
                <tr key={`filler-${i}`} className="bg-v-base-bg">
                  <td colSpan={3} className="px-[5px] py-[4px] text-[9px] italic text-v-b2">—</td>
                </tr>
              ))}
            </>
          )}
          {extraItems.length > 0 && (
            <>
              <tr>
                <td colSpan={3} className="bg-[#FAFAFC] px-[5px] pt-[5px] pb-[2px] text-left text-[8px] font-bold text-v-mut tracking-wider uppercase">
                  추가 공종
                </td>
              </tr>
              {extraItems.map(renderRow)}
            </>
          )}
          <tr className="border-t border-v-b">
            <td className="px-[5px] py-[4px] font-bold text-v-hdr bg-v-total-bg text-[9px]">소계</td>
            <td className="bg-v-total-bg" />
            <td className="px-[3px] py-[4px] text-right tabular-nums font-bold text-v-hdr bg-v-total-bg">{fmt(calcResult.subtotal)}</td>
          </tr>
          <tr>
            <td className="px-[5px] py-[4px] font-bold text-v-hdr bg-v-total-bg text-[9px]">공과+이윤 9%</td>
            <td className="bg-v-total-bg" />
            <td className="px-[3px] py-[4px] text-right tabular-nums font-bold text-v-hdr bg-v-total-bg">{fmt(calcResult.overhead + calcResult.profit)}</td>
          </tr>
          <tr className="border-t-2 border-v-hdr">
            <td className="px-[5px] py-[6px] font-extrabold text-[11px] text-v-hdr bg-v-grand-bg">합계</td>
            <td className="bg-v-grand-bg" />
            <td className="px-[3px] py-[6px] text-right tabular-nums font-extrabold text-[11px] text-v-hdr bg-v-grand-bg">{fmt(calcResult.grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      <div className="border-t border-v-b bg-[#FAFAFC] px-[8px] py-2">
        <div className="text-[8px] text-v-mut">* 부가가치세별도</div>
      </div>
    </div>
  )
}
