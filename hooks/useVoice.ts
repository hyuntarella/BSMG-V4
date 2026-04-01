'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export type VoiceStatus = 'idle' | 'recording' | 'processing'

interface UseVoiceOptions {
  /** STT 힌트 프롬프트 */
  sttPrompt?: string
  /** 세그먼트 완료 콜백 (STT 텍스트) */
  onSegment?: (text: string) => void
  /** 에러 콜백 */
  onError?: (error: string) => void
  /** 발화 후 무음 감지 시간 (ms). 기본 2000 */
  silenceDurationMs?: number
  /** VAD 무음 임계값 (dB). 기본 -35 */
  silenceThresholdDb?: number
}

const DEFAULT_STT_PROMPT = '방수 복합 우레탄 견적 바탕정리 바탕미장 복합시트 보호누름 우레탄도막 상도 톱코트 벽체실링 사다리차 스카이차 폐기물 크랙보수 드라이비트 헤베 평 넣어 넘겨. 150헤베 50평 3만5천 35000원 면적200 벽체30미터 평단가4만원 재료비500원 마진50퍼센트'

/**
 * 핵심 음성 훅 — 연속 녹음 + VAD 세그먼트.
 *
 * 버튼 ON → 마이크 열림 → 연속 녹음
 * 발화 후 2초 무음 → 세그먼트 분리 → STT → onSegment(text)
 * 녹음은 계속 유지 (새 MediaRecorder)
 * 버튼 OFF → 마지막 세그먼트 처리 → 마이크 닫힘
 */
export function useVoice(options: UseVoiceOptions = {}) {
  const {
    sttPrompt = DEFAULT_STT_PROMPT,
    onSegment,
    onError,
    silenceDurationMs = 2000,
    silenceThresholdDb = -35,
  } = options

  const callbacksRef = useRef({ onSegment, onError })
  callbacksRef.current = { onSegment, onError }

  const [status, _setStatus] = useState<VoiceStatus>('idle')
  const statusRef = useRef<VoiceStatus>('idle')
  const setStatus = useCallback((s: VoiceStatus) => { statusRef.current = s; _setStatus(s) }, [])

  const [seconds, setSeconds] = useState(0)
  const [lastText, setLastText] = useState('')
  const [processingCount, setProcessingCount] = useState(0)

  // 내부 refs
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isFinalStopRef = useRef(false)

  // VAD 상태
  const hadSpeechRef = useRef(false)
  const silenceStartRef = useRef<number | null>(null)
  const sttPromptRef = useRef(sttPrompt)
  sttPromptRef.current = sttPrompt

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

  // ── 세그먼트 처리 (STT) ──
  const processSegment = useCallback(async (chunks: Blob[]) => {
    if (chunks.length === 0) return

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

  // ── VAD 세그먼트: 현재 녹음 중지 → 새 녹음 시작 → 이전 오디오 처리 ──
  const segmentRecording = useCallback(() => {
    const currentRecorder = recorderRef.current
    const stream = streamRef.current
    if (!currentRecorder || !stream || currentRecorder.state !== 'recording') return

    // 현재 레코더의 chunks 접근을 위해 onstop에서 처리
    isFinalStopRef.current = false

    // 현재 레코더에서 chunks를 가져올 수 있도록 래퍼 사용
    const oldGetChunks = (currentRecorder as MediaRecorder & { _getChunks?: () => Blob[] })._getChunks

    currentRecorder.onstop = () => {
      const chunks = oldGetChunks?.() ?? []
      // 최소 녹음 시간 체크 (0.5초)
      if (chunks.length > 0) {
        processSegment(chunks)
      }
    }

    currentRecorder.stop()

    // 즉시 새 레코더 시작
    const { recorder: newRecorder, getChunks } = createRecorder(stream)
    ;(newRecorder as MediaRecorder & { _getChunks?: () => Blob[] })._getChunks = getChunks
    recorderRef.current = newRecorder
    newRecorder.start()

    // VAD 상태 리셋
    hadSpeechRef.current = false
    silenceStartRef.current = null
  }, [createRecorder, processSegment])

  // ── 녹음 시작 (연속 녹음) ──
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
      hadSpeechRef.current = false
      silenceStartRef.current = null

      // 시간 카운터
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)

      // VAD 모니터링 (100ms 간격)
      const dataArray = new Float32Array(analyser.frequencyBinCount)

      vadIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) return
        analyserRef.current.getFloatTimeDomainData(dataArray)

        const rms = Math.sqrt(dataArray.reduce((sum, v) => sum + v * v, 0) / dataArray.length)
        const db = 20 * Math.log10(Math.max(rms, 1e-10))

        if (db >= silenceThresholdDb) {
          // 소리 감지
          hadSpeechRef.current = true
          silenceStartRef.current = null
        } else if (hadSpeechRef.current) {
          // 발화 후 무음
          if (!silenceStartRef.current) {
            silenceStartRef.current = Date.now()
          } else if (Date.now() - silenceStartRef.current >= silenceDurationMs) {
            // 2초 무음 → 세그먼트
            segmentRecording()
          }
        }
      }, 100)
    } catch (err) {
      callbacksRef.current.onError?.('마이크 접근 실패')
      console.error(err)
    }
  }, [silenceDurationMs, silenceThresholdDb, createRecorder, segmentRecording])

  // ── 녹음 중지 (마지막 세그먼트 처리 + 정리) ──
  const stopRecording = useCallback(() => {
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
      isFinalStopRef.current = true
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
      // 레코더 없으면 바로 정리
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      audioCtxRef.current?.close().catch(() => {})
      audioCtxRef.current = null
      analyserRef.current = null
      recorderRef.current = null
      setStatus('idle')
    }
  }, [processSegment])

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
    }
  }, [])

  return {
    status,
    seconds,
    lastText,
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
