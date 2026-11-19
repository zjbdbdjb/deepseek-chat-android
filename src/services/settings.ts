import { create } from 'zustand'
import type { ChatModel, TtsVoice } from './api/types.js'
import { normalizeLocation, type UserLocation } from './location.js'
import { DEFAULT_SYSTEM_PROMPT, type PromptPreset } from './prompts.js'

export type Locale = 'zh-CN' | 'en-US'

/** 主题偏好；默认跟随系统 */
export type ThemePreference = 'light' | 'dark' | 'system'

/** 字号偏好 */
export type FontSizePreference = 'small' | 'medium' | 'large'

/** 语音识别引擎：api 使用 DeepSeek ASR；browser 使用设备/浏览器实时语音识别 */
export type VoiceEngine = 'api' | 'browser'

const NEW_SESSION_PROMPT_KEY = '__new__'

/** 本机设置，存 localStorage */
type Settings = {
  apiKey: string | null
  apiOrigin: string
  model: ChatModel
  systemPrompt: string
  customPresets: PromptPreset[]
  sessionPrompts: Record<string, string>
  pinnedSessionIds: string[]
  locale: Locale
  themePreference: ThemePreference
  fontSize: FontSizePreference
  showTokenUsage: boolean
  location: UserLocation | null
  ttsVoice: TtsVoice
  voiceEngine: VoiceEngine
  voiceAutoSend: boolean
  voiceAutoReadAloud: boolean
  thinking: boolean
  search: boolean
  siderCollapsed: boolean
}

const KEYS = {
  apiKey: 'chat-demo:api-key',
  apiOrigin: 'chat-demo:api-origin',
  model: 'chat-demo:model',
  systemPrompt: 'chat-demo:system-prompt',
  customPresets: 'chat-demo:custom-presets',
  sessionPrompts: 'chat-demo:session-prompts',
  pinnedSessionIds: 'chat-demo:pinned-sessions',
  locale: 'chat-demo:locale',
  location: 'chat-demo:location',
  themePreference: 'chat-demo:theme-preference',
  fontSize: 'chat-demo:font-size',
  showTokenUsage: 'chat-demo:show-token-usage',
  ttsVoice: 'chat-demo:tts-voice',
  voiceEngine: 'chat-demo:voice-engine',
  voiceAutoSend: 'chat-demo:voice-auto-send',
  voiceAutoReadAloud: 'chat-demo:voice-auto-read-aloud',
  thinking: 'chat-demo:thinking',
  search: 'chat-demo:search',
  siderCollapsed: 'chat-demo:sider-collapsed',
} as const

const read = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const write = (key: string, value: string | null) => {
  try {
    if (value === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, value)
    }
  } catch {
    // 存储不可用时只在内存中生效
  }
}

const readJson = <T>(key: string, fallback: T): T => {
  const raw = read(key)
  if (!raw) {
    return fallback
  }
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** 位置选择模式跟随浏览器语言，与应用内选择的界面语言无关。 */
export const isChineseBrowser = (): boolean =>
  (typeof navigator === 'undefined' ? 'zh' : navigator.language).toLowerCase().startsWith('zh')

const initialLocale = (): Locale => {
  const saved = read(KEYS.locale)
  if (saved === 'zh-CN' || saved === 'en-US') {
    return saved
  }
  return isChineseBrowser() ? 'zh-CN' : 'en-US'
}

const initialLocation = (): UserLocation | null => {
  try {
    const location = normalizeLocation(JSON.parse(read(KEYS.location) ?? 'null'))
    if (!location) {
      return null
    }
    return isChineseBrowser()
      ? location.region === 'CN' && location.province
        ? location
        : null
      : { region: location.region }
  } catch {
    return null
  }
}

/** 未保存过时跟随系统 */
const initialThemePreference = (): ThemePreference => {
  const saved = read(KEYS.themePreference)
  return saved === 'light' || saved === 'dark' ? saved : 'system'
}

const initialFontSize = (): FontSizePreference => {
  const saved = read(KEYS.fontSize)
  return saved === 'small' || saved === 'large' ? saved : 'medium'
}

const initialModel = (): ChatModel =>
  read(KEYS.model) === 'deepseek-v4-pro' ? 'deepseek-v4-pro' : 'deepseek-flash'

const initialVoiceEngine = (): VoiceEngine =>
  read(KEYS.voiceEngine) === 'browser' ? 'browser' : 'api'

const initialCustomPresets = (): PromptPreset[] => {
  const raw = readJson<unknown>(KEYS.customPresets, [])
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.filter(
    (item): item is PromptPreset =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as PromptPreset).id === 'string' &&
      typeof (item as PromptPreset).name === 'string' &&
      typeof (item as PromptPreset).prompt === 'string'
  )
}

const initialSessionPrompts = (): Record<string, string> => {
  const raw = readJson<unknown>(KEYS.sessionPrompts, {})
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return {}
  }
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string' && value.trim()) {
      result[key] = value
    }
  }
  return result
}

