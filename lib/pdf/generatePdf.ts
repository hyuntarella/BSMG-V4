import type { Estimate, CalcResult } from '@/lib/estimate/types'
import { calc } from '@/lib/estimate/calc'
import { fm } from '@/lib/utils/format'

/**
 * Chromium remote binary URL for @sparticuz/chromium-min on Vercel serverless.
 * 버전은 @sparticuz/chromium-min 패키지 버전과 일치해야 함.
 */
const CHROMIUM_REMOTE_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v131.0.0/chromium-v131.0.0-pack.tar'

/**
 * HTML 문자열을 받아 Puppeteer + 서버리스 Chromium으로 PDF Buffer 생성
 *
 * Vercel 서버리스 환경에서 @sparticuz/chromium-min + puppeteer-core 조합 사용.
 */
export async function generatePdfBuffer(html: string): Promise<Buffer> {
  const chromium = await import('@sparticuz/chromium-min')
  const puppeteer = await import('puppeteer-core')

  const browser = await puppeteer.default.launch({
    args: chromium.default.args,
    defaultViewport: { width: 1240, height: 1754 }, // A4 at 150dpi
    executablePath: await chromium.default.executablePath(CHROMIUM_REMOTE_URL),
    headless: true,
  })

  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'networkidle0' })
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', right: '10mm', bottom: '15mm', left: '10mm' },
  })
  await browser.close()
  return Buffer.from(pdf)
}

/**
 * 견적서 HTML → PDF 변환
 *
 * Vercel 서버리스에서는 puppeteer가 무겁기 때문에
 * HTML 문자열을 생성해서 브라우저 print나 외부 서비스로 변환하는 전략 사용.
 * 여기서는 HTML 생성만 담당.
 */
export function generateEstimateHtml(estimate: Estimate): string {
  const sheetsHtml = estimate.sheets
    .map((sheet) => {
      const result: CalcResult = calc(sheet.items)

      const rows = sheet.items
        .map(
          (item) => `
        <tr>
          <td class="center">${item.sort_order}</td>
          <td class="name">${item.name}</td>
          <td>${item.spec}</td>
          <td class="center">${item.unit}</td>
          <td class="right">${fm(item.qty)}</td>
          <td class="right">${fm(item.mat)}</td>
          <td class="right">${fm(item.labor)}</td>
          <td class="right">${fm(item.exp)}</td>
          <td class="right bold">${fm(item.total)}</td>
        </tr>`
        )
        .join('')

      return `
      <div class="sheet">
        <h2>${sheet.title ?? sheet.type}</h2>
        <p class="meta">면적: ${fm(estimate.m2)}m² · 평단가: ${fm(sheet.price_per_pyeong)}원/평</p>
        <table>
          <thead>
            <tr>
              <th width="30">#</th>
              <th width="120">품명</th>
              <th width="100">규격</th>
              <th width="40">단위</th>
              <th width="60">수량</th>
              <th width="70">재료비</th>
              <th width="70">노무비</th>
              <th width="70">경비</th>
              <th width="90">금액</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <div class="summary">
          <div class="summary-row"><span>소계</span><span>${fm(result.subtotal)}</span></div>
          <div class="summary-row"><span>공과잡비 (3%)</span><span>${fm(result.overhead)}</span></div>
          <div class="summary-row"><span>기업이윤 (6%)</span><span>${fm(result.profit)}</span></div>
          <div class="summary-row"><span>계</span><span>${fm(result.totalBeforeRound)}</span></div>
          <div class="summary-row grand"><span>합계 (10만원 절사)</span><span>${fm(result.grandTotal)}원</span></div>
        </div>
      </div>`
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>견적서 - ${estimate.mgmt_no ?? ''}</title>
  <style>
    @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Pretendard Variable', '맑은 고딕', sans-serif; font-size: 11px; color: #333; padding: 20px; }
    .cover { text-align: center; margin-bottom: 30px; }
    .cover h1 { font-size: 24px; color: #A11D1F; margin-bottom: 20px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; max-width: 500px; margin: 0 auto; }
    .info-item { display: flex; gap: 8px; }
    .info-label { font-weight: 600; color: #666; min-width: 70px; }
    .sheet { margin-bottom: 30px; page-break-inside: avoid; }
    .sheet h2 { font-size: 14px; color: #A11D1F; margin-bottom: 4px; }
    .meta { font-size: 10px; color: #888; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #A11D1F; color: white; padding: 4px 6px; text-align: center; }
    td { border: 1px solid #ddd; padding: 3px 6px; }
    .center { text-align: center; }
    .right { text-align: right; font-variant-numeric: tabular-nums; }
    .name { font-weight: 600; }
    .bold { font-weight: 700; }
    .summary { margin-top: 8px; border-top: 2px solid #A11D1F; padding-top: 6px; }
    .summary-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px; }
    .summary-row.grand { font-size: 14px; font-weight: 700; color: #A11D1F; border-top: 1px solid #ccc; padding-top: 4px; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="cover">
    <h1>견 적 서</h1>
    <div class="info-grid">
      <div class="info-item"><span class="info-label">관리번호</span><span>${estimate.mgmt_no ?? ''}</span></div>
      <div class="info-item"><span class="info-label">일자</span><span>${estimate.date}</span></div>
      <div class="info-item"><span class="info-label">고객명</span><span>${estimate.customer_name ?? ''}</span></div>
      <div class="info-item"><span class="info-label">현장명</span><span>${estimate.site_name ?? ''}</span></div>
      <div class="info-item"><span class="info-label">담당자</span><span>${estimate.manager_name ?? ''}</span></div>
      <div class="info-item"><span class="info-label">연락처</span><span>${estimate.manager_phone ?? ''}</span></div>
      <div class="info-item"><span class="info-label">면적</span><span>${fm(estimate.m2)} m²</span></div>
      <div class="info-item"><span class="info-label">벽체면적</span><span>${fm(estimate.wall_m2)} m</span></div>
    </div>
  </div>
  ${sheetsHtml}
</body>
</html>`
}
