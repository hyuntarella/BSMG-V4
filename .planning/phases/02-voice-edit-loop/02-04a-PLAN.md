---
phase: 02-voice-edit-loop
plan: 04a
type: execute
wave: 4
depends_on:
  - 02-03
files_modified:
  - package.json
  - vitest.config.ts
  - lib/voice/keywordMatcher.ts (빈 스텁)
  - tests/voice/keywordMatcher.test.ts
autonomous: true
requirements:
  - VOICE-03
  - VUX-02
must_haves:
  truths:
    - 'vitest가 설치되고 npm run test로 실행 가능하다'
    - '키워드 매칭 테스트가 존재하고 현재 전부 실패한다'
    - '구현 코드(hooks/*)는 수정하지 않는다'
  artifacts:
    - path: "vitest.config.ts"
      provides: "vitest 설정 (tsconfig paths 호환)"
    - path: "tests/voice/keywordMatcher.test.ts"
      provides: "normalizeText + matchKeyword 테스트 케이스"
    - path: "lib/voice/keywordMatcher.ts"
      provides: "빈 스텁 (테스트 실패용)"
---

<objective>
vitest 테스트 프레임워크를 셋업하고, 02-04(키워드 모드 전환)의 테스트를 작성한다.

핵심 로직을 순수 함수로 추출하여 테스트한다:
1. normalizeText: STT 텍스트 정규화 (trim, 마침표/물음표 제거)
2. matchKeyword: 정규화된 텍스트에서 키워드를 감지하여 액션 반환

현재 useEstimateVoice.ts의 onSttText 안에 인라인으로 들어있는 키워드 매칭 로직을
lib/voice/keywordMatcher.ts로 추출할 예정. 이 파일의 스텁만 만들고 구현은 04b에서.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: vitest + 관련 패키지 설치</name>
  <files>package.json</files>
  <action>
1. devDependencies에 추가:
   - vitest
   - @vitejs/plugin-react (JSX 지원 — 향후 컴포넌트 테스트용)

2. package.json scripts에 추가:
   ```json
   "test": "vitest run",
   "test:watch": "vitest"
   ```

3. npm install 실행
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npx vitest --version</automated>
  </verify>
  <done>
  - vitest 설치 완료
  - npm run test 실행 가능
  </done>
</task>

<task type="auto">
  <name>Task 2: vitest.config.ts 생성</name>
  <files>vitest.config.ts</files>
  <action>
1. vitest.config.ts 생성:
   ```typescript
   import { defineConfig } from 'vitest/config'
   import path from 'path'

   export default defineConfig({
     test: {
       include: ['tests/**/*.test.ts'],
       environment: 'node',
     },
     resolve: {
       alias: {
         '@': path.resolve(__dirname),
       },
     },
   })
   ```
2. tsconfig.json의 `@/*` alias와 호환되도록 resolve.alias 설정
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npx vitest run --passWithNoTests 2>&1 | tail -3</automated>
  </verify>
  <done>
  - vitest가 설정 파일을 인식하고 실행 가능
  - @/ alias가 올바르게 해석됨
  </done>
</task>

<task type="auto">
  <name>Task 3: lib/voice/keywordMatcher.ts 빈 스텁 생성</name>
  <files>lib/voice/keywordMatcher.ts</files>
  <action>
1. lib/voice/keywordMatcher.ts 생성 — 타입만 정의하고 구현은 비워둠:

   ```typescript
   /**
    * 키워드 매칭 결과 액션
    * - 'enter_edit': 수정 모드 진입
    * - 'exit_edit': 수정 모드 종료
    * - 'confirm': 수정 확정 (됐어/확인)
    */
   export type KeywordAction = 'enter_edit' | 'exit_edit' | 'confirm'

   /**
    * STT 텍스트 정규화: trim + 끝부분 마침표/물음표/공백 제거
    */
   export function normalizeText(raw: string): string {
     throw new Error('Not implemented')
   }

   /**
    * 정규화된 텍스트에서 키워드 감지 → 액션 반환
    * @param normalized - normalizeText()로 정규화된 텍스트
    * @param isEditMode - 현재 수정 모드 여부
    * @param hasSheets - 시트가 1개 이상 존재하는지
    * @returns 매칭된 액션 또는 null (LLM으로 전달)
    */
   export function matchKeyword(
     normalized: string,
     isEditMode: boolean,
     hasSheets: boolean,
   ): KeywordAction | null {
     throw new Error('Not implemented')
   }
   ```
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>
  - 타입 정의와 함수 시그니처만 존재
  - 호출 시 throw (테스트 실패 보장)
  </done>
</task>

