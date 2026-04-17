/**
 * 갑지 수신자(좌) + 공급자(우) 정보 행
 * Figma node: info-row (2:423)
 *
 * 델타 3차: 수신자 3행(담당자 삭제), 공급자 라벨 재배치(담당자/연락처 추가)
 */
import { COMPANY_INFO } from '@/lib/estimate/pdf/constants'

interface CoverInfoRowProps {
  date: string
  /** 공급자 측 영업담당자 */
  managerName: string
  /** 공급자 측 연락처 */
  managerPhone: string
  siteAddress: string
  projectTitle: string
}

export default function CoverInfoRow({
  date,
  managerName,
  managerPhone,
  siteAddress,
  projectTitle,
}: CoverInfoRowProps) {
  return (
    <div className="flex gap-[30px] items-center overflow-hidden w-full">
      {/* 수신자 (좌측) — 3행: 견적일, 공사명, 주소 */}
      <div className="flex flex-col items-start overflow-hidden shrink-0 w-[350px]">
        <div className="flex items-start overflow-hidden py-[5px] w-full">
          <p className="text-[15px] font-bold leading-[117.88%] text-black w-[80px]">
            수신자
          </p>
        </div>

        {/* 견적일 — 첫 행: border-top 2px */}
        <div className="border-t-2 border-[#121212] flex items-start overflow-hidden w-full">
          <LeftLabel first>견 적 일</LeftLabel>
          <LeftValue first>{date}</LeftValue>
        </div>

        {/* 공사명 */}
        <div className="flex items-start overflow-hidden w-full">
          <LeftLabel>공 사 명</LeftLabel>
          <LeftValue>{projectTitle}</LeftValue>
        </div>

        {/* 주소 — 마지막 행: h-54px, border-bottom */}
        <div className="flex items-start overflow-hidden w-full">
          <LeftLabel tall>주 소</LeftLabel>
          <LeftValue last tall>{siteAddress}</LeftValue>
        </div>
      </div>

      {/* 공급자 (우측) */}
      <div className="flex flex-col flex-1 min-w-0 items-start overflow-hidden">
        <div className="flex items-start overflow-hidden py-[5px] w-full">
          <p className="text-[15px] font-bold leading-[117.88%] text-black w-[80px]">
            공급자
          </p>
        </div>

        {/* 상호(법인명) / 담당자 — 첫 행 */}
        <div className="border-t-2 border-[#121212] flex items-start overflow-hidden w-full">
          <RightLabel>상호(법인명)</RightLabel>
          <RightValue>{COMPANY_INFO.name}</RightValue>
          <RightLabel>담당자</RightLabel>
          <RightValue>{managerName}</RightValue>
        </div>

        {/* 사업자 번호 / 연락처 */}
        <div className="border-t border-[#c4c4c4] flex items-start overflow-hidden w-full">
          <RightLabel>사업자 번호</RightLabel>
          <RightValue>{COMPANY_INFO.businessNumber}</RightValue>
          <RightLabel>연락처</RightLabel>
          <RightValue>{managerPhone}</RightValue>
        </div>

        {/* 업태 및 종목 / FAX */}
        <div className="border-t border-[#c4c4c4] flex items-start overflow-hidden w-full">
          <RightLabel>업태 및 종목</RightLabel>
          <RightValue>{COMPANY_INFO.industry}</RightValue>
          <RightLabel>FAX</RightLabel>
          <RightValue>{COMPANY_INFO.fax}</RightValue>
        </div>

        {/* 사업장주소 — 마지막 행 */}
        <div className="border-t border-b border-[#c4c4c4] flex items-start overflow-hidden w-full">
          <RightLabel>사업장 주소</RightLabel>
          <RightValue>{COMPANY_INFO.address}</RightValue>
        </div>
      </div>
    </div>
  )
}

/* --- 내부 셀 컴포넌트 --- */

function LeftLabel({
  children,
  first,
  tall,
}: {
  children: React.ReactNode
  first?: boolean
  tall?: boolean
}) {
  const borderCls = first ? '' : 'border-t border-[#4d4d4d]'
  const heightCls = tall ? 'h-[54px] items-start' : 'items-center'
  return (
    <div
      className={`bg-[#121212] flex justify-center pl-[10px] py-[6px] shrink-0 ${borderCls} ${heightCls}`}
    >
      <p className="text-[15px] font-semibold leading-[117.88%] text-white w-[65px]">
        {children}
      </p>
    </div>
  )
}

function LeftValue({
  children,
  first,
  last,
  tall,
}: {
  children: React.ReactNode
  first?: boolean
  last?: boolean
  tall?: boolean
}) {
  const borderCls = first ? '' : 'border-t border-[#c4c4c4]'
  const bottomCls = last ? 'border-b border-[#c4c4c4]' : ''
  const alignCls = tall ? 'items-start self-stretch' : 'items-center'
  return (
    <div
      className={`flex flex-1 min-w-0 justify-center pl-[10px] py-[6px] ${borderCls} ${bottomCls} ${alignCls}`}
    >
      <p className="flex-1 min-w-0 text-[15px] font-normal leading-[117.88%] text-black">
        {children}
      </p>
    </div>
  )
}

function RightLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#ebebeb] flex items-center justify-center pl-[3px] py-[6px] shrink-0 w-[95px]">
      <p className="text-[15px] font-semibold leading-[117.88%] text-black w-[80px]">
        {children}
      </p>
    </div>
  )
}

function RightValue({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 min-w-0 items-center justify-center pl-[10px] py-[6px]">
      <p className="flex-1 min-w-0 text-[15px] font-normal leading-[117.88%] text-black">
        {children}
      </p>
    </div>
  )
}
