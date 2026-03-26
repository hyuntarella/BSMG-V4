import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * 새 견적서 생성 → /estimate/[id]로 리디렉트
 */
export default async function NewEstimatePage() {
  const supabase = createClient()

  // 현재 유저 정보
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 유저의 company_id 조회
  const { data: userData } = await supabase
    .from('users')
    .select('company_id, name')
    .eq('id', user.id)
    .single()

  if (!userData?.company_id) {
    redirect('/dashboard')
  }

  // 관리번호 생성: BS-YYMMDD-XXXX
  const now = new Date()
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  const mgmtNo = `BS-${dateStr}-${random}`

  // 빈 estimate 생성
  const { data: estimate, error } = await supabase
    .from('estimates')
    .insert({
      company_id: userData.company_id,
      created_by: user.id,
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
