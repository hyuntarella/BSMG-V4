import { redirect } from 'next/navigation'

/**
 * /estimates 접속 시 바로 새 견적서 생성 → /estimate/[id]로 리디렉트
 * 기존 견적서 목록은 불러오기 모달로 접근
 */
export default async function EstimatesPage() {
  redirect('/estimate/new')
}
