/**
 * 갑지 테이블 — 헤더 + N행 + 합계 행
 * Figma node: table (2:484)
 *
 * 5열: 품명 / 규격 / 수량 / 금액 / 비고
 * (단가 컬럼은 Figma 2차 수정에서 삭제됨)
 */
import type { CoverItem } from '@/lib/estimate/pdf/types'

interface CoverTableProps {
  items: CoverItem[]
  totalAmount: number
}

function fmt(n: number): string {
  if (!n) return ''
  return n.toLocaleString('ko-KR')
}

const HEADER_COLS = [
  { label: '품 명', outerW: 'flex-1 min-w-0', textW: 'flex-1 min-w-0', borderR: true },
  { label: '규 격', outerW: 'w-[80px]', textW: 'w-[60px]', borderR: true },
  { label: '수 량', outerW: 'w-[80px]', textW: 'w-[60px]', borderR: true },
  { label: '금 액', outerW: '', textW: 'w-[300px]', borderR: true },
  { label: '비 고', outerW: '', textW: 'w-[100px]', borderR: false },
] as const

export default function CoverTable({ items, totalAmount }: CoverTableProps) {
  return (
    <div className="flex flex-col items-start overflow-hidden w-full">
      {/* 헤더 */}
      <div className="flex items-start overflow-hidden w-full">
        {HEADER_COLS.map((col) => {
          const isFlex = col.outerW.startsWith('flex')
          return (
            <div
              key={col.label}
              className={`bg-[#121212] flex items-center justify-center py-[8px] ${
                isFlex ? 'flex-1 min-w-0' : `shrink-0 ${col.outerW}`
              } ${col.borderR ? 'border-r border-[#4d4d4d]' : ''}`}
            >
              <p
                className={`text-[15px] font-semibold leading-[117.88%] text-white text-center ${col.textW}`}
              >
                {col.label}
              </p>
            </div>
          )
        })}
      </div>

      {/* 데이터 행 */}
      {items.map((item, i) => (
        <div
          key={i}
          className="border-b border-[#c4c4c4] flex items-start overflow-hidden w-full"
        >
          <DataCell flex>{item.name}</DataCell>
          <DataCell outerW="w-[80px]" textW="w-[60px]">{item.spec}</DataCell>
          <DataCell outerW="w-[80px]" textW="w-[60px]">{item.qty}</DataCell>
          <DataCell textW="w-[300px]">{fmt(item.amount)}</DataCell>
          <DataCell textW="w-[100px]" last>{item.memo}</DataCell>
        </div>
      ))}

      {/* 합계 행 */}
      <div className="bg-[#ebebeb] border-b border-[#c4c4c4] flex items-start overflow-hidden w-full">
        <DataCell flex bold>합계</DataCell>
        <DataCell outerW="w-[80px]" textW="w-[60px]" />
        <DataCell outerW="w-[80px]" textW="w-[60px]" />
        <DataCell textW="w-[300px]" bold>{fmt(totalAmount)}</DataCell>
        <DataCell textW="w-[100px]" last>(단수정리)</DataCell>
      </div>
    </div>
  )
}

function DataCell({
  children,
  flex,
  outerW,
  textW,
  last,
  bold,
}: {
  children?: React.ReactNode
  flex?: boolean
  outerW?: string
  textW?: string
  last?: boolean
  bold?: boolean
}) {
  const sizing = flex ? 'flex-1 min-w-0' : `shrink-0 ${outerW ?? ''}`
  const borderR = last ? '' : 'border-r border-[#c4c4c4]'
  const tw = flex ? 'flex-1 min-w-0' : (textW ?? '')
  const weight = bold ? 'font-bold' : 'font-normal'
  return (
    <div className={`flex items-center justify-center py-[10px] ${sizing} ${borderR}`}>
      <p className={`text-[15px] ${weight} leading-[117.88%] text-black text-center ${tw}`}>
        {children ?? '\u00A0'}
      </p>
    </div>
  )
}
