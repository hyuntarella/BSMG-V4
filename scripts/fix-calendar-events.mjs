// scripts/fix-calendar-events.mjs
// 실행: node scripts/fix-calendar-events.mjs
// calendar_events의 이상 데이터 정리 + type 재분류

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

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
  console.error('환경변수 누락');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// type 분류 키워드
const TYPE_KEYWORDS = {
  '방문': ['방문', '현장', '견적', '실측', '답사'],
  '시공': ['시공', '공사', '작업', '도장', '방수', '우레탄', '복합', '하도', '상도', '프라이머', '철거', '뿜칠'],
  '미팅': ['미팅', '회의', '상담', '협의', '면담'],
  '하자': ['하자', '보수', 'A/S', 'as'],
};

// 색상 매핑
const TYPE_COLORS = {
  '방문': '#3B82F6',
  '시공': '#10B981',
  '미팅': '#8B5CF6',
  '하자': '#EF4444',
  '내부': '#9CA3AF',
  '기타': '#6B7280',
};

// 의미 없는 이벤트 제목
const MEANINGLESS_TITLES = ['사무실', '사무실 정리', '개인', '휴가', '점심', '쉬는날'];

function classifyType(title, memo) {
  const text = `${title ?? ''} ${memo ?? ''}`.toLowerCase();

  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) return type;
    }
  }
  return null; // 분류 불가 시 null 반환 (기존 유지)
}

async function run() {
  // 1. 전체 이벤트 조회
  const { data: events, error } = await supabase
    .from('calendar_events')
    .select('id, title, type, memo, start_at')
    .order('start_at', { ascending: false });

  if (error) {
    console.error('조회 오류:', error.message);
    process.exit(1);
  }

  console.log(`총 ${events.length}건 이벤트\n`);

  let meaninglessCount = 0;
  let reclassifiedCount = 0;

  // 2. 의미 없는 이벤트 → type='내부' 변경
  for (const ev of events) {
    const titleLower = (ev.title ?? '').trim();
    if (MEANINGLESS_TITLES.some(t => titleLower === t || titleLower.startsWith(t))) {
      const { error: updateErr } = await supabase
        .from('calendar_events')
        .update({ type: '내부', color: TYPE_COLORS['내부'] })
        .eq('id', ev.id);
      if (!updateErr) {
        console.log(`[내부] "${ev.title}" → type='내부'`);
        meaninglessCount++;
      }
    }
  }

  // 3. type이 '기타'인 이벤트 → 제목 기반 재분류
  for (const ev of events) {
    if (ev.type === '기타' || !ev.type) {
      const newType = classifyType(ev.title, ev.memo);
      if (newType) {
        const { error: updateErr } = await supabase
          .from('calendar_events')
          .update({ type: newType, color: TYPE_COLORS[newType] ?? TYPE_COLORS['기타'] })
          .eq('id', ev.id);
        if (!updateErr) {
          console.log(`[재분류] "${ev.title}" → type='${newType}'`);
          reclassifiedCount++;
        }
      }
    }
  }

  // 4. 최종 통계
  const { data: finalEvents } = await supabase
    .from('calendar_events')
    .select('type');

  const stats = {};
  for (const ev of finalEvents ?? []) {
    const type = ev.type ?? '미분류';
    stats[type] = (stats[type] ?? 0) + 1;
  }

  console.log(`\n=== 결과 ===`);
  console.log(`의미 없는 이벤트 → '내부': ${meaninglessCount}건`);
  console.log(`재분류: ${reclassifiedCount}건`);
  console.log(`\ntype 분포:`);
  for (const [type, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}건`);
  }
}

run().catch(console.error);
