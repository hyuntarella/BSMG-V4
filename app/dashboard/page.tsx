import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import FollowUpCard from '@/components/dashboard/FollowUpCard'
import CsStatusSection from '@/components/dashboard/CsStatusSection'
import UnsentCard from '@/components/dashboard/UnsentCard'
import ViewedCard from '@/components/dashboard/ViewedCard'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('company_id, name')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-bg">
      <Header />

      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* 인사 */}
        <h1 className="mb-6 text-lg font-bold">
          안녕하세요{userData?.name ? `, ${userData.name}님` : ''}
        </h1>

        <div className="space-y-5">
          {/* 0. CS 현황 (정보 입력 완료) */}
          <CsStatusSection />

          {/* 1. 오늘 할 일 */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">오늘 할 일</h3>
            <div className="rounded-lg border border-dashed border-gray-200 bg-white py-6 text-center">
              <p className="text-xs text-gray-400">Notion 캘린더 연동 시 오늘 일정이 표시됩니다</p>
            </div>
          </div>

          {/* 2. 견적서 열람 고객 (Phase 31) */}
          <ViewedCard />

          {/* 3. 연락해야 할 곳 (Notion CRM 견적서전송 파이프라인) */}
          <FollowUpCard />

          {/* 미발송 섹션 */}
          <div className="mt-6">
            <UnsentCard />
          </div>

          {/* 연락해야 할 곳 섹션 — Phase 32 */}
          {/* 오늘 일정 + 견적서 불러오기 — Phase 33 */}
        </div>
      </div>
    </div>
  )
}
