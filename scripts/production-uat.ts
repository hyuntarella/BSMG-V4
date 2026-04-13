/**
 * Phase 4.5 프로덕션 UAT 자동화 스크립트
 *
 * 흐름:
 *   1. .env.local 에서 자격증명 로드
 *   2. Supabase service client 로 테스트 견적서/시트/11아이템 INSERT
 *   3. POST {PREVIEW_URL}/api/estimates/{id}/save-all 호출
 *   4. 응답의 compositePdfUrl → 파일 ID 추출 → Drive API 로 PDF 다운로드
 *   5. /tmp/uat-production.pdf 저장
 *   6. pdfinfo 로 페이지 수 출력 (있으면)
 *   7. cleanup: Drive 파일 5종 삭제 + Supabase 견적서/시트/아이템 삭제
 *
 * 실행:
 *   PREVIEW_URL=https://bsmg-v5-xxx.vercel.app npx tsx scripts/production-uat.ts
 *
 * 환경변수:
 *   PREVIEW_URL              (필수) 프리뷰 URL (https://...)
 *   TEST_DRIVE_FOLDER_ID     (선택) 테스트 전용 Drive 폴더. 미지정 시 GOOGLE_DRIVE_FOLDER_ID 사용
 *                             + 즉시 cleanup 으로 격리.
 *   KEEP_ARTIFACTS=1         (선택) cleanup 스킵 (디버깅용)
 *
 * 출력:
 *   /tmp/uat-production.pdf
 *   stdout: estimateId, fileIds, pageCount
 *
 * 주의:
 *   - 실제 프로덕션 Supabase 와 Drive 를 건드림. cleanup 실패 시 수동 삭제 필요.
 *   - 본 스크립트는 PM 승인 후에만 실행한다.
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { execSync } from 'child_process'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { Readable } from 'stream'

// ── .env.local 인라인 로드 (dotenv 미설치 회피) ──
function loadEnvLocal() {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local')
    const content = fs.readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i === -1) continue
      const k = t.slice(0, i).trim()
      let v = t.slice(i + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      if (!process.env[k]) process.env[k] = v
    }
  } catch {}
}
loadEnvLocal()

// ── 환경변수 ──
const PREVIEW_URL = (process.env.PREVIEW_URL || '').replace(/\/$/, '')
const VERCEL_SHARE = process.env.VERCEL_SHARE || ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const GSA_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || ''
const GSA_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/^["']|["']$/g, '').trim()
const DEFAULT_FOLDER = process.env.GOOGLE_DRIVE_FOLDER_ID || ''
const TEST_FOLDER = process.env.TEST_DRIVE_FOLDER_ID || ''
const TARGET_FOLDER = TEST_FOLDER || DEFAULT_FOLDER
const KEEP_ARTIFACTS = process.env.KEEP_ARTIFACTS === '1'

if (!PREVIEW_URL) die('PREVIEW_URL 환경변수 필요 (예: https://bsmg-v5-xxx.vercel.app)')
if (!SUPABASE_URL || !SERVICE_ROLE) die('NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 필요')
if (!GSA_EMAIL || !GSA_KEY) die('GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY 필요')
if (!TARGET_FOLDER) die('GOOGLE_DRIVE_FOLDER_ID 또는 TEST_DRIVE_FOLDER_ID 필요')

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

const auth = new google.auth.JWT({
  email: GSA_EMAIL,
  key: GSA_KEY,
  scopes: ['https://www.googleapis.com/auth/drive'],
})
const drive = google.drive({ version: 'v3', auth })

// TAG: ms epoch + 8-char crypto hex → 동일 ms 내 동시 실행 시에도 충돌 방지
const TAG = `uat-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
console.log(`[uat] tag=${TAG}`)
console.log(`[uat] preview=${PREVIEW_URL}`)
console.log(`[uat] folder=${TARGET_FOLDER}${TEST_FOLDER ? ' (TEST)' : ' (DEFAULT)'}`)

function die(msg: string): never {
  console.error(`[uat] FATAL: ${msg}`)
  process.exit(1)
}

// ── 11 아이템 (sample-2 와 동일 구성) ──
function buildItems() {
  const mk = (overrides: Partial<{
    name: string; spec: string; unit: string; qty: number; mat: number; labor: number; exp: number;
    is_base: boolean; is_equipment: boolean; is_fixed_qty: boolean;
  }>) => {
    const base = {
      name: '기본', spec: '3.8mm', unit: 'm²', qty: 100, mat: 15000, labor: 8000, exp: 2000,
      is_base: true, is_equipment: false, is_fixed_qty: false,
      ...overrides,
    }
    const mat_amount = base.qty * base.mat
    const labor_amount = base.qty * base.labor
    const exp_amount = base.qty * base.exp
    return { ...base, mat_amount, labor_amount, exp_amount, total: mat_amount + labor_amount + exp_amount }
  }
  const basicNames = [
    '프라이머 도포', '이중복합시트 3.8mm', '줄눈·크랙 실란트 보강포',
    '중도 1mm(2회)', '상도 우레탄 노출마감', '벽체 우레탄',
    '우레탄 상도', '바탕조정제',
  ]
  const basics = basicNames.map((name, i) =>
    mk({ name, qty: 100 + i * 5, mat: 12000 + i * 500 }),
  )
  const extras = [
    mk({ name: '사다리차', unit: '일', qty: 2, mat: 0, labor: 0, exp: 120000, is_base: false, is_equipment: true, is_fixed_qty: true }),
    mk({ name: '폐기물처리비', unit: '식', qty: 1, mat: 0, labor: 0, exp: 200000, is_base: false, is_equipment: true, is_fixed_qty: true }),
    mk({ name: '드라이비트 하부절개(2층 외벽)', unit: '식', qty: 1, mat: 0, labor: 0, exp: 0, is_base: false }),
  ]
  return [...basics, ...extras]
}

// ── 1. 견적서 INSERT ──
async function createEstimate(): Promise<{ estimateId: string; sheetId: string; companyId: string | null }> {
  const today = new Date().toISOString().slice(0, 10)
  // 임의 company_id 가 필요한 경우 — 가장 첫 row 사용 (없으면 null 시도)
  const { data: anyCompany } = await supabase.from('companies').select('id').limit(1).single()
  const companyId: string | null = anyCompany?.id ?? null

  const { data: estRow, error: estErr } = await supabase
    .from('estimates')
    .insert({
      company_id: companyId,
      mgmt_no: `UAT-${TAG}`,
      status: 'draft',
      date: today,
      customer_name: `UAT 자동테스트 ${TAG}`,
      site_name: 'UAT 가상 현장',
      m2: 100,
      wall_m2: 0,
      memo: `자동 UAT — ${TAG} (cleanup 대상)`,
    })
    .select('id, company_id')
    .single()
  if (estErr || !estRow) die(`estimate insert 실패: ${estErr?.message}`)

  const { data: sheetRow, error: shErr } = await supabase
    .from('estimate_sheets')
    .insert({
      estimate_id: estRow.id,
      type: '복합',
      title: '이중복합방수 3.8mm',
      price_per_pyeong: 32000,
      warranty_years: 5,
      warranty_bond: 3,
      grand_total: 0,
      sort_order: 1,
    })
    .select('id')
    .single()
  if (shErr || !sheetRow) die(`sheet insert 실패: ${shErr?.message}`)

  const items = buildItems().map((it, i) => ({
    sheet_id: sheetRow.id,
    sort_order: i + 1,
    name: it.name,
    spec: it.spec,
    unit: it.unit,
    qty: it.qty,
    mat: it.mat,
    labor: it.labor,
    exp: it.exp,
    mat_amount: it.mat_amount,
    labor_amount: it.labor_amount,
    exp_amount: it.exp_amount,
    total: it.total,
    is_base: it.is_base,
    is_equipment: it.is_equipment,
    is_fixed_qty: it.is_fixed_qty,
  }))

  const { error: itErr } = await supabase.from('estimate_items').insert(items)
  if (itErr) die(`items insert 실패: ${itErr.message}`)

  console.log(`[uat] created estimateId=${estRow.id} sheetId=${sheetRow.id} items=${items.length}`)
  return { estimateId: estRow.id, sheetId: sheetRow.id, companyId: estRow.company_id }
}

// ── Vercel preview 보호 우회: _vercel_share 로 쿠키 선획득 ──
async function getVercelAuthCookie(): Promise<string | null> {
  if (!VERCEL_SHARE) return null
  const res = await fetch(`${PREVIEW_URL}/?_vercel_share=${encodeURIComponent(VERCEL_SHARE)}`, {
    method: 'GET',
    redirect: 'manual',
  })
  const setCookie = res.headers.get('set-cookie')
  if (!setCookie) {
    console.warn(`[uat] set-cookie 누락 (status=${res.status}) — 인증 bypass 실패 가능`)
    return null
  }
  // _vercel_jwt / _vercel_sso_nonce 등 여러 쿠키 → name=value 부분만 추출
  const cookies = setCookie.split(/,(?=\s*\w+=)/).map(s => s.split(';')[0].trim()).join('; ')
  console.log(`[uat] 인증 쿠키 획득 (${cookies.length} bytes)`)
  return cookies
}

// ── 2. save-all 호출 ──
async function callSaveAll(estimateId: string, cookie: string | null): Promise<{
  compositePdfUrl: string | null
  compositeXlsxUrl: string | null
  jsonUrl: string | null
}> {
  const url = `${PREVIEW_URL}/api/estimates/${estimateId}/save-all`
  console.log(`[uat] POST ${url}`)
  const headers: Record<string, string> = {}
  if (cookie) headers['Cookie'] = cookie
  const res = await fetch(url, { method: 'POST', headers })
  const text = await res.text()
  if (!res.ok) {
    console.error(`[uat] save-all 실패 status=${res.status} body=${text.slice(0, 500)}`)
    throw new Error(`save-all ${res.status}`)
  }
  const json = JSON.parse(text) as Record<string, unknown>
  console.log(`[uat] save-all OK: ${JSON.stringify({
    pdf: json.compositePdfUrl, xlsx: json.compositeXlsxUrl, json: json.jsonUrl,
  })}`)
  return {
    compositePdfUrl: (json.compositePdfUrl as string) ?? null,
    compositeXlsxUrl: (json.compositeXlsxUrl as string) ?? null,
    jsonUrl: (json.jsonUrl as string) ?? null,
  }
}

// ── 3. Drive 파일 ID 추출 + 다운로드 ──
function extractDriveId(webViewLink: string): string | null {
  // webViewLink 형식: https://drive.google.com/file/d/{ID}/view?usp=...
  const m = webViewLink.match(/\/file\/d\/([^/]+)/)
  return m ? m[1] : null
}

async function downloadDriveFile(fileId: string, outPath: string): Promise<void> {
  const res = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'stream' },
  )
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(outPath)
    ;(res.data as Readable).pipe(out)
    out.on('finish', () => resolve())
    out.on('error', reject)
  })
}

// ── 4. cleanup ──
async function cleanupDrive(basePrefix: string): Promise<void> {
  // basePrefix.* 패턴으로 폴더 내 파일 검색 → 삭제
  const q = `'${TARGET_FOLDER}' in parents and trashed = false and name contains '${basePrefix.replace(/'/g, "\\'")}'`
  const list = await drive.files.list({
    q,
    fields: 'files(id, name)',
    pageSize: 50,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })
  const files = list.data.files ?? []
  console.log(`[uat] cleanup drive: ${files.length} 파일`)
  const orphans: Array<{ id: string; name: string; reason: string }> = []
  for (const f of files) {
    if (!f.id) continue
    try {
      await drive.files.delete({ fileId: f.id, supportsAllDrives: true })
      console.log(`[uat]   - 삭제: ${f.name} (${f.id})`)
    } catch (e) {
      const msg = (e as Error).message
      console.warn(`[uat]   ! 삭제 실패: ${f.name} (${f.id}) — ${msg}`)
      orphans.push({ id: f.id, name: f.name ?? '?', reason: msg })
    }
  }
  if (orphans.length > 0) {
    console.warn(`[uat] ORPHAN DRIVE FILES (수동 삭제 필요, ${orphans.length}건):`)
    for (const o of orphans) {
      console.warn(`[uat]   drive_id=${o.id} name="${o.name}" reason="${o.reason}"`)
    }
  }
}

async function cleanupSupabase(estimateId: string, sheetId: string): Promise<void> {
  // RLS 우회 service client. cascade 가 없을 수 있으니 역순 삭제.
  const orphans: string[] = []
  const { error: e1 } = await supabase.from('estimate_items').delete().eq('sheet_id', sheetId)
  if (e1) {
    console.warn(`[uat]   ! items 삭제 실패 (sheet_id=${sheetId}): ${e1.message}`)
    orphans.push(`estimate_items.sheet_id=${sheetId}`)
  }
  const { error: e2 } = await supabase.from('estimate_sheets').delete().eq('id', sheetId)
  if (e2) {
    console.warn(`[uat]   ! sheet 삭제 실패 (id=${sheetId}): ${e2.message}`)
    orphans.push(`estimate_sheets.id=${sheetId}`)
  }
  const { error: e3 } = await supabase.from('estimates').delete().eq('id', estimateId)
  if (e3) {
    console.warn(`[uat]   ! estimate 삭제 실패 (id=${estimateId}): ${e3.message}`)
    orphans.push(`estimates.id=${estimateId}`)
  }
  if (orphans.length > 0) {
    console.warn(`[uat] ORPHAN SUPABASE ROWS (수동 삭제 필요, ${orphans.length}건):`)
    for (const o of orphans) console.warn(`[uat]   ${o}`)
  } else {
    console.log(`[uat] cleanup supabase OK`)
  }
}

// ── 메인 ──
async function main() {
  console.log(`\n[uat] === STAGE 1: Supabase INSERT ===`)
  const created = await createEstimate()
  const customer = `UAT 자동테스트 ${TAG}`
  const site = 'UAT 가상 현장'
  const today = new Date().toISOString().slice(0, 10)
  const basePrefix = `${customer}_${site}_${today}_UAT-${TAG}`.replace(/[/\\:*?"<>|]/g, '')
  console.log(`[uat] basePrefix=${basePrefix}`)

  let pdfFileId: string | null = null
  let pageCount: number | string = 'unknown'
  try {
    console.log(`\n[uat] === STAGE 2: save-all POST (Drive 생성/변환) ===`)
    const authCookie = await getVercelAuthCookie()
    const result = await callSaveAll(created.estimateId, authCookie)
    if (!result.compositePdfUrl) die('compositePdfUrl 누락 — save-all 응답 확인')
    pdfFileId = extractDriveId(result.compositePdfUrl)
    if (!pdfFileId) die(`PDF Drive ID 추출 실패: ${result.compositePdfUrl}`)

    console.log(`\n[uat] === STAGE 3: PDF 다운로드 ===`)
    const outPath = path.join(process.platform === 'win32' ? process.env.TEMP || '.' : '/tmp', 'uat-production.pdf')
    await downloadDriveFile(pdfFileId, outPath)
    const stat = fs.statSync(outPath)
    console.log(`[uat] PDF 저장: ${outPath} (${stat.size.toLocaleString()} bytes)`)

    // pdfinfo 페이지 수
    try {
      const info = execSync(`pdfinfo "${outPath}"`, { encoding: 'utf8' })
      const m = info.match(/Pages:\s*(\d+)/)
      pageCount = m ? parseInt(m[1]) : 'unknown'
      console.log(`[uat] pdfinfo: pages=${pageCount}`)
    } catch {
      console.log(`[uat] pdfinfo 미설치 — 페이지 수 수동 확인 필요`)
    }

    console.log(`\n[uat] === 결과 요약 ===`)
    console.log(`  estimateId: ${created.estimateId}`)
    console.log(`  pdfFileId: ${pdfFileId}`)
    console.log(`  pdf path: ${outPath}`)
    console.log(`  pdf bytes: ${stat.size.toLocaleString()}`)
    console.log(`  pageCount: ${pageCount}`)
    console.log(`  PASS 기준: pageCount === 2 + 짤림 없음 (시각 확인 필요)`)
  } finally {
    if (KEEP_ARTIFACTS) {
      console.log(`\n[uat] === STAGE 4: cleanup 스킵 (KEEP_ARTIFACTS=1) ===`)
    } else {
      console.log(`\n[uat] === STAGE 4: cleanup ===`)
      await cleanupDrive(basePrefix)
      await cleanupSupabase(created.estimateId, created.sheetId)
    }
  }
}

main().catch(err => {
  console.error('[uat] 실패:', err)
  process.exit(1)
})