<task type="auto">
  <name>Task 4: keywordMatcher 테스트 작성</name>
  <files>tests/voice/keywordMatcher.test.ts</files>
  <action>
1. tests/voice/keywordMatcher.test.ts 작성:

   ```typescript
   import { describe, it, expect } from 'vitest'
   import { normalizeText, matchKeyword } from '@/lib/voice/keywordMatcher'

   describe('normalizeText', () => {
     it('마침표/물음표/느낌표를 끝에서 제거한다', () => {
       expect(normalizeText('수정.')).toBe('수정')
       expect(normalizeText('그만?')).toBe('그만')
       expect(normalizeText('종료!')).toBe('종료')
       expect(normalizeText('수정。')).toBe('수정')
     })

     it('앞뒤 공백을 제거한다', () => {
       expect(normalizeText('  수정  ')).toBe('수정')
       expect(normalizeText(' 그만해 ')).toBe('그만해')
     })

     it('끝부분 공백+구두점 복합 케이스', () => {
       expect(normalizeText('수정. ')).toBe('수정')
       expect(normalizeText('그만해. ')).toBe('그만해')
     })

     it('중간 문자는 보존한다', () => {
       expect(normalizeText('바탕정리 재료비 500원으로')).toBe('바탕정리 재료비 500원으로')
     })

     it('빈 문자열', () => {
       expect(normalizeText('')).toBe('')
       expect(normalizeText('  ')).toBe('')
     })
   })

   describe('matchKeyword', () => {
     describe('수정 모드 진입 (enter_edit)', () => {
       it('"수정" → 시트 있고 수정 모드 아닐 때 enter_edit', () => {
         expect(matchKeyword('수정', false, true)).toBe('enter_edit')
       })

       it('"수정" → 이미 수정 모드면 null (LLM 전달)', () => {
         expect(matchKeyword('수정', true, true)).toBeNull()
       })

       it('"수정" → 시트 없으면 null (extract 모드)', () => {
         expect(matchKeyword('수정', false, false)).toBeNull()
       })

       it('"수정." (정규화 후) → enter_edit', () => {
         // normalizeText 적용 후 전달되는 상황
         expect(matchKeyword('수정', false, true)).toBe('enter_edit')
       })
     })

     describe('수정 모드 종료 (exit_edit)', () => {
       it('"그만" → exit_edit', () => {
         expect(matchKeyword('그만', false, true)).toBe('exit_edit')
       })

       it('"종료" → exit_edit', () => {
         expect(matchKeyword('종료', false, true)).toBe('exit_edit')
       })

       it('"멈춰" → exit_edit', () => {
         expect(matchKeyword('멈춰', false, true)).toBe('exit_edit')
       })

       it('"그만해" → exit_edit (6자 이하 파생형)', () => {
         expect(matchKeyword('그만해', false, true)).toBe('exit_edit')
       })
     })

     describe('수정 확정 (confirm)', () => {
       it('"됐어" + 수정 모드 → confirm', () => {
         expect(matchKeyword('됐어', true, true)).toBe('confirm')
       })

       it('"확인" + 수정 모드 → confirm', () => {
         expect(matchKeyword('확인', true, true)).toBe('confirm')
       })

       it('"다음" + 수정 모드 → confirm', () => {
         expect(matchKeyword('다음', true, true)).toBe('confirm')
       })

       it('"넘겨" + 수정 모드 → confirm', () => {
         expect(matchKeyword('넘겨', true, true)).toBe('confirm')
       })

       it('"확인" + 수정 모드 아님 → null', () => {
         expect(matchKeyword('확인', false, true)).toBeNull()
       })
     })

     describe('긴 문장은 LLM으로 전달', () => {
       it('7자 이상 문장은 null (LLM 전달)', () => {
         expect(matchKeyword('바탕정리 재료비 올려', false, true)).toBeNull()
       })

       it('"수정 모드 진입해줘" (7자 이상) → null', () => {
         expect(matchKeyword('수정 모드 진입해줘', false, true)).toBeNull()
       })
     })
   })
   ```
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run test 2>&1 | tail -10</automated>
  </verify>
  <done>
  - 모든 테스트가 FAIL 상태 (스텁이 throw하므로)
  - npm run test가 정상 실행되고 실패 결과 출력
  - 테스트 구조: normalizeText 5개 + matchKeyword 12개 = 총 17개
  </done>
</task>

</tasks>

<verification>
1. npm run test 실행 → 17개 테스트 전부 FAIL
2. vitest.config.ts가 @/ alias를 올바르게 해석
3. lib/voice/keywordMatcher.ts는 스텁만 존재 (throw)
4. hooks/ 파일은 수정하지 않음
</verification>
