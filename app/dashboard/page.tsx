'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import FollowUpCard from '@/components/dashboard/FollowUpCard'
import CsStatusSection from '@/components/dashboard/CsStatusSection'
import UnsentCard from '@/components/dashboard/UnsentCard'
import ViewedCard from '@/components/dashboard/ViewedCard'
import TodaySchedule from '@/components/dashboard/TodaySchedule'
import LoadEstimateModal from '@/components/estimate/LoadEstimateModal'

export default function DashboardPage() {
  const [showLoadModal, setShowLoadModal] = useState(false)

  return (
    <div className="min-h-screen bg-bg">
      <Header />

      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* 인사 */}
        <h1 className="mb-6 text-lg font-bold">안녕하세요</h1>

        <div className="space-y-5">
          {/* 0. CS 현황 */}
          <CsStatusSection />

          {/* 1. 미발송 */}
          <UnsentCard />

          {/* 2. 견적서 열람 고객 */}
          <ViewedCard />

          {/* 3. 연락해야 할 곳 */}
          <FollowUpCard />

          {/* 4. 오늘 일정 — Phase 33 */}
          <div className="mt-6">
            <TodaySchedule />
          </div>

          {/* 견적서 불러오기 버튼 */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setShowLoadModal(true)}
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark transition"
              data-testid="load-estimate-btn"
            >
              견적서 불러오기
            </button>
          </div>
        </div>
      </div>

      {/* 견적서 불러오기 모달 */}
      <LoadEstimateModal
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
      />
    </div>
  )
}
