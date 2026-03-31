import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * 새 견적서 생성 → /estimate/[id]로 리디렉트
 */
export default async function NewEstimatePage() {
  const supabase = createClient()

  // TEST_MODE: 인증 우회
  const isTestMode = process.env.TEST_MODE === 'true'

  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !isTestMode) redirect('/login')

  let companyId: string | null = null
  let managerName: string | null = null

  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('company_id, name')
      .eq('id', user.id)
      .single()
    companyId = userData?.company_id ?? null
    managerName = userData?.name ?? null
  }

  if (!companyId && isTestMode) {
    // TEST_MODE: 첫 번째 company 사용
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const { data: firstCompany } = await svc.from('companies').select('id').limit(1).single()
    companyId = firstCompany?.id ?? null
    managerName = '테스트'
  }

  if (!companyId) {
    redirect('/dashboard')
  }

  const userData = { company_id: companyId, name: managerName }

  // 관리번호 생성: BS-YYMMDD-XXXX
  const now = new Date()
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  const mgmtNo = `BS-${dateStr}-${random}`

  // 빈 estimate 생성 (TEST_MODE에서는 service client 사용)
  const insertClient = isTestMode
    ? await (async () => {
        const { createClient: createServiceClient } = await import('@supabase/supabase-js')
        return createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        )
      })()
    : supabase

  const { data: estimate, error } = await insertClient
    .from('estimates')
    .insert({
      company_id: userData.company_id,
      created_by: user?.id ?? null,
      mgmt_no: mgmtNo,
      status: 'draft',
      date: now.toISOString().slice(0, 10),
      manager_name: userData.name,
    })
    .select()
    .single()

  if (error || !estimate) {
    redirect('/dashboard')
  }

  redirect(`/estimate/${estimate.id}`)
}
