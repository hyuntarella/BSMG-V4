// scripts/fix-pipeline-v2.mjs
// 실행: node scripts/fix-pipeline-v2.mjs
// DB pipeline 값을 새 STAGE_MAP에 맞춰 UPDATE

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// .env.local 로딩
function loadEnv() {
  try {
    const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {}
}
loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('환경변수 누락: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// 기존값 → 새값 매핑
const PIPELINE_MAPPING = [
  ['정보입력완료', '정보입력단계'],
  ['시간좀걸림', '견적오래걸림'],
  ['먼저연락X', '연락대기'],
  ['성공확률↓', '성공확률50▼'],
  ['성공확률↑', '성공확률50▲'],
  ['대기3', '대기2'],
  ['보수일정조율중', '보수일정조율'],
];

// 새 STAGE_MAP 내 모든 유효 pipeline 값
const VALID_PIPELINES = [
  '정보입력단계', '견적일정확정', '견적방문완료', '견적오래걸림', '보류',
  '가견적전송', '견적서전송', '연락대기', '성공확률50▼', '성공확률50▲',
  '대기1', '대기2', '재연락금지', '한달이상걸림', '내년공사희망',
  '계약중', '착수금완료', '공사중', '잔금대기', '잔금완료', '정산완료',
  '하자접수', '보수일정조율', '보수중', '보수완료',
];

// stage 매핑
const PIPELINE_TO_STAGE = {};
const STAGE_MAP = {
  '0.문의': ['정보입력단계', '견적일정확정', '견적방문완료', '견적오래걸림', '보류'],
  '1.영업': ['가견적전송', '견적서전송', '연락대기', '성공확률50▼', '성공확률50▲'],
  '1-1.장기': ['대기1', '대기2', '재연락금지', '한달이상걸림', '내년공사희망'],
  '2.시공': ['계약중', '착수금완료', '공사중', '잔금대기', '잔금완료', '정산완료'],
  '3.하자': ['하자접수', '보수일정조율', '보수중', '보수완료'],
};
for (const [stage, pipelines] of Object.entries(STAGE_MAP)) {
  for (const p of pipelines) {
    PIPELINE_TO_STAGE[p] = stage;
  }
}

async function run() {
  let totalUpdated = 0;

  // 1. 매핑에 따라 pipeline 값 업데이트
  for (const [oldVal, newVal] of PIPELINE_MAPPING) {
    const { data, error } = await supabase
      .from('crm_customers')
      .update({ pipeline: newVal, stage: PIPELINE_TO_STAGE[newVal] })
      .eq('pipeline', oldVal)
      .select('id');

    if (error) {
      console.error(`오류: ${oldVal} → ${newVal}:`, error.message);
    } else {
      const count = data?.length ?? 0;
      if (count > 0) {
        console.log(`${oldVal} → ${newVal}: ${count}건 업데이트`);
        totalUpdated += count;
      }
    }
  }

  // 2. 유효하지 않은 pipeline 값 확인 (orphan)
  const { data: allRecords, error: fetchError } = await supabase
    .from('crm_customers')
    .select('id, address, pipeline, stage');

  if (fetchError) {
    console.error('전체 조회 오류:', fetchError.message);
  } else {
    const orphans = (allRecords ?? []).filter(
      (r) => r.pipeline && !VALID_PIPELINES.includes(r.pipeline)
    );

    if (orphans.length > 0) {
      console.warn(`\n⚠️ orphan pipeline 값 ${orphans.length}건:`);
      for (const o of orphans) {
        console.warn(`  - ${o.address}: "${o.pipeline}"`);
      }
    } else {
      console.log('\n✅ orphan pipeline 값: 0건');
    }

    // 3. stage가 비어있는 레코드의 stage 복구
    const missingStage = (allRecords ?? []).filter(
      (r) => r.pipeline && PIPELINE_TO_STAGE[r.pipeline] && !r.stage
    );
    for (const r of missingStage) {
      await supabase
        .from('crm_customers')
        .update({ stage: PIPELINE_TO_STAGE[r.pipeline] })
        .eq('id', r.id);
    }
    if (missingStage.length > 0) {
      console.log(`stage 복구: ${missingStage.length}건`);
      totalUpdated += missingStage.length;
    }
  }

  console.log(`\n총 ${totalUpdated}건 업데이트 완료`);
}

run().catch(console.error);
