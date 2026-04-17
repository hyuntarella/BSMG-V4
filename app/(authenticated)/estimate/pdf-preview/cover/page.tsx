'use client'

import '@/styles/estimate-pdf.css'
import { useState } from 'react'
import CoverSheet from '@/components/estimate/pdf/cover/CoverSheet'
import type { CoverRenderData } from '@/lib/estimate/pdf/types'

/** mock 데이터 3건 */
const MOCK_DATA: CoverRenderData = {
  date: '2026년 4월 14일',
  customerName: '국제종합물류',
  managerName: '이창엽 팀장',
  managerPhone: '010-5379-3587',
  siteAddress: '동탄산단 3길 20-31 국제종합물류',
  projectTitle: '방수공사',
  totalAmount: 72000000,
  totalAmountKorean: '일금 칠천이백만 원정',
  items: [
    {
      name: '6층 주차장 고경질 우레탄 논슬립 3mm',
      spec: '식',
      qty: 1,
      unitPrice: 0,
      amount: 35000000,
      memo: '',
    },
    {
      name: '외벽 탄성 도장공사',
      spec: '식',
      qty: 1,
      unitPrice: 0,
      amount: 22000000,
      memo: '',
    },
    {
      name: '옥상 우레탄 복합방수 3.8mm',
      spec: '식',
      qty: 1,
      unitPrice: 0,
      amount: 15000000,
      memo: '',
    },
  ],
  pageNumber: '1/4',
}

export default function CoverPreviewPage() {
  const [pdfMode, setPdfMode] = useState(false)

  function togglePdfMode() {
    document.body.classList.toggle('ep-pdf')
    setPdfMode((prev) => !prev)
  }

  return (
    <div className="min-h-screen bg-gray-200 py-10">
      {/* 컨트롤 바 */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <h1 className="text-lg font-bold">갑지 PDF 프리뷰</h1>
        <button
          onClick={togglePdfMode}
          className="px-4 py-2 rounded bg-gray-800 text-white text-sm hover:bg-gray-700"
        >
          {pdfMode ? 'PDF 모드 OFF' : 'PDF 모드 ON'}
        </button>
      </div>

      {/* 페이지 */}
      <div className="flex justify-center">
        <CoverSheet data={MOCK_DATA} />
      </div>
    </div>
  )
}
