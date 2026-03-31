---
phase: 02-voice-edit-loop
plan: 05b
type: execute
wave: 4
depends_on:
  - 02-05a
files_modified:
  - lib/voice/autoResumeLogic.ts
  - hooks/useVoiceEditMode.ts
  - hooks/useVoice.ts
autonomous: true
requirements:
  - VOICE-04
  - VUX-03
must_haves:
  truths:
    - 'npm run test 전체 통과'
    - '테스트 파일은 수정하지 않는다'
    - 'useVoiceEditMode.ts가 autoResumeLogic을 사용한다'
  artifacts:
    - path: "lib/voice/autoResumeLogic.ts"
      provides: "shouldAutoResume + canStartRecording 구현"
    - path: "hooks/useVoiceEditMode.ts"
      provides: "자동 재개 useEffect에서 shouldAutoResume 사용"
    - path: "hooks/useVoice.ts"
      provides: "startRecording에서 canStartRecording 사용"
---

<objective>
02-05a에서 작성한 테스트를 전부 통과시키는 구현을 한다.

1. lib/voice/autoResumeLogic.ts의 shouldAutoResume, canStartRecording 구현
2. hooks/useVoiceEditMode.ts의 자동 재개 useEffect에서 shouldAutoResume 사용
3. hooks/useVoice.ts의 startRecording에서 canStartRecording 사용

테스트 파일은 절대 수정하지 않는다.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: autoResumeLogic.ts 구현</name>
  <files>lib/voice/autoResumeLogic.ts</files>
  <action>
1. shouldAutoResume 구현:
   ```typescript
   export function shouldAutoResume(
     prevStatus: VoiceStatus,
     currentStatus: VoiceStatus,
     isEditMode: boolean,
   ): boolean {
     const wasActiveStatus = prevStatus === 'speaking' || prevStatus === 'processing'
     const isNowIdle = currentStatus === 'idle'
     return wasActiveStatus && isNowIdle && isEditMode
   }
   ```

2. canStartRecording 구현:
   ```typescript
   export function canStartRecording(currentStatus: VoiceStatus): boolean {
     return currentStatus === 'idle'
   }
   ```

   현재 useVoiceEditMode.ts useEffect의 조건문과 useVoice.ts startRecording의 가드를 그대로 옮김.
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run test 2>&1 | tail -10</automated>
  </verify>
  <done>
  - npm run test 전체 통과 (29/29: keywordMatcher 17 + autoResumeLogic 12)
  </done>
</task>

<task type="auto">
  <name>Task 2: hooks에서 autoResumeLogic 사용</name>
  <files>hooks/useVoiceEditMode.ts, hooks/useVoice.ts</files>
  <action>
1. useVoiceEditMode.ts:
   - import 추가: `import { shouldAutoResume } from '@/lib/voice/autoResumeLogic'`
   - 자동 재개 useEffect 내 조건문 교체:
     ```typescript
     // 기존:
     // const wasActiveStatus = prevStatusRef.current === 'speaking' || prevStatusRef.current === 'processing'
     // const isNowIdle = voiceStatus === 'idle'
     // if (wasActiveStatus && isNowIdle && isEditModeRef.current) {

     // 변경:
     if (shouldAutoResume(prevStatusRef.current, voiceStatus, isEditModeRef.current)) {
     ```
   - console.log 추가:
     ```typescript
     console.log('[AutoResume]', { prev: prevStatusRef.current, current: voiceStatus, isEditMode: isEditModeRef.current })
     ```

2. useVoice.ts:
   - import 추가: `import { canStartRecording } from '@/lib/voice/autoResumeLogic'`
   - startRecording 가드 교체:
     ```typescript
     // 기존: if (statusRef.current !== 'idle') return
     // 변경:
     if (!canStartRecording(statusRef.current)) return
     ```

3. playTts의 audio.onerror 처리 확인:
   - 이미 try/catch로 감싸져 있으나, onended만 처리 중
   - onerror 추가하여 에러 시에도 status를 idle로 복구:
     ```typescript
     audio.onerror = () => {
       URL.revokeObjectURL(url)
       audioRef.current = null
       setStatus('idle')
     }
     ```
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run test 2>&1 | tail -5 && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>
  - npm run test 전체 통과
  - npm run build 통과
  - hooks가 autoResumeLogic 함수를 import하여 사용
  - 기존 동작 완전 동일 (조건문 → 함수 호출)
  - playTts onerror 추가로 에러 시 status 복구
  </done>
</task>

</tasks>

<verification>
1. npm run test 전체 통과
2. npm run build 통과
3. 테스트 파일 변경 없음
4. 수정 모드 진입 → 명령 발화 → TTS 재생 → 2초 후 자동 녹음 시작 확인
5. TTS 재생 중 Space 녹음 시도 → 무시 확인
</verification>
