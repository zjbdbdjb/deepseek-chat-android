import clsx from 'clsx'
import { useMemo } from 'react'
import { useIsMobile } from '../../app/viewport.js'
import { useTranslate } from '../../i18n/index.js'
import { setDraftText } from '../../services/chat/drafts.js'
import {
  DEFAULT_SYSTEM_PROMPT,
  getBuiltinPresets,
  getWelcomeStarters,
} from '../../services/prompts.js'
import {
  getEffectiveSystemPrompt,
  setSessionPromptOverride,
  setSystemPrompt,
  useSettings,
} from '../../services/settings.js'
import { IconSparkleOutline16 } from '../base/icons.js'
import { ChatInput } from '../chatInput/ChatInput.js'
import { openPromptModal } from '../prompts/promptModalState.js'
import { HeaderModelPill, MobileHeader } from './MobileHeader.js'
import styles from './Welcome.module.css'

/** 新对话：问候语 + 角色预设快捷切换 + 灵感起手式 + 输入框 */
export const Welcome = () => {
  const t = useTranslate()
  const isMobile = useIsMobile()
  const locale = useSettings((state) => state.locale)
  const customPresets = useSettings((state) => state.customPresets)
  const effectivePrompt = useSettings((state) => {
    void state.systemPrompt
    void state.sessionPrompts
    return getEffectiveSystemPrompt(null)
  })

  const presets = useMemo(
    () => [...customPresets.slice(0, 4), ...getBuiltinPresets(locale)],
    [customPresets, locale]
  )
  const starters = useMemo(() => getWelcomeStarters(locale), [locale])

  const selectPreset = (prompt: string) => {
    setSessionPromptOverride(null, '')
    setSystemPrompt(prompt === DEFAULT_SYSTEM_PROMPT ? '' : prompt)
  }

  return (
    <div className={styles.container}>
      {isMobile ? (
        <MobileHeader />
      ) : (
        <div className={styles.desktopBar}>
          <HeaderModelPill sessionId={null} />
        </div>
      )}
      <div className={styles.welcome}>
        <div className={styles.hero}>
          <div className={styles.greeting}>{t('welcomeMessageChat250808')}</div>
          <div className={styles.presetsRow} role="list">
            {presets.map((preset) => {
              const active = effectivePrompt.trim() === preset.prompt.trim()
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={clsx(styles.presetPill, active && styles.presetPillActive)}
                  onClick={() => selectPreset(preset.prompt)}
                >
                  {preset.name}
                </button>
              )
            })}
            <button
              type="button"
              className={styles.presetManage}
              onClick={() => openPromptModal(null)}
            >
              <IconSparkleOutline16 />
              <span>{t('promptManageButton')}</span>
            </button>
          </div>
          <div className={styles.starters}>
            {starters.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.starterCard}
                onClick={() => setDraftText(null, item.prompt)}
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>
        <ChatInput sessionId={null} />
        {isMobile ? <div className={styles.caveat}>{t('contentCaveat')}</div> : null}
      </div>
    </div>
  )
}
