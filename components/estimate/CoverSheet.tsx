'use client'

import type { Estimate, EstimateSheet } from '@/lib/estimate/types'
import { fm } from '@/lib/utils/format'
import { n2k } from '@/lib/utils/numberToKorean'
import { calc } from '@/lib/estimate/calc'

interface CoverSheetProps {
  estimate: Estimate
  sheet: EstimateSheet
  onUpdate: (field: keyof Estimate, value: string | number) => void
}

/** 공급자 정보 */
const SUPPLIER = {
  regNo: '642-87-03286',
  company: '(주)부성에이티',
  ceo: '손지우',
  bizType: '건설업',
  bizItem: '방수, 도장, 조적 외',
  phone: '010.4169.3567',
  fax: '02.3012.3587',
  address: '서울특별시 강남구 영동대로 602, 6층 7293호 (삼성동 미켈란 107)',
}

export default function CoverSheet({ estimate, sheet, onUpdate }: CoverSheetProps) {
  const calcResult = calc(sheet.items)
  const grandTotal = calcResult.grandTotal
  const koreanAmount = `일금 ${n2k(grandTotal)}원`

  return (
    <div data-testid="cover-sheet" className="mx-auto max-w-[900px] bg-white p-8 text-[13px] leading-relaxed">
      {/* "견 적 서" 타이틀 — 중앙 상단 */}
      <h1 data-testid="cover-title" className="mb-6 text-center text-3xl font-bold tracking-[0.3em]">
        견 적 서
      </h1>

      {/* 좌측: 방수명가 로고 + 기본정보 / 우측: 공급자 정보 */}
      <div className="mb-6 flex gap-6">
        {/* 좌측 블록 */}
        <div className="w-[35%]">
          {/* 방수명가 로고 */}
          <div data-testid="cover-logo" className="mb-3 flex items-center gap-1">
            <span className="text-xl font-extrabold tracking-tight text-gray-900">방수명가</span>
            <span className="inline-flex items-center rounded-sm bg-[#c83030] px-1 py-0.5 text-[8px] font-bold text-white leading-none">
              防水
            </span>
          </div>

          {/* 기본정보 테이블 */}
          <div className="border border-gray-800">
            <CoverRow label="관리번호" value={estimate.mgmt_no ?? ''} />
            <CoverRow label="견 적 일" value={estimate.date} />
            <CoverRow label="주 소">
              <EditableField value={estimate.site_name ?? ''} onChange={v => onUpdate('site_name', v)} placeholder="현장 주소" />
            </CoverRow>
            <CoverRow label="공 사 명" value="방수공사" last />
          </div>
        </div>

        {/* 우측: 공급자 */}
        <div className="flex-1">
          <div className="mb-1 text-xs font-semibold text-gray-500">공급자</div>
          <div className="border border-gray-800">
            <div className="grid grid-cols-[70px_1fr_80px_1fr_40px_auto] border-b border-gray-300">
              <Cell head>등록 번호</Cell>
              <Cell>{SUPPLIER.regNo}</Cell>
              <Cell head>상호(법인명)</Cell>
              <Cell>{SUPPLIER.company}</Cell>
              <Cell head>성명</Cell>
              <Cell>{SUPPLIER.ceo}</Cell>
            </div>
            <div className="grid grid-cols-[70px_1fr_70px_1fr] border-b border-gray-300">
              <Cell head>업 태</Cell>
              <Cell>{SUPPLIER.bizType}</Cell>
              <Cell head>종 목</Cell>
              <Cell>{SUPPLIER.bizItem}</Cell>
            </div>
            <div className="grid grid-cols-[70px_1fr_70px_1fr] border-b border-gray-300">
              <Cell head>전화번호</Cell>
              <Cell>{SUPPLIER.phone}</Cell>
              <Cell head>FAX</Cell>
              <Cell>{SUPPLIER.fax}</Cell>
            </div>
            <div className="grid grid-cols-[70px_1fr]">
              <Cell head>사업장 주소</Cell>
              <Cell>{SUPPLIER.address}</Cell>
            </div>
          </div>
        </div>
      </div>

      {/* 공사금액 — 검은 뱃지 + 일금 */}
      <div data-testid="cover-amount" className="mb-6 flex items-center gap-4">
        <div className="rounded bg-[#121212] px-4 py-2 text-center text-xs font-bold text-white leading-tight">
          공사금액<br />(부가세 별도)
        </div>
        <div className="text-xl font-bold tracking-tight">
          {koreanAmount} ({fm(grandTotal)})
        </div>
      </div>

      {/* 품명 테이블 — 검은 헤더 */}
      <div data-testid="cover-table" className="mb-6 border border-gray-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#121212] text-white">
              <th className="border-r border-gray-600 px-3 py-2 text-center font-semibold">품 명</th>
              <th className="border-r border-gray-600 px-3 py-2 text-center font-semibold">규 격</th>
              <th className="border-r border-gray-600 px-3 py-2 text-center font-semibold">수 량</th>
              <th className="border-r border-gray-600 px-3 py-2 text-center font-semibold">단 가</th>
              <th className="border-r border-gray-600 px-3 py-2 text-center font-semibold">금 액</th>
              <th className="px-3 py-2 text-center font-semibold">비 고</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="px-3 py-2">
                {sheet.title ?? (sheet.type === '복합' ? '복합방수' : '우레탄방수')}
              </td>
              <td className="px-3 py-2 text-center">식</td>
              <td className="px-3 py-2 text-center">1</td>
              <td className="px-3 py-2 text-right" />
              <td className="px-3 py-2 text-right tabular-nums font-medium">{fm(calcResult.totalBeforeRound)}</td>
              <td className="px-3 py-2" />
            </tr>
            {/* 빈 행 */}
            <tr className="border-b border-gray-200"><td colSpan={6} className="h-7" /></tr>
            <tr className="border-b border-gray-200"><td colSpan={6} className="h-7" /></tr>
            {/* 합계 */}
            <tr className="font-semibold">
              <td className="px-3 py-2 text-center">합 계</td>
              <td colSpan={3} />
              <td className="px-3 py-2 text-right tabular-nums font-bold">{fm(grandTotal)}</td>
              <td className="px-3 py-2 text-xs text-gray-500">(단수정리)</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 특기사항 — 빨간 라벨 */}
      <div data-testid="cover-notes" className="mb-8">
        <span className="font-bold text-[#a11d1f]">특기사항</span>
        <div className="mt-2 space-y-1 text-xs text-gray-800">
          <p>1. 하자보수기간 {sheet.warranty_years}년 (하자이행증권 {sheet.warranty_bond}년)</p>
          <p>2. 견적서 제출 30일 유효</p>
          <p className="text-[11px] text-gray-500">* 부가가치세별도</p>
        </div>
      </div>

      {/* Brand Collaborations */}
      <div data-testid="cover-brands" className="flex items-center justify-center gap-3 border-t border-gray-200 pt-4">
        <span className="text-[10px] text-black/30 tracking-wide">Brand Collaborations</span>
        {['SAMSUNG', 'RAEMIAN', '우정사업본부', '서울종로', '서울중구', 'GIMPO'].map(b => (
          <span key={b} className="rounded border border-gray-300 px-3 py-1.5 text-[10px] font-medium text-gray-500">
            {b}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── 헬퍼 컴포넌트 ──

function CoverRow({
  label,
  value,
  children,
  last = false,
}: {
  label: string
  value?: string
  children?: React.ReactNode
  last?: boolean
}) {
  return (
    <div className={`grid grid-cols-[70px_1fr] ${!last ? 'border-b border-gray-300' : ''}`}>
      <div className="bg-[#121212] px-2 py-1.5 text-center text-xs font-semibold text-white">
        {label}
      </div>
      <div className="px-3 py-1.5">
        {children ?? <span>{value}</span>}
      </div>
    </div>
  )
}

function Cell({ head, children }: { head?: boolean; children: React.ReactNode }) {
  return (
    <div className={`px-2 py-1.5 text-xs ${head ? 'font-semibold text-black' : ''}`}>
      {children}
    </div>
  )
}

function EditableField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-transparent text-xs outline-none placeholder:text-gray-300"
    />
  )
}
