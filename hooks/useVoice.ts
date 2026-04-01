'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { hasEndingTrigger } from '@/lib/voice/triggerMatcher'

export type VoiceStatus = 'idle' | 'recording' | 'processing'

// ── Web Speech API 타입 (브라우저 전용, lib.dom에 없을 수 있음) ──
interface SpeechRecognitionResult {
  readonly isFinal: boolean
  readonly length: number
  [index: number]: { readonly transcript: string; readonly confidence: number }
}
interface SpeechRecognitionResultList {
  readonly length: number
  [index: number]: SpeechRecognitionResult
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string
}
interface WebSpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

interface UseVoiceOptions {
  /** STT 힌트 프롬프트 */
  sttPrompt?: string
  /** Whisper STT 세그먼트 완료 콜백 */
  onSegment?: (text: string) => void
  /** Web Speech API interim result 콜백 (실시간) */
  onInterim?: (text: string) => void
  /** Web Speech API final result 콜백 */
  onWebSpeechFinal?: (text: string) => void
  /** 종결 어미 감지 콜백 (오디오 세그먼트 분리 트리거) */
  onEndingDetected?: (interimText: string) => void
  /** 에러 콜백 */
  onError?: (error: string) => void
  /** 발화 후 무음 감지 시간 (ms). 기본 2000 */
  silenceDurationMs?: number
  /** VAD 무음 임계값 (dB). 기본 -35 */
  silenceThresholdDb?: number
}

const DEFAULT_STT_PROMPT = '방수 복합 우레탄 견적 바탕정리 바탕미장 복합시트 보호누름 우레탄도막 상도 톱코트 벽체실링 사다리차 스카이차 폐기물 크랙보수 드라이비트 헤베 평 넣어 넘겨. 150헤베 50평 3만5천 35000원 면적200 벽체30미터 평단가4만원 재료비500원 마진50퍼센트'

/**
 * 핵심 음성 훅 — Web Speech API + MediaRecorder 병렬 실행.
 *
 * Layer 1: Web Speech API (실시간 전사, interim result)
 * Layer 2: MediaRecorder → Whisper API (정확한 전사)
 *
 * 같은 마이크 스트림을 두 곳에서 동시 사용.
 * 종결 어미 감지 시 즉시 오디오 세그먼트 분리.
 * 2초 무음은 폴백으로 유지.
 */
