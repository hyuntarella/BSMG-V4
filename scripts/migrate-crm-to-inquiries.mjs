// scripts/migrate-crm-to-inquiries.mjs
// crm_customers 71건 → inquiries 테이블 변환
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// .env.local 수동 파싱
const envContent = readFileSync('.env.local', 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// ── 파이프라인 매핑 ──
const PIPELINE_MAP = {
  '정보입력단계': '문의접수',
  '견적일정확정': '문의접수',
  '견적방문완료': '문의접수',
  '견적오래걸림': '한달이상걸림',
  '보류': '한달이상걸림',
  '가견적전송': '견적서전송',
  '견적서전송': '견적서전송',
  '연락대기': '연락대기',
  '성공확률50▼': '연락대기',
  '성공확률50▲': '견적서전송',
  '대기1': '한달이상걸림',
  '대기2': '한달이상걸림',
  '재연락금지': '한달이상걸림', // contract_status = 'Lost'
  '한달이상걸림': '한달이상걸림',
  '내년공사희망': '한달이상걸림',
  '계약중': '계약중',
  '착수금완료': '착수금완료',
  '공사중': '공사중',
  '잔금대기': '잔금대기',
  '잔금완료': '잔금완료',
  '정산완료': '정산완료',
  '하자접수': '보수완료',
  '보수일정조율': '보수완료',
  '보수중': '보수완료',
  '보수완료': '보수완료',
  '신규문의': '문의접수',
};

// 계약 완료로 간주되는 파이프라인
const WON_PIPELINES = ['잔금완료', '정산완료', '하자접수', '보수일정조율', '보수중', '보수완료'];

// 채널 매핑 (crm_customers의 inquiry_channel → InquiryChannel)
const CHANNEL_MAP = {
  '네이버': 'naver_powerlink',
  '네이버 - 폼': 'naver_powerlink',
  'naver_form': 'naver_powerlink',
  '전화': 'naver_phone',
  '네이버 - 전화': 'naver_phone',
  'naver_phone': 'naver_phone',
  '소개': 'referral',
  '소개/재시공': 'referral',
  '숨고': 'soomgo',
  'soomgo': 'soomgo',
  '기타': 'etc',
  'etc': 'etc',
};

function parseArea(area) {
  if (!area) return null;
  const num = parseFloat(area.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? null : num;
}

function mapContractStatus(crm) {
  if (crm.contract_status === '계약성공') return 'Won';
  if (crm.contract_status === '계약실패') return 'Lost';
  if (crm.pipeline === '재연락금지') return 'Lost';
  if (WON_PIPELINES.includes(crm.pipeline)) return 'Won';
  return '진행중';
}

async function run() {
  console.log('=== crm_customers → inquiries 마이그레이션 시작 ===');

  // 1. crm_customers 전체 조회
  const { data: customers, error: fetchErr } = await supabase
    .from('crm_customers')
    .select('*')
    .order('created_at', { ascending: true });

  if (fetchErr) {
    console.error('crm_customers 조회 실패:', fetchErr.message);
    process.exit(1);
  }

  console.log(`crm_customers: ${customers.length}건`);

  // 2. 변환
  const inquiries = customers.map((c) => ({
    address: c.address || '주소 없음',
    client_name: c.customer_name || null,
    phone: c.phone || null,
    channel: CHANNEL_MAP[c.inquiry_channel] || 'etc',
    work_type: '기타', // crm_customers에 work_type enum 없음
    manager: c.manager || null,
    estimate_amount: c.estimate_amount ? Number(c.estimate_amount) : null,
    contract_amount: c.contract_amount ? Number(c.contract_amount) : null,
    area_sqm: parseArea(c.area),
    memo: c.memo || null,
    pipeline_stage: PIPELINE_MAP[c.pipeline] || '문의접수',
    contract_status: mapContractStatus(c),
    proposal_sent: false,
    ir_inspection: false,
    case_documented: false,
    drive_url: c.drive_url || null,
    estimate_web_url: c.estimate_web_url || null,
    legacy_crm_id: c.id,
    created_at: c.inquiry_date ? new Date(c.inquiry_date).toISOString() : c.created_at,
  }));

  console.log(`변환 완료: ${inquiries.length}건`);

  // 3. inquiries 테이블에 삽입 (배치)
  const BATCH = 50;
  let inserted = 0;

  for (let i = 0; i < inquiries.length; i += BATCH) {
    const batch = inquiries.slice(i, i + BATCH);
    const { error: insertErr } = await supabase
      .from('inquiries')
      .insert(batch);

    if (insertErr) {
      console.error(`배치 ${i}~${i + batch.length} 삽입 실패:`, insertErr.message);
      // 개별 삽입 시도
      for (const inq of batch) {
        const { error: singleErr } = await supabase.from('inquiries').insert(inq);
        if (singleErr) {
          console.error(`  개별 실패 (${inq.address}):`, singleErr.message);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
    }
  }

  console.log(`삽입 완료: ${inserted}/${inquiries.length}건`);

  // 4. 검증
  const { data: result, error: verifyErr } = await supabase
    .from('inquiries')
    .select('pipeline_stage')
    .not('legacy_crm_id', 'is', null);

  if (verifyErr) {
    console.error('검증 실패:', verifyErr.message);
    process.exit(1);
  }

  console.log(`\n=== 마이그레이션 완료 ===`);
  console.log(`inquiries 테이블 (마이그레이션된 건): ${result.length}건`);

  // 파이프라인별 집계
  const stageCounts = {};
  for (const r of result) {
    stageCounts[r.pipeline_stage] = (stageCounts[r.pipeline_stage] || 0) + 1;
  }
  console.log('\n파이프라인별 분포:');
  for (const [stage, count] of Object.entries(stageCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${stage}: ${count}건`);
  }
}

run().catch((err) => {
  console.error('마이그레이션 오류:', err);
  process.exit(1);
});
