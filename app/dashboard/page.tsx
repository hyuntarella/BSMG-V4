import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import { fm } from '@/lib/utils/format'
import ViewTrackingCard from '@/components/dashboard/ViewTrackingCard'
import FollowUpCard from '@/components/dashboard/FollowUpCard'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('company_id, name, role')
    .eq('id', user.id)
    .single()

  // 최근 견적서 5개
  const { data: recentEstimates } = await supabase
    .from('estimates')
    .select('id, mgmt_no, status, date, customer_name, site_name')
    .eq('company_id', userData?.company_id ?? '')
    .order('created_at', { ascending: false })
    .limit(5)

  // 통계
  const { count: totalCount } = await supabase
    .from('estimates')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', userData?.company_id ?? '')

  const { count: sentCount } = await supabase
    .from('estimates')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', userData?.company_id ?? '')
    .in('status', ['sent', 'viewed'])

  // 열람한 견적서
  const { data: viewedEstimates } = await supabase
    .from('estimates')
    .select('id, customer_name, email_viewed_at')
    .eq('company_id', userData?.company_id ?? '')
    .not('email_viewed_at', 'is', null)
    .order('email_viewed_at', { ascending: false })
    .limit(10)

  // 발송 후 경과 견적서 (후속 관리)
  const { data: sentEstimates } = await supabase
    .from('estimates')
    .select('id, customer_name, email_sent_at')
    .eq('company_id', userData?.company_id ?? '')
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

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* 인사 */}
        <div className="mb-6">
          <h1 className="text-xl font-bold">
            안녕하세요{userData?.name ? `, ${userData.name}님` : ''}
          </h1>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>

        {/* 통계 카드 */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <StatCard label="전체 견적서" value={totalCount ?? 0} />
          <StatCard label="발송 완료" value={sentCount ?? 0} />
          <StatCard label="이번 달" value="-" />
        </div>

        {/* 빠른 작업 */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <Link
            href="/estimate/new"
            className="flex items-center gap-3 rounded-lg border-2 border-brand/20 bg-white p-4 transition hover:border-brand hover:shadow-md"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-lg text-white">
              +
            </span>
            <div>
              <p className="font-semibold">새 견적서</p>
              <p className="text-xs text-gray-500">음성으로 바로 작성</p>
            </div>
          </Link>
          <Link
            href="/estimates"
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 transition hover:shadow-md"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-lg">
              📋
            </span>
            <div>
              <p className="font-semibold">견적서 목록</p>
              <p className="text-xs text-gray-500">저장된 견적서 조회</p>
            </div>
          </Link>
        </div>

        {/* 열람 추적 + 후속 관리 */}
        <div className="mb-6 space-y-4">
          <ViewTrackingCard estimates={(viewedEstimates ?? []).map(e => ({
            ...e, customer_name: e.customer_name ?? '', email_viewed_at: e.email_viewed_at ?? '',
          }))} />
          <FollowUpCard estimates={followUpData} />
        </div>

        {/* 최근 견적서 */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">최근 견적서</h2>
            <Link href="/estimates" className="text-xs text-brand hover:underline">
              전체 보기
            </Link>
          </div>

          {!recentEstimates || recentEstimates.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white py-8 text-center text-sm text-gray-400">
              아직 견적서가 없습니다
            </div>
          ) : (
            <div className="space-y-2">
              {recentEstimates.map((est) => (
                <Link
                  key={est.id}
                  href={`/estimate/${est.id}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 transition hover:border-brand/30 hover:shadow-sm"
                >
                  <div>
                    <span className="text-sm font-medium">
                      {est.customer_name || '(고객명 없음)'}
                    </span>
                    <span className="ml-2 text-xs text-gray-400">
                      {est.site_name || ''}
                    </span>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={est.status} />
                    <p className="text-[10px] text-gray-400">{est.date}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
      <p className="text-xl font-bold tabular-nums text-brand">
        {typeof value === 'number' ? fm(value) : value}
      </p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    draft: { label: '작성중', color: 'bg-gray-100 text-gray-600' },
    saved: { label: '저장됨', color: 'bg-blue-100 text-blue-700' },
    sent: { label: '발송됨', color: 'bg-green-100 text-green-700' },
    viewed: { label: '열람됨', color: 'bg-purple-100 text-purple-700' },
  }
  const info = map[status] ?? map.draft
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${info.color}`}>
      {info.label}
    </span>
  )
}
