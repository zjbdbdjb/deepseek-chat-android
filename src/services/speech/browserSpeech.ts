/** 浏览器/系统自带的 Web Speech Recognition 轻量封装（无须额外语音 API 费用，支持实时字幕） */

type SpeechRecognitionAlternativeLike = { transcript: string }

type SpeechRecognitionResultLike = {
  readonly isFinal: boolean
  readonly length: number
  readonly [index: number]: SpeechRecognitionAlternativeLike | undefined
}

type SpeechRecognitionEventLike = {
  readonly resultIndex: number
  readonly results: {
    readonly length: number
    readonly [index: number]: SpeechRecognitionResultLike | undefined
  }
}

type SpeechRecognitionErrorEventLike = {
  readonly error: string
}

type SpeechRecognitionInstance = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | null => {
  if (typeof window === 'undefined') {
    return null
  }
  const win = window as unknown as Record<string, unknown>
  const ctor = win.SpeechRecognition ?? win.webkitSpeechRecognition
  return typeof ctor === 'function' ? (ctor as SpeechRecognitionConstructor) : null
}

export const isBrowserSpeechSupported = (): boolean => getSpeechRecognitionConstructor() !== null

export type BrowserSpeechSession = {
  stop: () => void
  cancel: () => void
}

export const startBrowserSpeech = ({
  lang,
  onUpdate,
  onComplete,
  onError,
}: {
  lang: string
  onUpdate: (text: string) => void
  onComplete: (text: string) => void
  onError: (code: string) => void
}): BrowserSpeechSession | null => {
  const Ctor = getSpeechRecognitionConstructor()
  if (!Ctor) {
    return null
  }
  const recognition = new Ctor()
  recognition.lang = lang
  recognition.continuous = true
  recognition.interimResults = true

  let finalText = ''
  let latestText = ''
  let cancelled = false
  let completed = false

  const finish = () => {
    if (completed || cancelled) {
      return
    }
    completed = true
    onComplete(latestText.trim())
  }

  recognition.onresult = (event) => {
    if (cancelled) {
      return
    }
    let interim = ''
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i]
      const transcript = result?.[0]?.transcript ?? ''
      if (result?.isFinal) {
        finalText += transcript
      } else {
        interim += transcript
      }
    }
    latestText = `${finalText}${interim}`
    onUpdate(latestText)
  }

  recognition.onerror = (event) => {
    if (cancelled || completed) {
      return
    }
    if (event.error === 'aborted') {
      return
    }
    completed = true
    onError(event.error)
  }

  recognition.onend = () => {
    finish()
  }

  recognition.start()

  return {
    stop: () => {
      try {
        recognition.stop()
      } catch {
        finish()
      }
    },
    cancel: () => {
      cancelled = true
      try {
        recognition.abort()
      } catch {
        // 忽略已停止状态
      }
    },
  }
}
