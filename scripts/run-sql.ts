/**
 * Supabase SQL 실행 헬퍼 — service role key로 DDL 실행
 * 실행: npx tsx scripts/run-sql.ts <sql-file-path>
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// .env.local 로딩
function loadEnvLocal() {
  try {
    const envPath = resolve(process.cwd(), '.env.local');
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* ignore */ }
}

loadEnvLocal();

async function main() {
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error('사용법: npx tsx scripts/run-sql.ts <sql-file-path>');
    process.exit(1);
  }

  const sql = readFileSync(resolve(process.cwd(), sqlFile), 'utf-8');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase 환경변수 필요');

  // Supabase REST SQL endpoint
  const endpoint = `${url}/rest/v1/rpc`;

  // 방법 1: pg_query가 있으면 사용
  console.log('SQL 실행 시도 중...');

  // Supabase에는 직접 SQL 실행 REST endpoint가 없음
  // Management API 시도: POST /v1/projects/{ref}/query
  const urlParts = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!urlParts) throw new Error('Supabase URL 파싱 실패');
  const projectRef = urlParts[1];

  const mgmtRes = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (mgmtRes.ok) {
    const result = await mgmtRes.json();
    console.log('✅ SQL 실행 성공');
    console.log(JSON.stringify(result).slice(0, 500));
    return;
  }

  // Management API 실패 시 — 직접 PostgreSQL 연결 또는 수동 실행 안내
  const errText = await mgmtRes.text();
  console.error(`Management API 실패 [${mgmtRes.status}]: ${errText.slice(0, 300)}`);
  console.log('\n⚠ SQL 자동 실행 불가. Supabase 대시보드에서 수동 실행 필요:');
  console.log(`  파일: ${sqlFile}`);
  console.log('  방법: Supabase Dashboard → SQL Editor → 붙여넣기 → Run');
}

main().catch((err) => {
  console.error('오류:', err);
  process.exit(1);
});
