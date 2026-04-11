/**
 * 013_remove_equipment_from_base.sql 마이그레이션을 supabase-js로 실행.
 *
 * 프로젝트가 supabase CLI에 링크되지 않은 상태라 `supabase db push`를 못 쓰므로
 * SERVICE_ROLE_KEY로 REST DELETE를 호출해서 동일 효과를 낸다.
 *
 * 실행: npx tsx supabase/run-migration-013.ts
 *
 * 경고: estimate_items + price_matrix 전량 삭제. 테스트 데이터 전용.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('환경변수 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log('🗑️  013 마이그레이션 적용 중...')

  // 1) estimate_items 전량 삭제
  const { error: itemsErr, count: itemsCount } = await supabase
    .from('estimate_items')
    .delete({ count: 'exact' })
    .not('id', 'is', null)
  if (itemsErr) {
    console.error('estimate_items 삭제 실패:', itemsErr)
    process.exit(1)
  }
  console.log(`✅ estimate_items 삭제: ${itemsCount ?? '?'} rows`)

  // 2) price_matrix 전량 삭제
  const { error: pmErr, count: pmCount } = await supabase
    .from('price_matrix')
    .delete({ count: 'exact' })
    .not('id', 'is', null)
  if (pmErr) {
    console.error('price_matrix 삭제 실패:', pmErr)
    process.exit(1)
  }
  console.log(`✅ price_matrix 삭제: ${pmCount ?? '?'} rows`)

  console.log('🎉 013 마이그레이션 완료. 이제 seed.ts로 재주입.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
