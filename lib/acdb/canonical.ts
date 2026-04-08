/**
 * 공종명 정규화: 공백 제거, 차수 정리
 * "우 레 탄 상 도" → "우레탄상도"
 * "노출우레탄 1 차" → "노출우레탄1차"
 */
export function canonicalize(name: string): string {
  let s = name.trim()
  // 한글 글자 사이 공백 제거
  while (true) {
    const next = s.replace(/([가-힣])\s+([가-힣])/g, '$1$2')
    if (next === s) break
    s = next
  }
  // 숫자 + 공백 + 차/회/년/mm 등 붙이기
  s = s.replace(/(\d)\s+(차|회|년|mm|m|개)/g, '$1$2')
  // 다중 공백 단일화
  s = s.replace(/\s+/g, ' ').trim()
  // 최종 canon은 모든 공백 제거
  return s.replace(/\s+/g, '')
}

const CHOSUNG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']

export function toChosung(s: string): string {
  return Array.from(s).map(c => {
    const code = c.charCodeAt(0)
    if (code >= 0xAC00 && code <= 0xD7A3) {
      return CHOSUNG[Math.floor((code - 0xAC00) / 588)]
    }
    return c
  }).join('')
}
