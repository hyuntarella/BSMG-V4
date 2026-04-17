/**
 * 을지 단일 행 — variant로 item/callout/subtotal/overhead/profit/totalBeforeRound/grandTotal 분기
 * Figma node: table-row (3:2620+), footer rows
 */
import type { DetailItem, CalloutRow } from '@/lib/estimate/pdf/types'
import type { DetailCalcResult } from '@/lib/estimate/pdf/detailCalc'

/* ── 포맷 ── */
function fmt(n: number | undefined): string {
  if (n === undefined || n === 0) return ''
  return n.toLocaleString('ko-KR')
}

/* ── 공통 스타일 (PM 확정 v2.1 + Figma 실측 h-[30px]/h-[38px]) ── */
const TOTAL_COLS = 13
const cellBase = 'text-[12px] font-normal text-black text-center border-r border-[#c4c4c4] leading-[108.62%] align-middle h-[30px]'
const cellRight = 'text-[12px] font-normal text-black text-center border-r border-[#c4c4c4] leading-[108.62%] align-middle h-[30px]'
const cellSlim = 'text-[12px] font-normal text-black text-center border-r border-[#c4c4c4] leading-[108.62%] align-middle h-[38px]'
const footerBg = 'bg-[#ebebeb]'
const rowBorder = 'border-b border-[#c4c4c4]'

/* ── 빈 td (합산 행용) ── */
function EmptyTd({ className }: { className: string }) {
  return <td className={className}>&nbsp;</td>
}

/* ── Item Row ── */
function ItemRow({ item }: { item: DetailItem }) {
  return (
    <tr className={rowBorder}>
      <td className={`${cellBase} w-[158px]`}>{item.name}</td>
      <td className={`${cellBase} w-[110px]`}>{item.spec ?? ''}</td>
      <td className={`${cellBase} w-[50px]`}>{item.unit ?? ''}</td>
      <td className={`${cellRight} w-[60px]`}>{fmt(item.quantity)}</td>
      <td className={`${cellRight} w-[60px]`}>{fmt(item.material?.unitPrice)}</td>
      <td className={`${cellRight} w-[85px]`}>{fmt(item.material?.amount)}</td>
      <td className={`${cellRight} w-[60px]`}>{fmt(item.labor?.unitPrice)}</td>
      <td className={`${cellRight} w-[85px]`}>{fmt(item.labor?.amount)}</td>
      <td className={`${cellRight} w-[60px]`}>{fmt(item.expense?.unitPrice)}</td>
      <td className={`${cellRight} w-[85px]`}>{fmt(item.expense?.amount)}</td>
      <td className={`${cellRight} w-[75px]`}>{fmt(item.total?.unitPrice)}</td>
      <td className={`${cellRight} w-[95px]`}>{fmt(item.total?.amount)}</td>
      <td className={`${cellBase} w-[60px] border-r-0`}>{item.note ?? ''}</td>
    </tr>
  )
}

/* ── Callout Row ── */
function CalloutRowView({ row }: { row: CalloutRow }) {
  const isAccent = row.color === 'accent'
  const textCls = isAccent
    ? 'text-[12px] font-bold text-[#C83030]'
    : 'text-[12px] font-normal text-black'
  return (
    <tr className={rowBorder}>
      <td colSpan={TOTAL_COLS} className={`${textCls} text-left pl-[10px] leading-[108.62%] align-middle h-[30px]`}>
        {row.text}
      </td>
    </tr>
  )
}

/* ── Footer 행들 ── */
interface FooterProps {
  calc: DetailCalcResult
}

function SubtotalRow({ calc }: FooterProps) {
  return (
    <tr className={`${rowBorder} ${footerBg}`}>
      <td className={`${cellBase} w-[158px] font-semibold`}>소&nbsp;&nbsp;&nbsp;계</td>
      <EmptyTd className={`${cellBase} w-[110px]`} />
      <EmptyTd className={`${cellBase} w-[50px]`} />
      <EmptyTd className={`${cellRight} w-[60px]`} />
      <EmptyTd className={`${cellRight} w-[60px]`} />
      <td className={`${cellRight} w-[85px] font-semibold`}>{fmt(calc.subtotal.material)}</td>
      <EmptyTd className={`${cellRight} w-[60px]`} />
      <td className={`${cellRight} w-[85px] font-semibold`}>{fmt(calc.subtotal.labor)}</td>
      <EmptyTd className={`${cellRight} w-[60px]`} />
      <td className={`${cellRight} w-[85px] font-semibold`}>{fmt(calc.subtotal.expense)}</td>
      <EmptyTd className={`${cellRight} w-[75px]`} />
      <td className={`${cellRight} w-[95px] font-semibold`}>{fmt(calc.subtotal.total)}</td>
      <EmptyTd className={`${cellBase} w-[60px] border-r-0`} />
    </tr>
  )
}

