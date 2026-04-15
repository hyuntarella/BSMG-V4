import puppeteer, { type Browser } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

/**
 * Phase 6.1 — 견적서 PDF 파운데이션
 * - puppeteer-core + @sparticuz/chromium (Vercel serverless)
 * - page.setContent() 주입 방식 (self-loopback 회피, PDF_PIPELINE_EXPORT §7.2 #2)
 * - 싱글턴 브라우저 (Fluid Compute 재사용)
 */

let browserInstance: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) return browserInstance

  const isVercel = process.env.VERCEL === '1'

  if (isVercel) {
    browserInstance = await puppeteer.launch({
      executablePath: await chromium.executablePath(),
      args: chromium.args,
      headless: true,
    })
  } else {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox'],
    })
  }

  return browserInstance
}

export interface RenderPdfOpts {
  width: number
  height: number
}

export async function renderPdfFromHtml(
  html: string,
  opts: RenderPdfOpts,
): Promise<Buffer> {
  const browser = await getBrowser()
  const page = await browser.newPage()

  try {
    await page.setViewport({
      width: opts.width,
      height: opts.height,
      deviceScaleFactor: 2,
    })
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 })
    await page.evaluateHandle('document.fonts.ready')
    await new Promise((r) => setTimeout(r, 500))

    const pdf = await page.pdf({
      width: `${opts.width}px`,
      height: `${opts.height}px`,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    })

    return Buffer.from(pdf)
  } finally {
    await page.close()
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close()
    browserInstance = null
  }
}

if (typeof process !== 'undefined') {
  process.on('beforeExit', () => {
    closeBrowser().catch(() => {})
  })
}
