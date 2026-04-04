// scripts/run-migration-006.mjs
// inquiries 테이블 생성 — PostgreSQL 직접 연결
import pg from 'pg';
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

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF = SUPABASE_URL.replace('https://', '').split('.')[0];

const sql = readFileSync('supabase/migrations/006_create_inquiries.sql', 'utf-8');

async function run() {
  console.log('=== inquiries 테이블 마이그레이션 시작 ===');
  console.log(`프로젝트: ${PROJECT_REF}`);

  let client = null;

  // Session mode pooler (포트 5432) — 여러 리전 시도
  const regions = ['ap-northeast-2', 'ap-southeast-1', 'us-east-1', 'us-west-1', 'eu-west-1', 'eu-central-1', 'ap-northeast-1', 'ap-south-1'];

  for (const region of regions) {
    const connStr = `postgresql://postgres.${PROJECT_REF}:${SERVICE_KEY}@aws-0-${region}.pooler.supabase.com:5432/postgres`;
    try {
      console.log(`리전 ${region} 시도...`);
      client = new pg.Client({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 8000,
      });
      await client.connect();
      console.log(`연결 성공 (${region})`);
      break;
    } catch (e) {
      console.log(`  실패: ${e.message.slice(0, 60)}`);
      try { await client?.end(); } catch {}
      client = null;
    }
  }

  // 직접 DB 연결도 시도 (6543 포트 = transaction mode)
  if (!client) {
    for (const region of regions) {
      const connStr = `postgresql://postgres.${PROJECT_REF}:${SERVICE_KEY}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
      try {
        console.log(`리전 ${region} (6543) 시도...`);
        client = new pg.Client({
          connectionString: connStr,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 8000,
        });
        await client.connect();
        console.log(`연결 성공 (${region}:6543)`);
        break;
      } catch (e) {
        console.log(`  실패: ${e.message.slice(0, 60)}`);
        try { await client?.end(); } catch {}
        client = null;
      }
    }
  }

  // 직접 DB 연결
  if (!client) {
    try {
      const directStr = `postgresql://postgres:${SERVICE_KEY}@db.${PROJECT_REF}.supabase.co:5432/postgres`;
      console.log('직접 연결 시도 (db.*.supabase.co)...');
      client = new pg.Client({
        connectionString: directStr,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 8000,
      });
      await client.connect();
      console.log('직접 연결 성공');
    } catch (e) {
      console.log(`직접 연결 실패: ${e.message.slice(0, 60)}`);
      try { await client?.end(); } catch {}
      client = null;
    }
  }

  if (!client) {
    console.error('\n모든 연결 방식 실패.');
    console.log('Supabase 대시보드에서 SQL을 직접 실행해주세요:');
    console.log(`https://supabase.com/dashboard/project/${PROJECT_REF}/sql`);
    process.exit(1);
  }

  try {
    await client.query(sql);
    console.log('SQL 실행 완료');

    const result = await client.query('SELECT count(*) FROM inquiries');
    console.log(`\n=== inquiries 테이블 생성 완료 === (${result.rows[0].count}건)`);
  } catch (e) {
    console.error('SQL 실행 오류:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error('마이그레이션 오류:', err);
  process.exit(1);
});
