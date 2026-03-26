const UNITS = ['', '만', '억', '조']
const DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']
const SUB_UNITS = ['', '십', '백', '천']

/**
 * 숫자를 한국어로 변환
 * n2k(3900000) → "삼백구십만"
 * n2k(0) → "영"
 */
export function n2k(n: number): string {
  if (n === 0) return '영'
  if (n < 0) return '마이너스 ' + n2k(-n)

  const num = Math.round(n)
  const str = String(num)
  const groups: number[] = []

  // 4자리씩 끊기 (뒤에서부터)
  for (let i = str.length; i > 0; i -= 4) {
    const start = Math.max(0, i - 4)
    groups.unshift(parseInt(str.slice(start, i), 10))
  }

  const parts: string[] = []
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i]
    if (g === 0) continue

    const unitIdx = groups.length - 1 - i
    let groupStr = ''
    const gStr = String(g)

    for (let j = 0; j < gStr.length; j++) {
      const digit = parseInt(gStr[j], 10)
      if (digit === 0) continue
      const subUnit = SUB_UNITS[gStr.length - 1 - j]
      // '일'은 십/백/천 앞에서 생략 (일십 → 십)
      if (digit === 1 && subUnit !== '') {
        groupStr += subUnit
      } else {
        groupStr += DIGITS[digit] + subUnit
      }
    }

    parts.push(groupStr + UNITS[unitIdx])
  }

  return parts.join('') || '영'
}
