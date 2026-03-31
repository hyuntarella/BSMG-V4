---
phase: 02-voice-edit-loop
plan: 04b
type: execute
wave: 4
depends_on:
  - 02-04a
files_modified:
  - lib/voice/keywordMatcher.ts
  - hooks/useEstimateVoice.ts
autonomous: true
requirements:
  - VOICE-03
  - VUX-02
must_haves:
  truths:
    - 'npm run test 전체 통과'
    - 'tests/voice/keywordMatcher.test.ts는 수정하지 않는다'
    - 'useEstimateVoice.ts의 onSttText가 keywordMatcher를 사용한다'
  artifacts:
    - path: "lib/voice/keywordMatcher.ts"
      provides: "normalizeText + matchKeyword 구현"
    - path: "hooks/useEstimateVoice.ts"
      provides: "onSttText에서 keywordMatcher import 사용"
---

<objective>
02-04a에서 작성한 테스트를 전부 통과시키는 구현을 한다.

1. lib/voice/keywordMatcher.ts의 normalizeText, matchKeyword 구현
2. hooks/useEstimateVoice.ts의 onSttText에서 인라인 키워드 매칭을 keywordMatcher로 교체

테스트 파일은 절대 수정하지 않는다.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: keywordMatcher.ts 구현</name>
  <files>lib/voice/keywordMatcher.ts</files>
  <action>
1. normalizeText 구현:
   ```typescript
   export function normalizeText(raw: string): string {
     return raw.trim().replace(/[.?!。？！\s]+$/g, '')
   }
   ```

2. matchKeyword 구현:
   - 6자 이하만 키워드로 처리 (isShortCommand)
   - "그만"/"종료"/"멈춰" → 'exit_edit'
   - "됐어"/"넘겨"/"다음"/"확인" + isEditMode → 'confirm'
   - "수정" + !isEditMode + hasSheets → 'enter_edit'
   - 그 외 → null (LLM 전달)

   현재 useEstimateVoice.ts onSttText의 기존 로직을 그대로 옮김:
   ```typescript
   export function matchKeyword(
     normalized: string,
     isEditMode: boolean,
     hasSheets: boolean,
   ): KeywordAction | null {
     const isShortCommand = normalized.length <= 6

     if (isShortCommand && /그만|종료|멈춰/.test(normalized)) {
       return 'exit_edit'
     }

     if (isShortCommand && /됐어|넘겨|다음|확인/.test(normalized) && isEditMode) {
       return 'confirm'
     }

     if (isShortCommand && /수정/.test(normalized) && hasSheets && !isEditMode) {
       return 'enter_edit'
     }

     return null
   }
   ```
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run test 2>&1 | tail -10</automated>
  </verify>
  <done>
  - npm run test 전체 통과 (17/17)
  </done>
</task>

<task type="auto">
  <name>Task 2: useEstimateVoice.ts에서 keywordMatcher 사용</name>
  <files>hooks/useEstimateVoice.ts</files>
  <action>
1. import 추가:
   ```typescript
   import { normalizeText, matchKeyword } from '@/lib/voice/keywordMatcher'
   ```

2. onSttText 콜백에서 기존 인라인 정규화/매칭을 교체:
   - `const normalized = text.trim().replace(...)` → `const normalized = normalizeText(text)`
   - 기존 3개 if 블록(그만/확정/수정)을 matchKeyword 호출로 통합:
     ```typescript
     const action = matchKeyword(normalized, editModeRef.current.isEditMode, estimate.sheets.length > 0)
     if (action === 'exit_edit') {
       editModeRef.current.exitEditMode()
       callbacksRef.current.addLog('assistant', '종료합니다.')
       voicePlayTtsRef.current('종료합니다.')
       return true
     }
     if (action === 'confirm') {
       callbacksRef.current.addLog('assistant', '확인했습니다.')
       voicePlayTtsRef.current('확인했습니다.')
       return true
     }
     if (action === 'enter_edit') {
       enterEditModeRef.current()
       callbacksRef.current.addLog('assistant', '수정 모드 진입.')
       return true
     }
     ```
3. 기존 동작은 완전히 동일. 로직만 순수 함수로 분리.
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run test 2>&1 | tail -5 && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>
  - npm run test 전체 통과
  - npm run build 통과
  - useEstimateVoice.ts가 keywordMatcher를 import하여 사용
  - 기존 동작 동일 (인라인 → 함수 호출)
  </done>
</task>

</tasks>

<verification>
1. npm run test 전체 통과
2. npm run build 통과
3. tests/voice/keywordMatcher.test.ts 파일 변경 없음
4. 브라우저에서 기존 키워드 감지 동작 확인 (Space → "수정" → 모드 진입)
</verification>