export function useVoice(options: UseVoiceOptions = {}) {
  const {
    sttPrompt = DEFAULT_STT_PROMPT,
    onSegment,
    onInterim,
    onWebSpeechFinal,
    onEndingDetected,
    onError,
    silenceDurationMs = 2000,
    silenceThresholdDb = -35,
  } = options

  const callbacksRef = useRef({ onSegment, onError, onInterim, onWebSpeechFinal, onEndingDetected })
  callbacksRef.current = { onSegment, onError, onInterim, onWebSpeechFinal, onEndingDetected }

  const [status, _setStatus] = useState<VoiceStatus>('idle')
  const statusRef = useRef<VoiceStatus>('idle')
  const setStatus = useCallback((s: VoiceStatus) => { statusRef.current = s; _setStatus(s) }, [])

  const [seconds, setSeconds] = useState(0)
  const [lastText, setLastText] = useState('')
  const [interimText, setInterimText] = useState('')
  const [audioLevel, setAudioLevel] = useState(0)
  const [processingCount, setProcessingCount] = useState(0)

  // 내부 refs
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recognitionRef = useRef<WebSpeechRecognition | null>(null)

  // VAD 상태
  const hadSpeechRef = useRef(false)
  const silenceStartRef = useRef<number | null>(null)
  const sttPromptRef = useRef(sttPrompt)
  sttPromptRef.current = sttPrompt

  // 타이밍 로그
  const recordingStartRef = useRef<number>(0)

  // Web Speech API 지원 여부
  const webSpeechSupported = useRef(
    typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  )

  // ── 새 MediaRecorder 생성 (같은 스트림 재사용) ──
  const createRecorder = useCallback((stream: MediaStream): { recorder: MediaRecorder; getChunks: () => Blob[] } => {
    const chunks: Blob[] = []
    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm',
    })
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    return { recorder, getChunks: () => chunks }
  }, [])

  // ── 세그먼트 처리 (Whisper STT) ──
  const processSegment = useCallback(async (chunks: Blob[]) => {
    if (chunks.length === 0) return

    const whisperStart = performance.now()
    setProcessingCount(c => c + 1)
    try {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      const base64 = await blobToBase64(blob)

      const res = await fetch('/api/stt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64, prompt: sttPromptRef.current }),
      })
      if (!res.ok) throw new Error('STT 실패')
      const { text } = await res.json()
      console.log(`[timing] whisper returned: ${(performance.now() - whisperStart).toFixed(0)}ms`)

      if (!text || text.trim().length === 0) return

      // Whisper 프롬프트 환각 방지
      if (text.startsWith('방수 복합 우레탄 견적 바탕정리')) return

      setLastText(text)
      callbacksRef.current.onSegment?.(text)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'STT 오류'
      callbacksRef.current.onError?.(msg)
    } finally {
      setProcessingCount(c => c - 1)
    }
  }, [])

  // ── VAD/종결어미 세그먼트: 현재 녹음 중지 → 새 녹음 시작 → 이전 오디오 처리 ──
  const segmentRecording = useCallback(() => {
    const currentRecorder = recorderRef.current
    const stream = streamRef.current
    if (!currentRecorder || !stream || currentRecorder.state !== 'recording') return

    const oldGetChunks = (currentRecorder as MediaRecorder & { _getChunks?: () => Blob[] })._getChunks

    currentRecorder.onstop = () => {
      const chunks = oldGetChunks?.() ?? []
      if (chunks.length > 0) {
        processSegment(chunks)
      }
    }

    currentRecorder.stop()

    // 즉시 새 레코더 시작 (같은 stream 재사용 → 갭 거의 없음)
    const { recorder: newRecorder, getChunks } = createRecorder(stream)
    ;(newRecorder as MediaRecorder & { _getChunks?: () => Blob[] })._getChunks = getChunks
    recorderRef.current = newRecorder
    newRecorder.start()

    // VAD 상태 리셋
    hadSpeechRef.current = false
    silenceStartRef.current = null
  }, [createRecorder, processSegment])

  // ── Web Speech API 시작 ──
  const startWebSpeech = useCallback(() => {
    if (!webSpeechSupported.current) return

    type SpeechRecognitionCtor = new () => WebSpeechRecognition
    const Ctor = (window as unknown as Record<string, unknown>).SpeechRecognition as SpeechRecognitionCtor | undefined
      ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition as SpeechRecognitionCtor | undefined
    if (!Ctor) return

    const recognition = new Ctor()
    recognition.lang = 'ko-KR'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      let finalText = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalText += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }

      if (interim) {
        const elapsed = performance.now() - recordingStartRef.current
        console.log(`[timing] interim arrived: ${elapsed.toFixed(0)}ms`)
        setInterimText(interim)
        callbacksRef.current.onInterim?.(interim)

        // 종결 어미 감지 → 세그먼트 분리 트리거
        if (hasEndingTrigger(interim)) {
          console.log(`[timing] ending detected: ${elapsed.toFixed(0)}ms`)
          callbacksRef.current.onEndingDetected?.(interim)
          segmentRecording()
        }
      }

      if (finalText) {
        // interim을 지우지 않음 — 다음 interim이 자동으로 덮어씀
        callbacksRef.current.onWebSpeechFinal?.(finalText)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // "no-speech" 에러는 무시 (VAD가 처리)
      if (event.error === 'no-speech' || event.error === 'aborted') return
      console.warn('[WebSpeech] error:', event.error)
    }

    recognition.onend = () => {
      // 녹음 중이면 자동 재시작 (Chrome은 자동 중단하므로)
      if (statusRef.current === 'recording' && recognitionRef.current) {
        try { recognition.start() } catch { /* 이미 시작됨 */ }
      }
    }

    try {
      recognition.start()
      recognitionRef.current = recognition
    } catch {
      console.warn('[WebSpeech] start failed')
    }
  }, [segmentRecording])

  // ── Web Speech API 중지 ──
  const stopWebSpeech = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* 이미 중지 */ }
      recognitionRef.current = null
    }
    setInterimText('')
  }, [])

  // ── 녹음 시작 (연속 녹음 + Web Speech API 병렬) ──
  const startRecording = useCallback(async () => {
    if (statusRef.current !== 'idle') return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // AudioContext + AnalyserNode (VAD용)
      const audioCtx = new AudioContext()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)
      audioCtxRef.current = audioCtx
      analyserRef.current = analyser

      // 첫 번째 레코더
      const { recorder, getChunks } = createRecorder(stream)
      ;(recorder as MediaRecorder & { _getChunks?: () => Blob[] })._getChunks = getChunks
      recorderRef.current = recorder
      recorder.start()

      setStatus('recording')
      setSeconds(0)
      setInterimText('')
      setAudioLevel(0)
      hadSpeechRef.current = false
      silenceStartRef.current = null
      recordingStartRef.current = performance.now()

      // 시간 카운터
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)

      // Web Speech API 병렬 시작
      startWebSpeech()

      // VAD 모니터링 (100ms 간격) — 2초 무음 폴백
      const dataArray = new Float32Array(analyser.frequencyBinCount)

      vadIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) return
        analyserRef.current.getFloatTimeDomainData(dataArray)

        const rms = Math.sqrt(dataArray.reduce((sum, v) => sum + v * v, 0) / dataArray.length)
        const db = 20 * Math.log10(Math.max(rms, 1e-10))

        // 오디오 레벨 업데이트 (0~1 정규화, -60dB→0, 0dB→1)
        const normalized = Math.max(0, Math.min(1, (db + 60) / 60))
        setAudioLevel(normalized)

        if (db >= silenceThresholdDb) {
          hadSpeechRef.current = true
          silenceStartRef.current = null
        } else if (hadSpeechRef.current) {
          if (!silenceStartRef.current) {
            silenceStartRef.current = Date.now()
          } else if (Date.now() - silenceStartRef.current >= silenceDurationMs) {
            // 2초 무음 → 세그먼트 (종결 어미 없이 말 끊는 경우 폴백)
            segmentRecording()
          }
        }
      }, 100)
    } catch (err) {
      callbacksRef.current.onError?.('마이크 접근 실패')
      console.error(err)
    }
  }, [silenceDurationMs, silenceThresholdDb, createRecorder, segmentRecording, startWebSpeech])

  // ── 녹음 중지 (마지막 세그먼트 처리 + 정리) ──
  const stopRecording = useCallback(() => {
    // Web Speech API 중지
    stopWebSpeech()

    // VAD 중지
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current)
      vadIntervalRef.current = null
    }
    // 타이머 중지
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    const recorder = recorderRef.current
    if (recorder && recorder.state === 'recording') {
      const getChunks = (recorder as MediaRecorder & { _getChunks?: () => Blob[] })._getChunks

      recorder.onstop = () => {
        const chunks = getChunks?.() ?? []
        // 마이크 닫기
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        audioCtxRef.current?.close().catch(() => {})
        audioCtxRef.current = null
        analyserRef.current = null
        recorderRef.current = null

        if (chunks.length > 0) {
          setStatus('processing')
          processSegment(chunks).then(() => {
            setStatus('idle')
          })
        } else {
          setStatus('idle')
        }
      }
      recorder.stop()
    } else {
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      audioCtxRef.current?.close().catch(() => {})
      audioCtxRef.current = null
      analyserRef.current = null
      recorderRef.current = null
      setStatus('idle')
    }
  }, [processSegment, stopWebSpeech])

  // ── 토글 ──
  const toggleRecording = useCallback(() => {
    if (statusRef.current === 'recording') {
      stopRecording()
    } else if (statusRef.current === 'idle') {
      startRecording()
    }
  }, [startRecording, stopRecording])

  // ── 언마운트 시 정리 ──
  useEffect(() => {
    return () => {
      if (vadIntervalRef.current) clearInterval(vadIntervalRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      audioCtxRef.current?.close().catch(() => {})
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch { /* ok */ }
      }
    }
  }, [])

  return {
    status,
    seconds,
    lastText,
    /** Web Speech API 실시간 전사 텍스트 */
    interimText,
    /** 오디오 입력 레벨 (0~1) */
    audioLevel,
    /** 현재 백그라운드에서 처리 중인 세그먼트 수 */
    processingCount,
    startRecording,
    stopRecording,
    toggleRecording,
  }
}

// ── 헬퍼 ──

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}
