import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// .env.local 로딩
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
  } catch { /* .env.local 없으면 무시 */ }
}
loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // 1. "사무실" 이벤트 조회
  const { data, error } = await supabase
    .from('calendar_events')
    .select('id, title, start_at, member_name')
    .eq('title', '사무실');

  if (error) { console.error('조회 실패:', error); process.exit(1); }
  console.log(`"사무실" 이벤트: ${data.length}건`);
  data.forEach(e => console.log(`  ${e.start_at} | ${e.member_name} | ${e.title}`));

  if (data.length === 0) { console.log('삭제할 이벤트 없음'); return; }

  // 2. 삭제
  const ids = data.map(e => e.id);
  const { error: delErr } = await supabase
    .from('calendar_events')
    .delete()
    .in('id', ids);

  if (delErr) { console.error('삭제 실패:', delErr); process.exit(1); }
  console.log(`${ids.length}건 삭제 완료`);

  // 3. 전수 확인
  const { count } = await supabase
    .from('calendar_events')
    .select('*', { count: 'exact', head: true });
  console.log(`남은 이벤트: ${count}건`);
}

main().catch(e => { console.error(e); process.exit(1); });
