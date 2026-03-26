/**
 * 숫자 포맷팅 (천 단위 콤마)
 * fm(3900000) → "3,900,000"
 */
export function fm(n: number): string {
  return Math.round(n).toLocaleString('ko-KR')
}

/**
 * 100원 단위 반올림
 * r100(12345) → 12300
 */
export function r100(n: number): number {
  return Math.round(n / 100) * 100
}
