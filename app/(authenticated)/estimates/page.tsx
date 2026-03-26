import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import EstimateList from './estimate-list'

export default async function EstimatesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData) redirect('/dashboard')

  // 견적서 목록 (최신순, 최대 100건)
  const { data: estimates } = await supabase
    .from('estimates')
    .select('id, mgmt_no, status, date, customer_name, site_name, m2, memo, created_at')
    .eq('company_id', userData.company_id)
    .order('created_at', { ascending: false })
    .limit(100)

  // 각 견적서의 총액 조회 (sheets grand_total 합산)
  const estimatesWithTotal = await Promise.all(
    (estimates ?? []).map(async (est) => {
      const { data: sheets } = await supabase
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