function OverheadRow({ calc }: FooterProps) {
  return (
    <tr className={rowBorder}>
      <td className={`${cellSlim} w-[158px] font-semibold leading-tight`}>
        공 과 잡 비,<br />안 전 관 리 비
      </td>
      <EmptyTd className={`${cellSlim} w-[110px]`} />
      <td className={`${cellSlim} w-[50px]`}>%</td>
      <td className={`${cellSlim} w-[60px]`}>3</td>
      <EmptyTd className={`${cellSlim} w-[60px]`} />
      <EmptyTd className={`${cellSlim} w-[85px]`} />
      <EmptyTd className={`${cellSlim} w-[60px]`} />
      <EmptyTd className={`${cellSlim} w-[85px]`} />
      <EmptyTd className={`${cellSlim} w-[60px]`} />
      <EmptyTd className={`${cellSlim} w-[85px]`} />
      <EmptyTd className={`${cellSlim} w-[75px]`} />
      <td className={`${cellSlim} w-[95px] font-semibold`}>{fmt(calc.overhead)}</td>
      <EmptyTd className={`${cellSlim} w-[60px] border-r-0`} />
    </tr>
  )
}

function ProfitRow({ calc }: FooterProps) {
  return (
    <tr className={rowBorder}>
      <td className={`${cellBase} w-[158px] font-semibold`}>기 업 이 윤</td>
      <EmptyTd className={`${cellBase} w-[110px]`} />
      <td className={`${cellBase} w-[50px]`}>%</td>
      <td className={`${cellBase} w-[60px]`}>6</td>
      <EmptyTd className={`${cellRight} w-[60px]`} />
      <EmptyTd className={`${cellRight} w-[85px]`} />
      <EmptyTd className={`${cellRight} w-[60px]`} />
      <EmptyTd className={`${cellRight} w-[85px]`} />
      <EmptyTd className={`${cellRight} w-[60px]`} />
      <EmptyTd className={`${cellRight} w-[85px]`} />
      <EmptyTd className={`${cellRight} w-[75px]`} />
      <td className={`${cellRight} w-[95px] font-semibold`}>{fmt(calc.profit)}</td>
      <EmptyTd className={`${cellBase} w-[60px] border-r-0`} />
    </tr>
  )
}

function BeforeRoundRow({ calc }: FooterProps) {
  return (
    <tr className={`${rowBorder} ${footerBg}`}>
      <td className={`${cellBase} w-[158px] font-semibold`}>계</td>
      <EmptyTd className={`${cellBase} w-[110px]`} />
      <EmptyTd className={`${cellBase} w-[50px]`} />
      <EmptyTd className={`${cellRight} w-[60px]`} />
      <EmptyTd className={`${cellRight} w-[60px]`} />
      <EmptyTd className={`${cellRight} w-[85px]`} />
      <EmptyTd className={`${cellRight} w-[60px]`} />
      <EmptyTd className={`${cellRight} w-[85px]`} />
      <EmptyTd className={`${cellRight} w-[60px]`} />
      <EmptyTd className={`${cellRight} w-[85px]`} />
      <EmptyTd className={`${cellRight} w-[75px]`} />
      <td className={`${cellRight} w-[95px] font-semibold`}>{fmt(calc.beforeRound)}</td>
      <EmptyTd className={`${cellBase} w-[60px] border-r-0`} />
    </tr>
  )
}

function GrandTotalRow({ calc }: FooterProps) {
  return (
    <tr className={`${rowBorder} ${footerBg}`}>
      <td className="text-[12px] font-bold text-black text-center border-r border-[#c4c4c4] leading-[108.62%] align-middle h-[30px] w-[158px]">
        합 계
      </td>
      <EmptyTd className={`${cellBase} w-[110px]`} />
      <EmptyTd className={`${cellBase} w-[50px]`} />
      <EmptyTd className={`${cellRight} w-[60px]`} />
      <EmptyTd className={`${cellRight} w-[60px]`} />
      <EmptyTd className={`${cellRight} w-[85px]`} />
      <EmptyTd className={`${cellRight} w-[60px]`} />
      <EmptyTd className={`${cellRight} w-[85px]`} />
      <EmptyTd className={`${cellRight} w-[60px]`} />
      <EmptyTd className={`${cellRight} w-[85px]`} />
      <EmptyTd className="text-[12px] font-black text-black text-center border-r border-[#c4c4c4] leading-[108.62%] align-middle h-[30px] w-[75px]" />
      <td className="text-[12px] font-black text-black text-center border-r border-[#c4c4c4] leading-[108.62%] align-middle h-[30px] w-[95px]">
        {fmt(calc.grandTotal)}
      </td>
      <td className="text-[12px] font-normal text-black text-center leading-[108.62%] align-middle h-[30px] w-[60px]">
        (단수정리)
      </td>
    </tr>
  )
}

/* ── Export: 단일 행 렌더 ── */
export { ItemRow, CalloutRowView, SubtotalRow, OverheadRow, ProfitRow, BeforeRoundRow, GrandTotalRow }
