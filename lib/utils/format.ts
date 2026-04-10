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

/**
 * 입력 중인 숫자 문자열을 천단위 콤마 포함으로 재포맷.
 * 편집 UX용 — 소수점·음수·중간 상태("1.", "-")를 보존하여 타이핑 경험을 해치지 않음.
 *
 * "1000"    → "1,000"
 * "1,000"   → "1,000"   (paste 대응)
 * "1000.5"  → "1,000.5"
 * "1000."   → "1,000."  (소수점 타이핑 도중)
 * "-"       → "-"       (음수 타이핑 도중)
 * ""        → ""
 * "abc"     → "abc"     (유효하지 않은 입력은 원본 보존 — 사용자 수정 유도)
 */
export function formatNumericEdit(input: string): string {
  // 1) 기존 콤마 제거
  const stripped = input.replace(/,/g, '')
  // 2) 빈 문자열 / 음수 기호만 입력된 중간 상태
  if (stripped === '' || stripped === '-') return stripped

  // 3) 정수부 / 소수부 분리
  const dotIdx = stripped.indexOf('.')
  const intPart = dotIdx === -1 ? stripped : stripped.slice(0, dotIdx)
  const decPart = dotIdx === -1 ? null : stripped.slice(dotIdx + 1)

  // 4) 유효성: 정수부는 선택적 음수 + 숫자, 소수부는 숫자만 (두 번째 . 거부)
  if (!/^-?\d*$/.test(intPart)) return input
  if (decPart !== null && !/^\d*$/.test(decPart)) return input

  // 5) 정수부 콤마 포맷
  const formattedInt =
    intPart === '' || intPart === '-'
      ? intPart
      : Number(intPart).toLocaleString('en-US')

  return decPart !== null ? `${formattedInt}.${decPart}` : formattedInt
}
