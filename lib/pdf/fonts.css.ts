import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Pretendard @font-face CSS 생성.
 * page.setContent() 방식은 상대경로 fetch 불가 → base64 데이터 URL로 인라인 임베드.
 * 모듈 스코프 캐시로 파일 1회만 읽음.
 */

const cache = new Map<string, string>()

function fontDataUrl(filename: string): string {
  const cached = cache.get(filename)
  if (cached) return cached
  const filePath = join(process.cwd(), 'public', 'fonts', filename)
  const buf = readFileSync(filePath)
  const url = `data:font/woff2;base64,${buf.toString('base64')}`
  cache.set(filename, url)
  return url
}

export function fontsCss(): string {
  return `
@font-face { font-family: 'Pretendard'; src: url('${fontDataUrl('Pretendard-Regular.woff2')}') format('woff2'); font-weight: 400; font-display: block; }
@font-face { font-family: 'Pretendard'; src: url('${fontDataUrl('Pretendard-Medium.woff2')}') format('woff2'); font-weight: 500; font-display: block; }
@font-face { font-family: 'Pretendard'; src: url('${fontDataUrl('Pretendard-Bold.woff2')}') format('woff2'); font-weight: 700; font-display: block; }
`.trim()
}
