import { describe, it, expect } from 'vitest'
import { canonicalize, toChosung } from '@/lib/acdb/canonical'

describe('canonicalize', () => {
  it('한글 사이 공백 제거', () => {
    expect(canonicalize('우 레 탄 상 도')).toBe('우레탄상도')
  })

  it('숫자+차 공백 제거', () => {
    expect(canonicalize('노출우레탄 1 차')).toBe('노출우레탄1차')
  })

  it('다중 공백 처리', () => {
    expect(canonicalize('  하도   프라이머  ')).toBe('하도프라이머')
  })
})

describe('toChosung', () => {
  it('한글을 초성으로 변환', () => {
    expect(toChosung('우레탄')).toBe('ㅇㄹㅌ')
  })

  it('비한글은 그대로 유지', () => {
    expect(toChosung('abc')).toBe('abc')
  })
})
