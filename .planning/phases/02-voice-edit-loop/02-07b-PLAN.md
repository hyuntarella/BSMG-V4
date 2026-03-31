---
phase: 02-voice-edit-loop
plan: 07b
type: execute
wave: 4
depends_on:
  - 02-07a
files_modified:
  - lib/voice/vadLogic.ts
  - hooks/useVoiceEditMode.ts
  - hooks/useVoice.ts (stream ref 노출)
autonomous: true
requirements:
  - VOICE-08
  - VUX-05
must_haves:
  truths:
    - 'npm run test 전체 통과'
    - '테스트 파일은 수정하지 않는다'
    - 'useVoiceEditMode.ts가 vadLogic을 사용한다'
    - 'VAD가 녹음용 stream을 재사용한다 (별도 getUserMedia 제거)'
  artifacts:
    - path: "lib/voice/vadLogic.ts"
      provides: "rmsToDb + isSilent + shouldStopByVad + shouldEnableVad 구현"
    - path: "hooks/useVoiceEditMode.ts"
      provides: "VAD useEffect에서 vadLogic 함수 사용 + recordingStream 재사용"
    - path: "hooks/useVoice.ts"
      provides: "startRecording에서 stream을 streamRef에 저장 + 외부 노출"
---

<objective>
02-07a에서 작성한 테스트를 전부 통과시키는 구현을 한다.

1. lib/voice/vadLogic.ts 구현
2. hooks/useVoice.ts에서 녹음 stream을 ref로 노출 (recordingStreamRef)
3. hooks/useVoiceEditMode.ts의 VAD useEffect에서:
   - vadLogic 함수 사용
   - 별도 getUserMedia 제거 → 녹음용 stream 재사용
   - requestAnimationFrame → setInterval(100ms) 변경

테스트 파일은 절대 수정하지 않는다.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: vadLogic.ts 구현</name>
  <files>lib/voice/vadLogic.ts</files>
  <action>
1. rmsToDb 구현:
   ```typescript
   export function rmsToDb(samples: Float32Array): number {
     const rms = Math.sqrt(samples.reduce((sum, v) => sum + v * v, 0) / samples.length)
     return 20 * Math.log10(Math.max(rms, 1e-10))
   }
   ```

2. isSilent 구현:
   ```typescript
   export function isSilent(db: number, threshold: number = VAD_SILENCE_THRESHOLD_DB): boolean {
     return db < threshold
   }
   ```

3. shouldStopByVad 구현:
   ```typescript
   export function shouldStopByVad(
     silenceStartMs: number | null,
     nowMs: number,
     durationMs: number = VAD_SILENCE_DURATION_MS,
   ): boolean {
     if (silenceStartMs === null) return false
     return nowMs - silenceStartMs >= durationMs
   }
   ```

4. shouldEnableVad 구현:
   ```typescript
   export function shouldEnableVad(
     isEditMode: boolean,
     enableVad: boolean,
     voiceStatus: VoiceStatus,
   ): boolean {
     return isEditMode && enableVad && voiceStatus === 'recording'
   }
   ```
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run test 2>&1 | tail -10</automated>
  </verify>
  <done>
  - npm run test 전체 통과 (64/64)
  </done>
</task>

<task type="auto">
  <name>Task 2: useVoice.ts — stream ref 노출</name>
  <files>hooks/useVoice.ts</files>
  <action>
1. streamRef 추가:
   ```typescript
   const streamRef = useRef<MediaStream | null>(null)
   ```

2. startRecording에서 stream 저장:
   ```typescript
   const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
   streamRef.current = stream
   ```

3. stopRecording의 recorder.onstop에서 stream 정리 후 ref 초기화:
   ```typescript
   recorder.onstop = () => {
     stream.getTracks().forEach(t => t.stop())
     streamRef.current = null
     processAudioRef.current()
   }
   ```

