'use client'

import { useState, useCallback } from 'react'
import Header from '@/components/layout/Header'
import FollowUpCard from '@/components/dashboard/FollowUpCard'
import CsStatusSection from '@/components/dashboard/CsStatusSection'
import UnsentCard from '@/components/dashboard/UnsentCard'
import ViewedCard from '@/components/dashboard/ViewedCard'
import TodaySchedule from '@/components/dashboard/TodaySchedule'
import DashboardKpi from '@/components/dashboard/DashboardKpi'
import LoadEstimateModal from '@/components/estimate/LoadEstimateModal'
import CrmSidePanel from '@/components/dashboard/CrmSidePanel'

export default function DashboardPage() {
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [selectedCrmId, setSelectedCrmId] = useState<string | null>(null)
  const handleCrmOpen = useCallback((id: string) => setSelectedCrmId(id), [])
  const handleCrmClose = useCallback(() => setSelectedCrmId(null), [])

  return (
    <div className="min-h-screen bg-surface">
      <Header />

      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* 인사 + 날짜 */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-ink">안녕하세요</h1>
          <p className="text-sm text-ink-secondary mt-0.5">{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
        </div>

        {/* KPI 카드 */}
        <DashboardKpi />

        {/* 2-컬럼 그리드 (데스크탑) */}
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {/* 좌측 컬럼 */}
          <div className="space-y-5">
            {/* 0. CS 현황 */}
            <CsStatusSection />

            {/* 1. 미발송 */}
            <UnsentCard />

            {/* 2. 견적서 열람 고객 */}
            <ViewedCard />
          </div>

          {/* 우측 컬럼 */}
          <div className="space-y-5">
            {/* 3. 연락해야 할 곳 */}
            <FollowUpCard onCrmOpen={handleCrmOpen} />

            {/* 4. 오늘 일정 */}
            <TodaySchedule />
          </div>
        </div>

        {/* 견적서 불러오기 버튼 */}
        <div className="mt-6">
          <button
            onClick={() => setShowLoadModal(true)}
            className="w-full rounded-xl bg-gradient-to-r from-brand to-brand-dark py-4 text-base font-semibold text-white shadow-elevated hover:shadow-lg transition-all hover:scale-[1.005] active:scale-[0.995]"
            data-testid="load-estimate-btn"
          >
            견적서 불러오기
          </button>
        </div>

        {/* 푸터 */}
        <p className="mt-8 text-center text-xs text-ink-faint">방수명가 v4</p>
      </div>

      {/* 견적서 불러오기 모달 */}
      <LoadEstimateModal
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
      />

      {/* CRM 사이드패널 */}
      <CrmSidePanel crmId={selectedCrmId} onClose={handleCrmClose} />
    </div>
  )
}
