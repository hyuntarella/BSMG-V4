import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  try {
    const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    for (const line of content.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
        v = v.slice(1, -1);
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {}
}
loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// PIPELINE_TO_STAGE 매핑 (crm-types.ts와 동일)
const STAGE_MAP = {
  '0.문의': ['정보입력단계', '견적일정확정', '견적방문완료', '견적오래걸림', '보류'],
  '1.영업': ['가견적전송', '견적서전송', '연락대기', '성공확률50▼', '성공확률50▲'],
  '1-1.장기': ['대기1', '대기2', '재연락금지', '한달이상걸림', '내년공사희망'],
  '2.시공': ['계약중', '착수금완료', '공사중', '잔금대기', '잔금완료', '정산완료'],
  '3.하자': ['하자접수', '보수일정조율', '보수중', '보수완료'],
};

const PIPELINE_TO_STAGE = {};
for (const [stage, pipelines] of Object.entries(STAGE_MAP)) {
  for (const p of pipelines) {
    PIPELINE_TO_STAGE[p] = stage;
  }
}

async function main() {
  console.log('=== Stage 재계산 시작 ===\n');

  // 1. 모든 레코드 조회
  const { data, error } = await supabase
    .from('crm_customers')
    .select('id, pipeline, stage');

  if (error) { console.error('조회 실패:', error); process.exit(1); }
  console.log(`총 레코드: ${data.length}건`);

  // 2. stage 재계산 + 업데이트 필요한 건 찾기
  let updated = 0;
  for (const row of data) {
    const correctStage = PIPELINE_TO_STAGE[row.pipeline] ?? null;
    if (correctStage && correctStage !== row.stage) {
      const { error: upErr } = await supabase
        .from('crm_customers')
        .update({ stage: correctStage })
        .eq('id', row.id);

      if (upErr) {
        console.error(`  실패 [${row.id}]: ${upErr.message}`);
      } else {
        console.log(`  ${row.pipeline.padEnd(15)} ${(row.stage || '(null)').padEnd(20)} → ${correctStage}`);
        updated++;
      }
    }
  }

  console.log(`\n${updated}건 stage 업데이트 완료`);

  // 3. 검증: stage 분포 확인
  const { data: verify } = await supabase
    .from('crm_customers')
    .select('stage');
  const counts = {};
  verify.forEach(r => { const k = r.stage || '(null)'; counts[k] = (counts[k]||0)+1; });
  console.log('\n=== 수정 후 Stage 분포 ===');
  Object.entries(counts).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k.padEnd(15)} ${v}`));
}

main().catch(e => { console.error(e); process.exit(1); });
