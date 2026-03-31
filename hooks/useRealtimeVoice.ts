'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

// ── 타입 ──

export type RealtimeStatus = 'idle' | 'listening' | 'processing' | 'speaking'

interface UseRealtimeVoiceOptions {
  /** 전사 완료 콜백 — 서버 VAD가 발화 종료를 감지하면 호출 */
  onTranscript: (text: string) => void
  /** 사용자 발화 시작 */
  onSpeechStart?: () => void
  /** 사용자 발화 종료 */
  onSpeechEnd?: () => void
  /** 에러 */
  onError?: (error: string) => void
}

// ── Realtime API 이벤트 타입 ──

interface RealtimeEvent {
  type: string
  [key: string]: unknown
}

interface TranscriptionEvent extends RealtimeEvent {
  type: 'conversation.item.input_audio_transcription.completed'
  transcript: string
}

/**
 * OpenAI Realtime API (WebRTC) 기반 음성 훅.
 *
 * - 마이크 1개로 STT + VAD 통합 (Web Speech / MediaRecorder 충돌 없음)
 * - 서버 VAD가 발화 종료를 자동 감지하여 전사 결과 전달
 * - mute/unmute로 TTS 재생 중 마이크 차단
 */
export function useRealtimeVoice(options: UseRealtimeVoiceOptions) {
  const { onTranscript, onSpeechStart, onSpeechEnd, onError } = options

  const callbacksRef = useRef({ onTranscript, onSpeechStart, onSpeechEnd, onError })
  callbacksRef.current = { onTranscript, onSpeechStart, onSpeechEnd, onError }

  const [status, setStatus] = useState<RealtimeStatus>('idle')
  const [seconds, setSeconds] = useState(0)
  const [lastText, setLastText] = useState('')
  const [isConnected, setIsConnected] = useState(false)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mutedRef = useRef(false)

  // ── 연결 ──
  const connect = useCallback(async () => {
    if (pcRef.current) return // 이미 연결됨

    try {
      // 1. 에페머럴 토큰 발급
      const tokenRes = await fetch('/api/realtime/session', { method: 'POST' })
      if (!tokenRes.ok) throw new Error('세션 토큰 발급 실패')
      const tokenData = await tokenRes.json()
      const ephemeralKey = tokenData.client_secret?.value
      if (!ephemeralKey) throw new Error('에페머럴 키 없음')

      // 2. WebRTC PeerConnection 생성
      const pc = new RTCPeerConnection()
      pcRef.current = pc

      // 3. 오디오 출력 (Realtime이 오디오를 보내는 경우 대비)
      const audioEl = document.createElement('audio')
      audioEl.autoplay = true
      audioRef.current = audioEl
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0]
      }

      // 4. 마이크 스트림 추가
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))

      // 5. 데이터 채널 (이벤트 수신)
      const dc = pc.createDataChannel('oai-events')
      dcRef.current = dc

      dc.onopen = () => {
        console.log('[Realtime] data channel open')
        setIsConnected(true)
        setStatus('listening')

        // 응답을 최소화하도록 세션 업데이트
        dc.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text'],
            instructions: '사용자의 음성을 받아적기만 하세요. 응답은 OK만 출력하세요.',
            input_audio_transcription: {
              model: 'whisper-1',
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 2000,
            },
          },
        }))
      }

      dc.onmessage = (event) => {
        const data = JSON.parse(event.data) as RealtimeEvent

        switch (data.type) {
          case 'input_audio_buffer.speech_started':
            console.log('[Realtime] speech started')
            if (!mutedRef.current) {
              setStatus('listening')
              setSeconds(0)
              // 녹음 타이머 시작
              if (timerRef.current) clearInterval(timerRef.current)
              timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
              callbacksRef.current.onSpeechStart?.()
            }
            break

          case 'input_audio_buffer.speech_stopped':
            console.log('[Realtime] speech stopped')
            if (timerRef.current) {
              clearInterval(timerRef.current)
              timerRef.current = null
            }
            setStatus('processing')
            callbacksRef.current.onSpeechEnd?.()
            break

          case 'conversation.item.input_audio_transcription.completed': {
            const transcript = (data as TranscriptionEvent).transcript
            console.log('[Realtime] transcript:', transcript)
            if (transcript && transcript.trim().length > 0) {
              setLastText(transcript)
              callbacksRef.current.onTranscript(transcript)
            }
            // 전사 완료 후 다시 listening
            if (!mutedRef.current) {
              setStatus('listening')
            }
            break
          }

          case 'response.created':
            // AI 응답 자동 생성 → 즉시 취소 (우리는 Claude 사용)
            dc.send(JSON.stringify({ type: 'response.cancel' }))
            break

          case 'error':
            console.error('[Realtime] error:', data)
            callbacksRef.current.onError?.(String((data as { error?: { message?: string } }).error?.message ?? 'Realtime 에러'))
            break
        }
      }

      dc.onclose = () => {
        console.log('[Realtime] data channel closed')
        setIsConnected(false)
        setStatus('idle')
      }

      // 6. SDP offer → OpenAI → SDP answer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const sdpRes = await fetch(
        'https://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview-2024-12-17',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ephemeralKey}`,
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        },
      )

      if (!sdpRes.ok) throw new Error(`SDP 응답 실패: ${sdpRes.status}`)
      const answerSdp = await sdpRes.text()
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })

      console.log('[Realtime] connected')
    } catch (err) {
      console.error('[Realtime] connect failed:', err)
      callbacksRef.current.onError?.(err instanceof Error ? err.message : 'Realtime 연결 실패')
      cleanup()
    }
  }, [])

  // ── 연결 해제 ──
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    dcRef.current?.close()
    dcRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    pcRef.current?.close()
    pcRef.current = null
    if (audioRef.current) {
      audioRef.current.srcObject = null
      audioRef.current = null
    }
    setIsConnected(false)
    setStatus('idle')
    setSeconds(0)
    mutedRef.current = false
  }, [])

  const disconnect = useCallback(() => {
    console.log('[Realtime] disconnect')
    cleanup()
  }, [cleanup])

  // ── 마이크 뮤트/언뮤트 (TTS 재생 중) ──
  const mute = useCallback(() => {
    mutedRef.current = true
    streamRef.current?.getTracks().forEach(t => { t.enabled = false })
  }, [])

  const unmute = useCallback(() => {
    mutedRef.current = false
    streamRef.current?.getTracks().forEach(t => { t.enabled = true })
    if (isConnected) setStatus('listening')
  }, [isConnected])

  // ── TTS 재생 (mute 포함) ──
  const playTts = useCallback(async (text: string) => {
    try {
      mute()
      setStatus('speaking')

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) {
        unmute()
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)

      audio.onended = () => {
        URL.revokeObjectURL(url)
        unmute()
      }
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        unmute()
      }

      await audio.play()
    } catch {
      unmute()
    }
  }, [mute, unmute])

  // ── 토글 (VoiceBar 호환) ──
  const toggleConnection = useCallback(() => {
    if (isConnected) {
      disconnect()
    } else {
      connect()
    }
  }, [isConnected, connect, disconnect])

  // ── TTS 중지 ──
  const stopSpeaking = useCallback(() => {
    // 현재 재생 중인 오디오가 있다면 중지할 수 없지만, unmute는 해줌
    unmute()
  }, [unmute])

  // ── 클린업 ──
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    // VoiceBar 호환 인터페이스
    status: status as 'idle' | 'listening' | 'processing' | 'speaking',
    seconds,
    lastText,
    toggleRecording: toggleConnection,
    stopSpeaking,
    // 추가 API
    connect,
    disconnect,
    isConnected,
    playTts,
    mute,
    unmute,
  }
}
