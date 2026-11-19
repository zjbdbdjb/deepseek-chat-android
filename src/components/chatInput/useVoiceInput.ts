import { useCallback, useEffect, useRef, useState } from 'react'
import type { TranslationMessage } from '../../i18n/index.js'
import { transcribe } from '../../services/api/speech.js'
import {
  isBrowserSpeechSupported,
  startBrowserSpeech,
  type BrowserSpeechSession,
} from '../../services/speech/browserSpeech.js'
import { startRecording, type Recording } from '../../services/speech/recorder.js'
import { useSettings } from '../../services/settings.js'
import { showToast } from '../base/toastState.js'

export type VoiceInputStatus = 'idle' | 'recording' | 'transcribing'

/**
 * 录音依赖 getUserMedia 或系统 SpeechRecognition，只在安全上下文可用（HTTPS、localhost、file://）。
 * 普通 HTTP 页面上直接禁用入口，避免点击后必然失败。
 */
const AVAILABLE = typeof window === 'undefined' || window.isSecureContext

const describeRecordingError = (error: unknown): TranslationMessage => {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return { key: 'voiceInputPermissionDenied' }
    }
    if (error.name === 'NotFoundError') {
      return { key: 'voiceInputNoDevice' }
    }
  }
  return { key: 'voiceInputFailed' }
}

const describeBrowserSpeechError = (code: string): TranslationMessage => {
  if (code === 'not-allowed' || code === 'service-not-allowed') {
    return { key: 'voiceInputPermissionDenied' }
  }
  if (code === 'audio-capture') {
    return { key: 'voiceInputNoDevice' }
  }
  if (code === 'no-speech') {
    return { key: 'voiceInputEmpty' }
  }
  return { key: 'voiceInputFailed' }
}

/**
 * 语音输入：支持两种引擎
 * - api：录制 WAV 并调用 DeepSeek ASR（准确率高，支持实时音频频谱）
 * - browser：调用设备/浏览器实时语音识别（边说边出字，零 ASR 费用；不支持时自动回退到 api）
 * 支持语音识别后自动发送及随时取消本次录音。
 */
export const useVoiceInput = ({
  onText,
  onInterim,
}: {
  onText: (text: string, options: { autoSend: boolean }) => void
  onInterim?: (text: string) => void
}) => {
  const [status, setStatus] = useState<VoiceInputStatus>('idle')
  const [liveMode, setLiveMode] = useState(false)
  /** 本次录音已录秒数，只在录音中递增 */
  const [seconds, setSeconds] = useState(0)
  const recordingRef = useRef<Recording | null>(null)
  const browserSpeechRef = useRef<BrowserSpeechSession | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const operationRef = useRef(0)
  const onTextRef = useRef(onText)
  onTextRef.current = onText
  const onInterimRef = useRef(onInterim)
  onInterimRef.current = onInterim

  const cancelOperation = useCallback(() => {
    operationRef.current++
    recordingRef.current?.cancel()
    recordingRef.current = null
    browserSpeechRef.current?.cancel()
    browserSpeechRef.current = null
    controllerRef.current?.abort()
    controllerRef.current = null
  }, [])

  const cancel = useCallback(() => {
    cancelOperation()
    setLiveMode(false)
    setStatus('idle')
    onInterimRef.current?.('')
  }, [cancelOperation])

  const finish = useCallback(async () => {
    if (browserSpeechRef.current) {
      const session = browserSpeechRef.current
      browserSpeechRef.current = null
      session.stop()
      return
    }
    const recording = recordingRef.current
    if (!recording) {
      cancel()
      return
    }
    const operation = operationRef.current
    recordingRef.current = null
    let controller: AbortController | null = null
    try {
      let audio: Blob | null
      try {
        audio = await recording.stop()
      } finally {
        recording.cancel()
      }
      if (operationRef.current !== operation || !audio) {
        return
      }
      controller = new AbortController()
      controllerRef.current = controller
      setStatus('transcribing')
      const text = await transcribe(useSettings.getState().apiKey ?? '', audio, controller.signal)
      if (controller.signal.aborted || operationRef.current !== operation) {
        return
      }
      if (text.trim()) {
        onTextRef.current(text.trim(), { autoSend: useSettings.getState().voiceAutoSend })
      } else {
        showToast({ key: 'voiceInputEmpty' })
      }
    } catch {
      if (operationRef.current === operation && !controller?.signal.aborted) {
        showToast({ key: 'voiceInputFailed' })
      }
    } finally {
      if (operationRef.current === operation) {
        controllerRef.current = null
        setLiveMode(false)
        setStatus('idle')
      }
    }
  }, [cancel])

  const toggle = useCallback(async () => {
    if (!AVAILABLE) {
      return
    }
    if (status === 'recording') {
      await finish()
      return
    }
    if (status === 'transcribing') {
      cancel()
      return
    }
    const operation = ++operationRef.current
    const { voiceEngine, locale } = useSettings.getState()

    if (voiceEngine === 'browser') {
      if (isBrowserSpeechSupported()) {
        setLiveMode(true)
        setStatus('recording')
        try {
          const session = startBrowserSpeech({
            lang: locale,
            onUpdate: (text) => {
              if (operationRef.current === operation) {
                onInterimRef.current?.(text)
              }
            },
            onComplete: (text) => {
              if (operationRef.current !== operation) {
                return
              }
              browserSpeechRef.current = null
              setLiveMode(false)
              setStatus('idle')
              onInterimRef.current?.('')
              if (text) {
                onTextRef.current(text, { autoSend: useSettings.getState().voiceAutoSend })
              } else {
                showToast({ key: 'voiceInputEmpty' })
              }
            },
            onError: (code) => {
              if (operationRef.current !== operation) {
                return
              }
              browserSpeechRef.current = null
              setLiveMode(false)
              setStatus('idle')
              onInterimRef.current?.('')
              showToast(describeBrowserSpeechError(code))
            },
          })
          if (session) {
            browserSpeechRef.current = session
            return
          }
        } catch (error) {
          if (operationRef.current === operation) {
            setLiveMode(false)
            setStatus('idle')
            showToast(describeRecordingError(error))
          }
          return
        }
      } else {
        showToast({ key: 'voiceInputBrowserUnsupported' })
      }
    }

    setLiveMode(false)
    setStatus('recording')
    try {
      const recording = await startRecording(() => {
        if (operationRef.current === operation) {
          showToast({ key: 'voiceInputLimitReached' })
          void finish()
        }
      })
      if (operationRef.current !== operation) {
        recording.cancel()
        return
      }
      recordingRef.current = recording
    } catch (error) {
      if (operationRef.current === operation) {
        setStatus('idle')
        showToast(describeRecordingError(error))
      }
    }
  }, [status, finish, cancel])

  useEffect(() => {
    if (status !== 'recording') {
      return
    }
    const startedAt = Date.now()
    setSeconds(0)
    const timer = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt) / 1000))
    }, 500)
    return () => clearInterval(timer)
  }, [status])

  useEffect(() => cancelOperation, [cancelOperation])

  /** 当前录音的频谱分析节点，未录音或实时语音模式下为 null */
  const getAnalyser = useCallback(() => recordingRef.current?.analyser ?? null, [])

  return { status, liveMode, seconds, getAnalyser, toggle, cancel, available: AVAILABLE }
}