4. return에 streamRef 추가:
   ```typescript
   return {
     ...existing,
     streamRef,
   }
   ```
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>
  - streamRef가 외부에 노출됨
  - 빌드 통과
  </done>
</task>

<task type="auto">
  <name>Task 3: useVoiceEditMode.ts — VAD에서 vadLogic 사용 + stream 재사용</name>
  <files>hooks/useVoiceEditMode.ts</files>
  <action>
1. import 추가:
   ```typescript
   import { rmsToDb, isSilent, shouldStopByVad, shouldEnableVad } from '@/lib/voice/vadLogic'
   ```

2. 인터페이스에 recordingStream 추가:
   ```typescript
   interface UseVoiceEditModeOptions {
     ...existing,
     /** 녹음용 MediaStream (VAD에서 재사용) */
     recordingStream?: MediaStream | null
   }
   ```

3. VAD useEffect 수정:
   - 조건문을 shouldEnableVad 사용으로 교체:
     ```typescript
     if (!shouldEnableVad(isEditMode, enableVad, voiceStatus)) {
       vadCleanupRef.current?.()
       vadCleanupRef.current = null
       return
     }
     ```
   - 별도 `navigator.mediaDevices.getUserMedia({ audio: true })` 제거
   - `recordingStream`을 직접 사용:
     ```typescript
     if (!recordingStream) return  // stream 없으면 VAD 불가

     const ctx = new AudioContext()
     const source = ctx.createMediaStreamSource(recordingStream)
     const analyser = ctx.createAnalyser()
     analyser.fftSize = 2048
     source.connect(analyser)
     ```
   - RMS→dB 계산을 vadLogic 함수로 교체:
     ```typescript
     const db = rmsToDb(dataArray)
     if (isSilent(db)) {
       if (!silenceStart) silenceStart = Date.now()
       else if (shouldStopByVad(silenceStart, Date.now())) {
         callbacksRef.current.onStopRecording?.()
         exitEditMode()
         return
       }
     } else {
       silenceStart = null
     }
     ```
   - requestAnimationFrame → setInterval(100ms) 변경:
     ```typescript
     const intervalId = setInterval(check, 100)
     ```
   - cleanup에서 stream.getTracks().stop() 제거 (녹음 stream은 VAD가 정리하면 안 됨):
     ```typescript
     vadCleanupRef.current = () => {
       active = false
       clearInterval(intervalId)
       ctx.close().catch(() => {})
     }
     ```

4. useEffect 의존성에 recordingStream 추가.

5. useEstimateVoice.ts에서 recordingStream 전달:
   ```typescript
   const editMode = useVoiceEditMode({
     voiceStatus: voice.status,
     onAutoResume: voice.startRecording,
     onPlayTts: voice.playTts,
     onStopRecording: voice.stopRecording,
     recordingStream: voice.streamRef.current,
   })
   ```
   주의: streamRef.current는 렌더 시점의 값이므로,
   voice.status가 'recording'으로 변할 때 re-render되면서 최신 stream이 전달됨.
  </action>
  <verify>
    <automated>cd "C:/Users/나/BSMG-V4" && npm run test 2>&1 | tail -5 && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>
  - npm run test 전체 통과
  - npm run build 통과
  - VAD가 녹음용 stream을 재사용 (듀얼 스트림 문제 해결)
  - requestAnimationFrame → setInterval로 변경 (탭 비활성 대응)
  - shouldEnableVad/isSilent/shouldStopByVad 등 vadLogic 함수 사용
  </done>
</task>

</tasks>

<verification>
1. npm run test 전체 통과
2. npm run build 통과
3. 테스트 파일 변경 없음
4. 수정 모드 → 녹음 → 5초 무음 → 녹음 자동 종료 확인
5. enableVad=false → VAD 비활성화 확인
6. 갤럭시탭에서 마이크 권한 에러 없이 동작 확인 (별도 getUserMedia 제거됨)
</verification>
