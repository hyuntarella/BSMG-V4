/**
 * 샘플 xlsx 의 pageSetup.orientation 을 검증한다 (작업 3 검증).
 * 실행: npx tsx scripts/verify-landscape.ts
 */
import ExcelJS from 'exceljs'
import fs from 'fs'
import path from 'path'

async function main() {
  const dir = path.join(process.cwd(), 'samples')
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'))
  for (const f of files) {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(path.join(dir, f))
    console.log(`\n== ${f} ==`)
    wb.eachSheet((ws, id) => {
      const ps = ws.pageSetup ?? {}
      console.log(
        `Sheet${id} "${ws.name}":`,
        `orientation=${ps.orientation}`,
        `paperSize=${ps.paperSize}`,
        `fitToPage=${ps.fitToPage}`,
        `fitToWidth=${ps.fitToWidth}`,
      )
    })
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
