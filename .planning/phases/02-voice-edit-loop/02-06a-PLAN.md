---
phase: 02-voice-edit-loop
plan: 06a
type: execute
wave: 4
depends_on:
  - 02-05b
files_modified:
  - lib/voice/summaryBuilder.ts (빈 스텁)
  - tests/voice/summaryBuilder.test.ts
autonomous: true
requirements:
  - VOICE-06
  - VUX-04
must_haves:
  truths:
    - '상태 요약 키워드 매칭 + 요약 텍스트 생성 테스트가 존재하고 전부 실패한다'
    - '구현 코드(hooks/*)는 수정하지 않는다'
    - '기존 테스트 파일은 수정하지 않는다'
  artifacts:
    - path: "tests/voice/summaryBuilder.test.ts"
      provides: "matchSummaryKeyword + buildSummaryText + buildMarginText 테스트"
    - path: "lib/voice/summaryBuilder.ts"
      provides: "빈 스텁 (테스트 실패용)"
---

<objective>
02-06(상태 요약 로컬 TTS)의 테스트를 작성한다.

순수 함수로 추출하여 테스트:
1. matchSummaryKeyword: "현재 상태"/"상태 알려"/"요약"/"마진 얼마"/"마진" 키워드 감지
2. buildSummaryText: 시트 데이터에서 요약 텍스트 생성 (면적/공종수/총액/마진)
3. buildMarginText: 마진율만 텍스트로 생성

현재 02-06 원본 계획에서 onSttText 안에 인라인으로 들어갈 로직을
lib/voice/summaryBuilder.ts로 추출할 예정.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: lib/voice/summaryBuilder.ts 빈 스텁 생성</name>
  <files>lib/voice/summaryBuilder.ts</files>
  <action>
1. lib/voice/summaryBuilder.ts 생성:

   ```typescript
   /**
    * 상태 요약 키워드 매칭 결과
    * - 'read_summary': 전체 상태 요약
    * - 'read_margin': 마진만 읽기
    */
   export type SummaryAction = 'read_summary' | 'read_margin'

   /**
    * 정규화된 텍스트에서 상태 요약 키워드를 감지한다.
    * LLM 호출 없이 로컬에서 처리하기 위한 사전 분류.
    */
   export function matchSummaryKeyword(normalized: string): SummaryAction | null {
     throw new Error('Not implemented')
   }

   /**
    * 시트 데이터에서 전체 요약 텍스트를 생성한다.
    * @param sheetType - 시트 타입 ('복합' | '우레탄')
    * @param m2 - 면적 (m²)
    * @param itemCount - 공종 수
    * @param grandTotal - 총액 (원)
    * @param margin - 마진율 (%)
    */
   export function buildSummaryText(
     sheetType: string,
     m2: number,
     itemCount: number,
     grandTotal: number,
     margin: number,
   ): string {
     throw new Error('Not implemented')
   }

   /**
    * 마진율만 텍스트로 생성한다.
    * @param sheetType - 시트 타입
    * @param margin - 마진율 (%)
    */
   export function buildMarginText(sheetType: string, margin: number): string {
     throw new Error('Not implemented')
   }
   ```
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>
  - 타입과 함수 시그니처만 존재
  - 호출 시 throw
  </done>
</task>

<task type="auto">
  <name>Task 2: summaryBuilder 테스트 작성</name>
  <files>tests/voice/summaryBuilder.test.ts</files>
  <action>
