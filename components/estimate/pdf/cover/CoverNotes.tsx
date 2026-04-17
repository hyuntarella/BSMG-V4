/**
 * 갑지 특기사항 + 부가세 캡션
 * Figma node: special-notes (3:2)
 */
import { FIXED_NOTES } from '@/lib/estimate/pdf/constants'

export default function CoverNotes() {
  return (
    <div className="flex flex-col items-start pt-[5px] pb-[15px] px-[10px] w-full text-black">
      {/* 특기사항 본문 */}
      <div className="flex gap-[16px] items-start overflow-hidden p-[10px] text-[15px] w-full">
        <p className="leading-[117.88%] shrink-0 w-[60px]">특기사항</p>
        <div className="flex-1 min-w-0">
          <p className="font-bold leading-[117.88%] mb-0 text-[15px] text-[#a11d1f]">
            하자보수기간 {FIXED_NOTES.warrantyYears}년 (하자이행증권{' '}
            {FIXED_NOTES.warrantyBondYears}년)
          </p>
          <p className="leading-[117.88%]">
            견적서 제출 {FIXED_NOTES.validDays}일 유효
          </p>
        </div>
      </div>

      {/* 부가세 캡션 */}
      <div className="flex gap-[16px] items-start overflow-hidden px-[10px] w-full">
        <p className="leading-[117.88%] shrink-0 text-[15px] text-center w-[60px]">
          {'\u00A0'}
        </p>
        <p className="flex-1 min-w-0 leading-[108.62%] text-[12px]">
          * {FIXED_NOTES.vatNote}
        </p>
      </div>
    </div>
  )
}
