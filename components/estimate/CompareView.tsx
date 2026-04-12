'use client'

import type { Estimate, EstimateSheet, EstimateItem } from '@/lib/estimate/types'
import { calc } from '@/lib/estimate/calc'
import { toHangul } from '@/lib/estimate/toHangul'

// 파스텔 팔레트 (추가공종 색상 구분)
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

interface CompareViewProps {
  estimate: Estimate
  compositeSheet?: EstimateSheet
  urethaneSheet?: EstimateSheet
}

const fmt = (n: number) => (n || 0).toLocaleString('ko-KR')

/**
 * 실제 평단가 필터: is_base && !is_hidden && unit !== '식' && name !== '벽체 우레탄'
 */
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

export default function CompareView({
  estimate,
  compositeSheet,
  urethaneSheet,
}: CompareViewProps) {
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

  // 기본공종 행 수 정렬용
  const cBaseCount = compositeSheet?.items.filter(i => i.is_base && !i.is_hidden).length ?? 0
  const uBaseCount = urethaneSheet?.items.filter(i => i.is_base && !i.is_hidden).length ?? 0
  const maxBase = Math.max(cBaseCount, uBaseCount)

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-5 pb-20">
      {/* 타이틀 */}
      <div className="mb-[18px] text-center">
        <h2 className="text-[22px] font-extrabold tracking-[6px] text-v-hdr">갑 지 · 검 수</h2>
        <p className="mt-[3px] text-[11px] text-v-mut tracking-wider">복합 · 우레탄 방수공사 견적서</p>
      </div>

      {/* 상단 카드 2개 */}
      <div className="mb-[10px] grid grid-cols-2 gap-[14px]">
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

      {/* 차액 바 */}
      <div className="mb-[14px] grid grid-cols-3 gap-[14px] rounded-xl bg-white p-4 px-6 shadow-v-sm">
        <DiffCol
          label="차액"
          value={`${diff > 0 ? '+' : ''}${fmt(diff)}`}
          className={diff > 0 ? 'text-[#007AFF]' : diff < 0 ? 'text-[#FF6B1A]' : ''}
        />
        <DiffCol
          label="차이율"
          value={`${diff > 0 ? '+' : ''}${diffRate}%`}
          className={diff > 0 ? 'text-[#007AFF]' : diff < 0 ? 'text-[#FF6B1A]' : ''}
        />
        <DiffCol label="특기사항" value="공법별 독립" className="!text-xs !font-medium text-[#1C1C1E]" />
      </div>

      {/* 공종별 상세 비교 */}
      <div className="rounded-xl bg-white p-5 shadow-v-sm">
        <div className="mb-[14px] border-b border-v-b pb-3">
          <h3 className="text-sm font-bold text-v-hdr">공종별 상세 비교</h3>
          <p className="mt-[3px] text-[11px] text-v-mut">기본공종은 공법별 고유, 추가공종은 양 공법에 공유</p>
        </div>

        <div className="grid grid-cols-2 gap-[14px]">
          <SheetTable
            badge="복합 방수"
            badgeColor="bg-[#E8F1FF] text-[#007AFF]"
            title="이중복합방수 3.8mm"
            sheet={compositeSheet}
            calcResult={cCalc}
            colorMap={colorMap}
            maxBase={maxBase}
            notes={compositeSheet?.items ? undefined : undefined}
          />
          <SheetTable
            badge="우레탄 방수"
            badgeColor="bg-[#FFF0E6] text-[#FF6B1A]"
            title="우레탄 복합방수"
            sheet={urethaneSheet}
            calcResult={uCalc}
            colorMap={colorMap}
            maxBase={maxBase}
            notes={undefined}
          />
        </div>
      </div>
    </div>
  )
}

// --- 금액 카드 ---
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
    <div className="relative rounded-xl bg-white p-[22px_24px] shadow-v-sm">
      <span className={`inline-block rounded-xl px-3 py-1 text-[11px] font-bold tracking-wider mb-[10px] ${badgeColor}`}>
        {label}
      </span>
      <div className="text-[15px] font-bold text-v-hdr mb-4 pb-3 border-b border-v-b">{title}</div>
      <div className="text-[38px] font-extrabold tabular-nums tracking-tight text-v-hdr leading-none mb-[6px]">
        {fmt(grand)}
      </div>
      <div className="inline-block rounded-md bg-v-grand-bg px-[10px] py-[6px] text-xs font-semibold text-v-mut mb-[14px]">
        {toHangul(grand)}
      </div>
      <div className="flex flex-col gap-[6px] pt-[10px] border-t border-dashed border-v-b">
        <div className="flex justify-between items-center text-xs">
          <span className="text-v-mut">실제 평단가</span>
          <b className="font-bold text-v-hdr tabular-nums">{fmt(ppy)}</b>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-v-mut">공사 항목</span>
          <b className="font-bold text-v-hdr">{count}개</b>
        </div>
      </div>
    </div>
  )
}

// --- 차액 컬럼 ---
function DiffCol({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex flex-col gap-[2px] px-1 border-r border-v-hov last:border-r-0">
      <span className="text-[10px] font-bold text-v-mut tracking-wider uppercase">{label}</span>
      <span className={`text-[22px] font-extrabold tabular-nums tracking-tight text-v-hdr ${className}`}>
        {value}
      </span>
    </div>
  )
}

