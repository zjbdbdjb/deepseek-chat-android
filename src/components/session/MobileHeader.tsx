import clsx from 'clsx'
import {
  IconDownloadOutline16,
  IconMenuOutline20,
  IconNewChatOutline20,
  IconSparkleOutline16,
} from '../base/icons.js'
import { useTranslate } from '../../i18n/index.js'
import { exportSessionMarkdown } from '../../services/chat/exportMarkdown.js'
import { newChat } from '../../services/chat/store.js'
import type { Session } from '../../services/chat/types.js'
import { hasCustomSystemPrompt, setModel, useSettings } from '../../services/settings.js'
import { IconButton } from '../base/IconButton.js'
import { showToast } from '../base/toastState.js'
import { openPromptModal } from '../prompts/promptModalState.js'
import { openMobileSider } from '../sider/mobileSiderState.js'
import styles from './MobileHeader.module.css'

/** 移动端顶栏：菜单 + 会话标题（或模型切换）+ 提示词设定 / 导出 Markdown / 新对话 */
export const MobileHeader = ({ title, session }: { title?: string; session?: Session }) => {
  const t = useTranslate()
  const model = useSettings((state) => state.model)
  const customPromptActive = useSettings((state) => {
    void state.systemPrompt
    void state.sessionPrompts
    return hasCustomSystemPrompt(session?.id ?? null)
  })
  const modelShort = model === 'deepseek-v4-pro' ? 'V4 Pro' : 'Flash'

  const toggleModel = () => {
    const next = model === 'deepseek-flash' ? 'deepseek-v4-pro' : 'deepseek-flash'
    setModel(next)
    showToast({
      key: 'switchedModelToast',
      params: { model: next === 'deepseek-v4-pro' ? 'DeepSeek V4 Pro' : 'DeepSeek Flash' },
    })
  }

  const onExport = async () => {
    if (!session) {
      return
    }
    try {
      await exportSessionMarkdown(session)
      showToast({ key: 'exportMarkdownSuccess' })
    } catch {
      showToast({ key: 'exportMarkdownFailed', type: 'error' })
    }
  }

  return (
    <div className={styles.header}>
      <IconButton
        size="xl"
        tone="primary"
        icon={<IconMenuOutline20 />}
        aria-label={t('expandSiderbarButton')}
        onClick={openMobileSider}
      />
      {title === undefined ? (
        <button
          type="button"
          className={styles.modelPill}
          aria-label={t('switchModelTooltip', { model: modelShort })}
          onClick={toggleModel}
        >
          {modelShort}
        </button>
      ) : (
        <div className={styles.title}>{title}</div>
      )}
      <div className={styles.actions}>
        {title !== undefined ? (
          <button
            type="button"
            className={styles.modelPillCompact}
            aria-label={t('switchModelTooltip', { model: modelShort })}
            onClick={toggleModel}
          >
            {modelShort}
          </button>
        ) : null}
        <div className={styles.promptWrap}>
          <IconButton
            size="m"
            tone="primary"
            icon={<IconSparkleOutline16 />}
            aria-label={t('promptButtonTooltip')}
            onClick={() => openPromptModal(session?.id ?? null)}
          />
          {customPromptActive ? <span className={styles.promptDot} aria-hidden /> : null}
        </div>
        {session && session.messages.length > 0 ? (
          <IconButton
            size="m"
            tone="primary"
            icon={<IconDownloadOutline16 />}
            aria-label={t('exportMarkdown')}
            onClick={() => void onExport()}
          />
        ) : null}
        {title !== undefined ? (
          <IconButton
            size="xl"
            tone="primary"
            icon={<IconNewChatOutline20 />}
            aria-label={t('newChat')}
            onClick={newChat}
          />
        ) : null}
      </div>
    </div>
  )
}

export const HeaderModelPill = ({
  sessionId,
  session,
  className,
}: {
  sessionId: string | null
  session?: Session
  className?: string
}) => {
  const t = useTranslate()
  const model = useSettings((state) => state.model)
  const customPromptActive = useSettings((state) => {
    void state.systemPrompt
    void state.sessionPrompts
    return hasCustomSystemPrompt(sessionId)
  })
  const modelShort = model === 'deepseek-v4-pro' ? 'V4 Pro' : 'Flash'

  const toggleModel = () => {
    const next = model === 'deepseek-flash' ? 'deepseek-v4-pro' : 'deepseek-flash'
    setModel(next)
    showToast({
      key: 'switchedModelToast',
      params: { model: next === 'deepseek-v4-pro' ? 'DeepSeek V4 Pro' : 'DeepSeek Flash' },
    })
  }

  const onExport = async () => {
    if (!session) {
      return
    }
    try {
      await exportSessionMarkdown(session)
      showToast({ key: 'exportMarkdownSuccess' })
    } catch {
      showToast({ key: 'exportMarkdownFailed', type: 'error' })
    }
  }

  return (
    <div className={clsx(styles.actions, className)}>
      <button
        type="button"
        className={styles.modelPillCompact}
        title={t('switchModelTooltip', { model: modelShort })}
        onClick={toggleModel}
      >
        {modelShort}
      </button>
      <div className={styles.promptWrap}>
        <IconButton
          size="m"
          tone="primary"
          icon={<IconSparkleOutline16 />}
          tooltip={t('promptButtonTooltip')}
          tooltipPlacement="bottom"
          onClick={() => openPromptModal(sessionId)}
        />
        {customPromptActive ? <span className={styles.promptDot} aria-hidden /> : null}
      </div>
      {session && session.messages.length > 0 ? (
        <IconButton
          size="m"
          tone="primary"
          icon={<IconDownloadOutline16 />}
          tooltip={t('exportMarkdown')}
          tooltipPlacement="bottom"
          onClick={() => void onExport()}
        />
      ) : null}
    </div>
  )
}
