import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import ViewTrackingCard from '@/components/dashboard/ViewTrackingCard'
import FollowUpCard from '@/components/dashboard/FollowUpCard'
import CsStatusSection from '@/components/dashboard/CsStatusSection'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('company_id, name')
    .eq('id', user.id)
    .single()

  const companyId = userData?.company_id ?? ''

  // 열람한 견적서
  const { data: viewedEstimates } = await supabase
    .from('estimates')
    .select('id, customer_name, email_viewed_at')
    .eq('company_id', companyId)
    .not('email_viewed_at', 'is', null)
    .order('email_viewed_at', { ascending: false })
    .limit(10)

  // 발송 후 미열람 견적서 (후속 관리)
  const { data: sentEstimates } = await supabase
    .from('estimates')
    .select('id, customer_name, email_sent_at')
    .eq('company_id', companyId)
    .not('email_sent_at', 'is', null)
    .is('email_viewed_at', null)
    .order('email_sent_at', { ascending: true })
    .limit(20)

  const now = Date.now()
  const followUpData = (sentEstimates ?? []).map(e => ({
    ...e,
    customer_name: e.customer_name ?? '',
    email_sent_at: e.email_sent_at ?? '',
    daysSinceSent: Math.floor((now - new Date(e.email_sent_at).getTime()) / (1000 * 60 * 60 * 24)),
  })).filter(e => e.daysSinceSent >= 3)

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

          {/* 2. 견적서 열람 고객 */}
          <ViewTrackingCard estimates={(viewedEstimates ?? []).map(e => ({
            ...e,
            customer_name: e.customer_name ?? '',
            email_viewed_at: e.email_viewed_at ?? '',
          }))} />

          {/* 3. 연락해야 할 곳 */}
          <FollowUpCard estimates={followUpData} />

          {/* 미발송 섹션 — Phase 30 */}
          {/* 열람 고객 섹션 — Phase 31 */}
          {/* 연락해야 할 곳 섹션 — Phase 32 */}
          {/* 오늘 일정 + 견적서 불러오기 — Phase 33 */}
        </div>
      </div>
    </div>
  )
}
