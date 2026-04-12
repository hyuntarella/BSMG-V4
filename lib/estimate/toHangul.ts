/**
 * 숫자를 한글 금액 표기로 변환
 *
 * 예시: 12300000 → "일금 일천이백삼십만 원정"
 * C-N1 요구사항: "일금 ○○○원정" 형식 (위변조 방지)
 */
export function toHangul(n: number): string {
  if (!n || n <= 0) return '일금 영 원정'

  const units = ['', '만', '억', '조']
  const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']
  const subUnits = ['', '십', '백', '천']

  const floored = Math.floor(n)
  const str = String(floored)

  // 4자리씩 그룹화 (뒤에서부터)
  const groups: string[] = []
  let s = str
  while (s.length > 0) {
    groups.unshift(s.slice(-4))
    s = s.slice(0, -4)
  }

  let result = ''
  groups.forEach((group, i) => {
    const groupNum = Number(group)
    if (!groupNum) return

    let groupStr = ''
    for (let j = 0; j < group.length; j++) {
      const d = Number(group[j])
      if (d === 0) continue
      // '일'은 십/백/천 앞에서 생략 (일십 → 십)
      const digitStr = d === 1 && j < group.length - 1 ? '' : digits[d]
      groupStr += digitStr + subUnits[group.length - 1 - j]
    }

    result += groupStr + units[groups.length - 1 - i]
  })

  return `일금 ${result || '영'} 원정`
}
