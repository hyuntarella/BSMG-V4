/**
 * Phase 5 — Google Sheets 네이티브 템플릿 통합 UAT.
 *
 * production-uat.ts 와 동일 패턴: Supabase INSERT → Preview save-all POST →
 * 결과 PDF 다운로드 + landscape 검증 + cleanup.
 *
 * 실행:
 *   PREVIEW_URL=https://bsmg-v5-xxx.vercel.app \
 *     [VERCEL_SHARE=...] [KEEP_ARTIFACTS=1] \
 *     npx tsx scripts/gsheets-uat.ts
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { Readable } from 'stream'

function loadEnvLocal() {
  try {
    const content = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8')
    for (const line of content.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i === -1) continue
      const k = t.slice(0, i).trim()
      let v = t.slice(i + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      if (!process.env[k]) process.env[k] = v
    }
  } catch {}
}
loadEnvLocal()

const PREVIEW_URL = (process.env.PREVIEW_URL || '').replace(/\/$/, '')
const VERCEL_SHARE = process.env.VERCEL_SHARE || ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const GSA_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || ''
const GSA_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/^["']|["']$/g, '').trim()
const TARGET_FOLDER = (process.env.GOOGLE_DRIVE_FOLDER_ID || '').trim()
const KEEP_ARTIFACTS = process.env.KEEP_ARTIFACTS === '1'

function die(msg: string): never { console.error(`[uat] FATAL: ${msg}`); process.exit(1) }

if (!PREVIEW_URL) die('PREVIEW_URL 환경변수 필요')
if (!SUPABASE_URL || !SERVICE_ROLE) die('Supabase 자격증명 필요')
if (!GSA_EMAIL || !GSA_KEY) die('Google SA 자격증명 필요')
if (!TARGET_FOLDER) die('GOOGLE_DRIVE_FOLDER_ID 필요')

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
const auth = new google.auth.JWT({
  email: GSA_EMAIL,
  key: GSA_KEY,
  scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets'],
})
const drive = google.drive({ version: 'v3', auth })

const TAG = `uat-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
console.log(`[uat] tag=${TAG}`)
console.log(`[uat] preview=${PREVIEW_URL}`)

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
    return {
      ...base,
      mat_amount: base.qty * base.mat,
      labor_amount: base.qty * base.labor,
      exp_amount: base.qty * base.exp,
      total: base.qty * (base.mat + base.labor + base.exp),
    }
  }
  const basicNames = [
    '프라이머 도포', '이중복합시트 3.8mm', '줄눈·크랙 실란트 보강포',
    '중도 1mm(2회)', '상도 우레탄 노출마감', '벽체 우레탄',
    '우레탄 상도', '바탕조정제',
  ]
  const basics = basicNames.map((name, i) => mk({ name, qty: 100 + i * 5, mat: 12000 + i * 500 }))
  const extras = [
    mk({ name: '사다리차', unit: '일', qty: 2, mat: 0, labor: 0, exp: 120000, is_base: false, is_equipment: true, is_fixed_qty: true }),
    mk({ name: '폐기물처리비', unit: '식', qty: 1, mat: 0, labor: 0, exp: 200000, is_base: false, is_equipment: true, is_fixed_qty: true }),
    mk({ name: '드라이비트 하부절개(2층 외벽)', unit: '식', qty: 1, mat: 0, labor: 0, exp: 0, is_base: false }),
  ]
  return [...basics, ...extras]
}

async function createEstimate() {
  const today = new Date().toISOString().slice(0, 10)
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
      memo: `Phase 5 gsheets UAT — ${TAG} (cleanup 대상)`,
    })
    .select('id, company_id')
    .single()
  if (estErr || !estRow) die(`estimate insert: ${estErr?.message}`)

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
  if (shErr || !sheetRow) die(`sheet insert: ${shErr?.message}`)

  const items = buildItems().map((it, i) => ({ sheet_id: sheetRow.id, sort_order: i + 1, ...it }))
  const { error: itErr } = await supabase.from('estimate_items').insert(items)
  if (itErr) die(`items insert: ${itErr.message}`)

  console.log(`[uat] estimateId=${estRow.id} sheetId=${sheetRow.id} items=${items.length}`)
  return { estimateId: estRow.id, sheetId: sheetRow.id }
}

async function getCookie(): Promise<string | null> {
  if (!VERCEL_SHARE) return null
  const res = await fetch(`${PREVIEW_URL}/?_vercel_share=${encodeURIComponent(VERCEL_SHARE)}`, { method: 'GET', redirect: 'manual' })
  const sc = res.headers.get('set-cookie')
  if (!sc) return null
  return sc.split(/,(?=\s*\w+=)/).map(s => s.split(';')[0].trim()).join('; ')
}

async function callSaveAll(estimateId: string, cookie: string | null) {
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
  return JSON.parse(text)
}

function extractDriveId(link: string): string | null {
  const m = link.match(/\/file\/d\/([^/]+)/)
  return m ? m[1] : null
}

async function downloadDriveFile(fileId: string, outPath: string) {
  const res = await drive.files.get({ fileId, alt: 'media', supportsAllDrives: true }, { responseType: 'stream' })
  return new Promise<void>((resolve, reject) => {
    const out = fs.createWriteStream(outPath)
    ;(res.data as Readable).pipe(out)
    out.on('finish', () => resolve())
    out.on('error', reject)
  })
}

function checkPdfLandscape(buf: Buffer): { pages: number; landscape: boolean } {
  const s = buf.toString('latin1')
  const matches = [...s.matchAll(/\/MediaBox\s*\[\s*([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s*\]/g)]
  if (matches.length === 0) return { pages: 0, landscape: false }
  const allLandscape = matches.every(m => {
    const w = parseFloat(m[3]) - parseFloat(m[1])
    const h = parseFloat(m[4]) - parseFloat(m[2])
    return w > h
  })
  return { pages: matches.length, landscape: allLandscape }
}

async function cleanup(basePrefix: string, estimateId: string, sheetId: string) {
  const q = `'${TARGET_FOLDER}' in parents and trashed = false and name contains '${basePrefix.replace(/'/g, "\\'")}'`
  const list = await drive.files.list({ q, fields: 'files(id,name)', pageSize: 50, supportsAllDrives: true, includeItemsFromAllDrives: true })
  for (const f of list.data.files ?? []) {
    if (!f.id) continue
    try { await drive.files.delete({ fileId: f.id, supportsAllDrives: true }); console.log(`[uat] del ${f.name}`) }
    catch (e) { console.warn(`[uat] del FAIL ${f.name}: ${(e as Error).message}`) }
  }
  await supabase.from('estimate_items').delete().eq('sheet_id', sheetId)
  await supabase.from('estimate_sheets').delete().eq('id', sheetId)
  await supabase.from('estimates').delete().eq('id', estimateId)
  console.log(`[uat] cleanup OK`)
}

async function main() {
  const created = await createEstimate()
  const today = new Date().toISOString().slice(0, 10)
  const customer = `UAT 자동테스트 ${TAG}`
  const site = 'UAT 가상 현장'
  const basePrefix = `${customer}_${site}_${today}_UAT-${TAG}`.replace(/[/\\:*?"<>|]/g, '')

  let pdfFileId: string | null = null
  try {
    const cookie = await getCookie()
    const result = await callSaveAll(created.estimateId, cookie)
    console.log(`[uat] save-all OK: ${JSON.stringify({ pdf: result.compositePdfUrl, xlsx: result.compositeXlsxUrl })}`)
    if (!result.compositePdfUrl) die('compositePdfUrl 누락')
    pdfFileId = extractDriveId(result.compositePdfUrl)
    if (!pdfFileId) die(`Drive ID 추출 실패: ${result.compositePdfUrl}`)

    const outPath = path.join(process.platform === 'win32' ? process.env.TEMP || '.' : '/tmp', 'gsheets-uat.pdf')
    await downloadDriveFile(pdfFileId, outPath)
    const buf = fs.readFileSync(outPath)
    const { pages, landscape } = checkPdfLandscape(buf)
    console.log(`\n[uat] === 결과 ===`)
    console.log(`  PDF: ${outPath} (${buf.length.toLocaleString()} bytes)`)
    console.log(`  pages: ${pages}`)
    console.log(`  orientation: ${landscape ? 'LANDSCAPE ✓' : 'PORTRAIT ✗'}`)
    console.log(`  PASS 기준: pages>=2 + landscape ✓`)
    if (pages < 2 || !landscape) {
      console.error(`  ✗ FAIL`)
      process.exit(2)
    }
    console.log(`  ✓ PASS`)
    console.log(`  Drive PDF URL: ${result.compositePdfUrl}`)
    console.log(`  Drive XLSX URL: ${result.compositeXlsxUrl}`)
  } finally {
    if (KEEP_ARTIFACTS) console.log(`[uat] cleanup 스킵`)
    else await cleanup(basePrefix, created.estimateId, created.sheetId)
  }
}

main().catch(err => { console.error('[uat] 실패:', err); process.exit(1) })
