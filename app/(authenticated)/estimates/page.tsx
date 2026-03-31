import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import EstimateList from './estimate-list'

export default async function EstimatesPage() {
  const supabase = createClient()
  const isTestMode = process.env.TEST_MODE === 'true'

  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !isTestMode) redirect('/login')

  let companyId: string | null = null

  if (user) {
    const { data: ud } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()
    companyId = ud?.company_id ?? null
  }

  if (!companyId && isTestMode) {
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: firstCompany } = await svc.from('companies').select('id').limit(1).single()
    companyId = firstCompany?.id ?? null
  }

  const userData = companyId ? { company_id: companyId } : null
  if (!userData) redirect('/dashboard')

  // 견적서 목록 (최신순, 최대 100건) — TEST_MODE에서는 service client 사용
  const queryClient = isTestMode
    ? await (async () => {
        const { createClient: createServiceClient } = await import('@supabase/supabase-js')
        return createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        )
      })()
    : supabase

  const { data: estimates } = await queryClient
    .from('estimates')
    .select('id, mgmt_no, status, date, customer_name, site_name, m2, memo, created_at')
    .eq('company_id', userData.company_id)
    .order('created_at', { ascending: false })
    .limit(100)

  // 각 견적서의 총액 조회 (sheets grand_total 합산)
  const estimatesWithTotal = await Promise.all(
    (estimates ?? []).map(async (est) => {
      const { data: sheets } = await queryClient
        .from('estimate_sheets')
        .select('type, grand_total')
        .eq('estimate_id', est.id)

      const totalAmount = (sheets ?? []).reduce(
        (sum, s) => sum + Number(s.grand_total),
        0
      )
      const sheetTypes = (sheets ?? []).map((s) => s.type)

      return { ...est, totalAmount, sheetTypes }
    })
  )

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <EstimateList estimates={estimatesWithTotal} />
    </div>
  )
}