1. tests/voice/summaryBuilder.test.ts 작성:

   ```typescript
   import { describe, it, expect } from 'vitest'
   import { matchSummaryKeyword, buildSummaryText, buildMarginText } from '@/lib/voice/summaryBuilder'

   describe('matchSummaryKeyword', () => {
     describe('read_summary 매칭', () => {
       it('"현재 상태" → read_summary', () => {
         expect(matchSummaryKeyword('현재 상태')).toBe('read_summary')
       })

       it('"현재상태" (공백 없음) → read_summary', () => {
         expect(matchSummaryKeyword('현재상태')).toBe('read_summary')
       })

       it('"상태 알려줘" → read_summary', () => {
         expect(matchSummaryKeyword('상태 알려줘')).toBe('read_summary')
       })

       it('"상태알려" → read_summary', () => {
         expect(matchSummaryKeyword('상태알려')).toBe('read_summary')
       })

       it('"요약" → read_summary', () => {
         expect(matchSummaryKeyword('요약')).toBe('read_summary')
       })

       it('"현재 상태 알려줘" → read_summary', () => {
         expect(matchSummaryKeyword('현재 상태 알려줘')).toBe('read_summary')
       })
     })

     describe('read_margin 매칭', () => {
       it('"마진 얼마" → read_margin', () => {
         expect(matchSummaryKeyword('마진 얼마')).toBe('read_margin')
       })

       it('"마진얼마" → read_margin', () => {
         expect(matchSummaryKeyword('마진얼마')).toBe('read_margin')
       })

       it('"마진" (단독) → read_margin', () => {
         expect(matchSummaryKeyword('마진')).toBe('read_margin')
       })

       it('"마진 얼마야" → read_margin', () => {
         expect(matchSummaryKeyword('마진 얼마야')).toBe('read_margin')
       })
     })

     describe('매칭 안 됨', () => {
       it('"바탕정리 재료비 올려" → null', () => {
         expect(matchSummaryKeyword('바탕정리 재료비 올려')).toBeNull()
       })

       it('"수정" → null', () => {
         expect(matchSummaryKeyword('수정')).toBeNull()
       })

       it('"저장해줘" → null', () => {
         expect(matchSummaryKeyword('저장해줘')).toBeNull()
       })

       it('빈 문자열 → null', () => {
         expect(matchSummaryKeyword('')).toBeNull()
       })
     })
   })

   describe('buildSummaryText', () => {
     it('기본 요약 텍스트 생성', () => {
       const result = buildSummaryText('복합', 150, 10, 5800000, 52)
       expect(result).toContain('복합')
       expect(result).toContain('150')
       expect(result).toContain('10')
       expect(result).toContain('580만원')
       expect(result).toContain('52퍼센트')
     })

     it('총액 0원', () => {
       const result = buildSummaryText('우레탄', 100, 0, 0, 0)
       expect(result).toContain('우레탄')
       expect(result).toContain('0만원')
       expect(result).toContain('0퍼센트')
     })

     it('총액 반올림 (만원 단위)', () => {
       // 3,945,000 → 395만원 (Math.round)
       const result = buildSummaryText('복합', 100, 5, 3945000, 48)
       expect(result).toContain('395만원')
     })

     it('마진 소수점 반올림', () => {
       const result = buildSummaryText('복합', 150, 10, 5800000, 52.7)
       expect(result).toContain('53퍼센트')
     })
   })

   describe('buildMarginText', () => {
     it('기본 마진 텍스트 생성', () => {
       const result = buildMarginText('복합', 52)
       expect(result).toContain('복합')
       expect(result).toContain('52퍼센트')
     })

     it('소수점 반올림', () => {
       const result = buildMarginText('우레탄', 48.3)
       expect(result).toContain('48퍼센트')
     })
   })
   ```
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run test -- tests/voice/summaryBuilder.test.ts 2>&1 | tail -10</automated>
  </verify>
  <done>
  - summaryBuilder 테스트 전부 FAIL (스텁 throw)
  - 총 테스트: matchSummaryKeyword 10개 + buildSummaryText 4개 + buildMarginText 2개 = 16개
  </done>
</task>

</tasks>

<verification>
1. npm run test 실행 → keywordMatcher 17 PASS + autoResumeLogic 12 PASS + summaryBuilder 16 FAIL
2. lib/voice/summaryBuilder.ts는 스텁만 존재
3. hooks/ 파일 수정 없음
4. 기존 테스트 파일 수정 없음
</verification>