const initialPinnedSessionIds = (): string[] => {
  const raw = readJson<unknown>(KEYS.pinnedSessionIds, [])
  return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : []
}

/** 校验并归一化自定义 API 地址；无效时返回 null */
export const normalizeApiOrigin = (value: string): string | null => {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }
    return parsed.origin + parsed.pathname.replace(/\/+$/, '')
  } catch {
    return null
  }
}

/** 未保存过时使用服务端默认音色 stella（海星） */
const initialTtsVoice = (): TtsVoice => (read(KEYS.ttsVoice) === 'tide' ? 'tide' : 'stella')

export const useSettings = create<Settings>(() => ({
  apiKey: read(KEYS.apiKey),
  apiOrigin: normalizeApiOrigin(read(KEYS.apiOrigin) ?? '') ?? '',
  model: initialModel(),
  systemPrompt: read(KEYS.systemPrompt) ?? '',
  customPresets: initialCustomPresets(),
  sessionPrompts: initialSessionPrompts(),
  pinnedSessionIds: initialPinnedSessionIds(),
  locale: initialLocale(),
  location: initialLocation(),
  themePreference: initialThemePreference(),
  fontSize: initialFontSize(),
  showTokenUsage: read(KEYS.showTokenUsage) !== 'false',
  ttsVoice: initialTtsVoice(),
  voiceEngine: initialVoiceEngine(),
  voiceAutoSend: read(KEYS.voiceAutoSend) === 'true',
  voiceAutoReadAloud: read(KEYS.voiceAutoReadAloud) === 'true',
  thinking: read(KEYS.thinking) === 'true',
  search: read(KEYS.search) === 'true',
  siderCollapsed: read(KEYS.siderCollapsed) === 'true',
}))

/** 当前实际生效的 API Origin（优先用户自定义，否则使用构建期默认值） */
export const getApiOrigin = (): string => {
  const custom = useSettings.getState().apiOrigin.trim()
  return custom || __API_ORIGIN__
}

export const setApiOrigin = (value: string): boolean => {
  const normalized = normalizeApiOrigin(value)
  if (normalized === null) {
    return false
  }
  write(KEYS.apiOrigin, normalized || null)
  useSettings.setState({ apiOrigin: normalized })
  return true
}

export const setModel = (model: ChatModel) => {
  write(KEYS.model, model)
  useSettings.setState({ model })
}

export const setSystemPrompt = (prompt: string) => {
  const cleaned = prompt.trim()
  write(KEYS.systemPrompt, cleaned || null)
  useSettings.setState({ systemPrompt: cleaned })
}

export const addCustomPreset = (name: string, prompt: string): PromptPreset | null => {
  const cleanName = name.trim()
  const cleanPrompt = prompt.trim()
  if (!cleanName || !cleanPrompt) {
    return null
  }
  const preset: PromptPreset = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName,
    prompt: cleanPrompt,
  }
  const next = [preset, ...useSettings.getState().customPresets]
  write(KEYS.customPresets, JSON.stringify(next))
  useSettings.setState({ customPresets: next })
  return preset
}

export const deleteCustomPreset = (id: string) => {
  const next = useSettings.getState().customPresets.filter((item) => item.id !== id)
  write(KEYS.customPresets, next.length > 0 ? JSON.stringify(next) : null)
  useSettings.setState({ customPresets: next })
}

const sessionPromptKey = (sessionId: string | null) => sessionId ?? NEW_SESSION_PROMPT_KEY

/** 获取指定会话的独立提示词（空串表示沿用全局提示词） */
export const getSessionPromptOverride = (sessionId: string | null): string =>
  useSettings.getState().sessionPrompts[sessionPromptKey(sessionId)] ?? ''

/** 设置指定会话的独立提示词；传空串则恢复沿用全局设置 */
export const setSessionPromptOverride = (sessionId: string | null, prompt: string) => {
  const key = sessionPromptKey(sessionId)
  const cleaned = prompt.trim()
  const current = useSettings.getState().sessionPrompts
  const next: Record<string, string> = cleaned
    ? { ...current, [key]: cleaned }
    : Object.fromEntries(Object.entries(current).filter(([entryKey]) => entryKey !== key))
  write(KEYS.sessionPrompts, Object.keys(next).length > 0 ? JSON.stringify(next) : null)
  useSettings.setState({ sessionPrompts: next })
}

/** 新建会话时将欢迎页草稿提示词转移到新会话 */
export const transferDraftSessionPrompt = (newSessionId: string) => {
  const current = useSettings.getState().sessionPrompts
  const draft = current[NEW_SESSION_PROMPT_KEY]
  if (!draft) {
    return
  }
  const rest = Object.fromEntries(
    Object.entries(current).filter(([entryKey]) => entryKey !== NEW_SESSION_PROMPT_KEY)
  )
  const next: Record<string, string> = { ...rest, [newSessionId]: draft }
  write(KEYS.sessionPrompts, JSON.stringify(next))
  useSettings.setState({ sessionPrompts: next })
}