// --- 시트 테이블 ---
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
  notes?: string[]
}) {
  if (!sheet || !calcResult) {
    return <div className="rounded-lg border border-v-b p-6 text-center text-sm text-v-mut">시트 없음</div>
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
      : c ? { background: c.bg, boxShadow: `inset 3px 0 0 ${c.border}` } : {}

    return (
      <tr key={`${it.name}-${it.sort_order}`} style={bgStyle}>
        <td className="px-[10px] py-[7px] text-left font-semibold text-v-hdr whitespace-nowrap overflow-hidden text-ellipsis max-w-0" style={nameStyle} title={it.name}>
          {it.name.replace(/\n/g, ' ')}
        </td>
        <td className="px-1 py-[7px] text-right tabular-nums" style={{ background: 'rgba(9,105,218,.03)' }}>{fmt(it.mat)}</td>
        <td className="px-1 py-[7px] text-right tabular-nums" style={{ background: 'rgba(26,127,55,.03)' }}>{fmt(it.labor)}</td>
        <td className="px-1 py-[7px] text-right tabular-nums" style={{ background: 'rgba(191,135,0,.03)' }}>{fmt(it.exp)}</td>
        <td className="px-1 py-[7px] text-right tabular-nums font-bold bg-v-total-bg">{fmt(sum)}</td>
        <td className="px-1 py-[7px] text-right tabular-nums font-bold text-v-hdr text-xs">{fmt(amt)}</td>
      </tr>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-v-b">
      {/* 헤더 */}
      <div className="flex items-center gap-[10px] border-b border-v-b px-[14px] py-[10px] bg-white">
        <span className={`rounded-xl px-3 py-1 text-[11px] font-bold ${badgeColor}`}>{badge}</span>
        <span className="text-[13px] font-bold text-v-hdr">{title}</span>
      </div>

      {/* 테이블 */}
      <table className="w-full border-collapse text-[11.5px]" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr className="border-b border-v-b">
            <th className="bg-v-hdr-bg px-[10px] py-[7px] text-left font-semibold text-v-mut text-[10px] tracking-wider uppercase" style={{ width: '28%' }}>공종</th>
            <th className="bg-v-hdr-bg px-1 py-[7px] text-right font-semibold text-v-mut text-[10px]" style={{ width: '12%' }}>재료</th>
            <th className="bg-v-hdr-bg px-1 py-[7px] text-right font-semibold text-v-mut text-[10px]" style={{ width: '12%' }}>인건</th>
            <th className="bg-v-hdr-bg px-1 py-[7px] text-right font-semibold text-v-mut text-[10px]" style={{ width: '12%' }}>경비</th>
            <th className="bg-v-hdr-bg px-1 py-[7px] text-right font-semibold text-v-mut text-[10px]" style={{ width: '15%' }}>단가합</th>
            <th className="bg-v-hdr-bg px-1 py-[7px] text-right font-semibold text-v-mut text-[10px]" style={{ width: '21%' }}>금액</th>
          </tr>
        </thead>
        <tbody>
          {/* 기본 공종 */}
          {baseItems.length > 0 && (
            <>
              <tr>
                <td colSpan={6} className="px-[10px] py-[10px_10px_4px] text-left text-[9px] font-bold text-[#8B6914] tracking-wider uppercase bg-v-base-bg" style={{ borderBottom: '1px solid rgba(0,0,0,.06)' }}>
                  기본 공종
                </td>
              </tr>
              {baseItems.map(renderRow)}
              {Array.from({ length: baseFillers }).map((_, i) => (
                <tr key={`filler-${i}`} className="bg-v-base-bg">
                  <td colSpan={6} className="px-[10px] py-[7px] text-[11px] italic text-v-b2 bg-v-base-bg">—</td>
                </tr>
              ))}
            </>
          )}

          {/* 추가 공종 */}
          {extraItems.length > 0 && (
            <>
              <tr>
                <td colSpan={6} className="px-[10px] py-[10px_10px_4px] text-left text-[9px] font-bold text-v-mut tracking-wider uppercase bg-[#FAFAFC]">
                  추가 공종
                </td>
              </tr>
              {extraItems.map(renderRow)}
            </>
          )}

          {/* 소계 */}
          <tr className="border-t border-v-b">
            <td className="px-[10px] py-[7px] font-bold text-v-hdr bg-v-total-bg">소계</td>
            <td colSpan={4} className="bg-v-total-bg" />
            <td className="px-1 py-[7px] text-right tabular-nums font-bold text-v-hdr bg-v-total-bg">{fmt(calcResult.subtotal)}</td>
          </tr>
          {/* 공과잡비·이윤 */}
          <tr>
            <td className="px-[10px] py-[7px] font-bold text-v-hdr bg-v-total-bg">공과잡비·이윤 (9%)</td>
            <td colSpan={4} className="bg-v-total-bg" />
            <td className="px-1 py-[7px] text-right tabular-nums font-bold text-v-hdr bg-v-total-bg">{fmt(calcResult.overhead + calcResult.profit)}</td>
          </tr>
          {/* 합계 */}
          <tr className="border-t-2 border-v-hdr">
            <td className="px-[10px] py-[10px] font-extrabold text-[13px] text-v-hdr bg-v-grand-bg">합계</td>
            <td colSpan={4} className="bg-v-grand-bg" />
            <td className="px-1 py-[10px] text-right tabular-nums font-extrabold text-[13px] text-v-hdr bg-v-grand-bg">{fmt(calcResult.grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      {/* 특기사항 */}
      <div className="border-t border-v-b bg-[#FAFAFC] px-[14px] py-3">
        <div className="text-[10px] font-bold text-v-mut tracking-wider uppercase mb-[6px]">특기사항</div>
        <div className="text-[10.5px] text-v-mut">* 부가가치세별도</div>
      </div>
    </div>
  )
}