/** 获取发往 DeepSeek API 的最终系统提示词 */
export const getEffectiveSystemPrompt = (sessionId: string | null): string => {
  const state = useSettings.getState()
  const override = state.sessionPrompts[sessionPromptKey(sessionId)]?.trim()
  if (override) {
    return override
  }
  const globalPrompt = state.systemPrompt.trim()
  return globalPrompt || DEFAULT_SYSTEM_PROMPT
}

/** 判断指定会话当前是否使用了非默认提示词 */
export const hasCustomSystemPrompt = (sessionId: string | null): boolean =>
  getEffectiveSystemPrompt(sessionId) !== DEFAULT_SYSTEM_PROMPT

export const togglePinSession = (sessionId: string) => {
  const current = useSettings.getState().pinnedSessionIds
  const exists = current.includes(sessionId)
  const next = exists ? current.filter((id) => id !== sessionId) : [sessionId, ...current]
  write(KEYS.pinnedSessionIds, next.length > 0 ? JSON.stringify(next) : null)
  useSettings.setState({ pinnedSessionIds: next })
}

export const removeSessionMeta = (sessionId: string) => {
  const state = useSettings.getState()
  const pinnedNext = state.pinnedSessionIds.filter((id) => id !== sessionId)
  const hasPrompt = Object.hasOwn(state.sessionPrompts, sessionId)
  if (pinnedNext.length === state.pinnedSessionIds.length && !hasPrompt) {
    return
  }
  const promptsNext = hasPrompt
    ? Object.fromEntries(Object.entries(state.sessionPrompts).filter(([key]) => key !== sessionId))
    : state.sessionPrompts
  write(KEYS.pinnedSessionIds, pinnedNext.length > 0 ? JSON.stringify(pinnedNext) : null)
  write(
    KEYS.sessionPrompts,
    Object.keys(promptsNext).length > 0 ? JSON.stringify(promptsNext) : null
  )
  useSettings.setState({ pinnedSessionIds: pinnedNext, sessionPrompts: promptsNext })
}

export const clearAllSessionMeta = () => {
  const draft = useSettings.getState().sessionPrompts[NEW_SESSION_PROMPT_KEY]
  const promptsNext: Record<string, string> = draft ? { [NEW_SESSION_PROMPT_KEY]: draft } : {}
  write(KEYS.pinnedSessionIds, null)
  write(
    KEYS.sessionPrompts,
    Object.keys(promptsNext).length > 0 ? JSON.stringify(promptsNext) : null
  )
  useSettings.setState({ pinnedSessionIds: [], sessionPrompts: promptsNext })
}

export const setLocale = (locale: Locale) => {
  write(KEYS.locale, locale)
  useSettings.setState({ locale })
}

export const setLocation = (value: UserLocation | null) => {
  const location = normalizeLocation(value)
  write(KEYS.location, location ? JSON.stringify(location) : null)
  useSettings.setState({ location })
}

export const setThemePreference = (themePreference: ThemePreference) => {
  write(KEYS.themePreference, themePreference)
  useSettings.setState({ themePreference })
}

export const setFontSize = (fontSize: FontSizePreference) => {
  write(KEYS.fontSize, fontSize)
  useSettings.setState({ fontSize })
}

export const setShowTokenUsage = (showTokenUsage: boolean) => {
  write(KEYS.showTokenUsage, String(showTokenUsage))
  useSettings.setState({ showTokenUsage })
}

export const setTtsVoice = (ttsVoice: TtsVoice) => {
  write(KEYS.ttsVoice, ttsVoice)
  useSettings.setState({ ttsVoice })
}

export const setVoiceEngine = (voiceEngine: VoiceEngine) => {
  write(KEYS.voiceEngine, voiceEngine)
  useSettings.setState({ voiceEngine })
}

export const setVoiceAutoSend = (voiceAutoSend: boolean) => {
  write(KEYS.voiceAutoSend, String(voiceAutoSend))
  useSettings.setState({ voiceAutoSend })
}

export const setVoiceAutoReadAloud = (voiceAutoReadAloud: boolean) => {
  write(KEYS.voiceAutoReadAloud, String(voiceAutoReadAloud))
  useSettings.setState({ voiceAutoReadAloud })
}

export const setApiKey = (apiKey: string | null) => {
  write(KEYS.apiKey, apiKey)
  useSettings.setState({ apiKey })
}

export const setThinking = (thinking: boolean) => {
  write(KEYS.thinking, String(thinking))
  useSettings.setState({ thinking })
}

export const setSearch = (search: boolean) => {
  write(KEYS.search, String(search))
  useSettings.setState({ search })
}

export const setSiderCollapsed = (siderCollapsed: boolean) => {
  write(KEYS.siderCollapsed, String(siderCollapsed))
  useSettings.setState({ siderCollapsed })
}
