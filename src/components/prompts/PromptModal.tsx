import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { useTranslate } from '../../i18n/index.js'
import { DEFAULT_SYSTEM_PROMPT, getBuiltinPresets } from '../../services/prompts.js'
import {
  addCustomPreset,
  deleteCustomPreset,
  getSessionPromptOverride,
  setSessionPromptOverride,
  setSystemPrompt,
  useSettings,
} from '../../services/settings.js'
import { Button } from '../base/Button.js'
import { IconCloseFill14 } from '../base/icons.js'
import { Modal } from '../base/Modal.js'
import { showToast } from '../base/toastState.js'
import { closePromptModal, usePromptModal } from './promptModalState.js'
import styles from './PromptModal.module.css'

/** 系统提示词与角色预设弹窗：支持为当前对话单独定制或修改全局默认提示词 */
export const PromptModal = () => {
  const open = usePromptModal((state) => state.open)
  const sessionId = usePromptModal((state) => state.sessionId)
  return open ? <PromptModalContent key={sessionId ?? '__new__'} sessionId={sessionId} /> : null
}

const PromptModalContent = ({ sessionId }: { sessionId: string | null }) => {
  const t = useTranslate()
  const locale = useSettings((state) => state.locale)
  const globalPrompt = useSettings((state) => state.systemPrompt)
  const customPresets = useSettings((state) => state.customPresets)

  const [scope, setScope] = useState<'session' | 'global'>(() =>
    getSessionPromptOverride(sessionId) ? 'session' : sessionId ? 'session' : 'global'
  )
  const [sessionDraft, setSessionDraft] = useState(() => getSessionPromptOverride(sessionId))
  const [globalDraft, setGlobalDraft] = useState(() => globalPrompt)
  const [presetName, setPresetName] = useState('')

  const presets = useMemo(
    () => [...customPresets, ...getBuiltinPresets(locale)],
    [customPresets, locale]
  )

  const currentValue = scope === 'session' ? sessionDraft : globalDraft
  const setCurrentValue = (value: string) => {
    if (scope === 'session') {
      setSessionDraft(value)
    } else {
      setGlobalDraft(value)
    }
  }

  const effectivePreview = currentValue.trim() || DEFAULT_SYSTEM_PROMPT

  const onSave = () => {
    setSessionPromptOverride(sessionId, sessionDraft)
    setSystemPrompt(globalDraft)
    showToast({ key: 'promptSaved' })
    closePromptModal()
  }

  const onSavePreset = () => {
    const created = addCustomPreset(presetName, currentValue)
    if (created) {
      setPresetName('')
      showToast({ key: 'promptPresetSaved' })
    }
  }

  return (
    <Modal
      title={t('promptSessionTitle')}
      closable
      className={styles.dialog}
      mainClassName={styles.main}
      onClose={closePromptModal}
      footer={
        <div className={styles.footer}>
          <Button
            variant="outlined"
            size="m"
            onClick={() => setCurrentValue('')}
            disabled={!currentValue.trim()}
          >
            {t('settingsSystemPromptReset')}
          </Button>
          <div className={styles.footerRight}>
            <Button variant="outlined" size="m" onClick={closePromptModal}>
              {t('cancel')}
            </Button>
            <Button variant="primary" size="m" onClick={onSave}>
              {t('save')}
            </Button>
          </div>
        </div>
      }
    >
      <div className={styles.scopeTabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={scope === 'session'}
          className={clsx(styles.scopeTab, scope === 'session' && styles.scopeTabActive)}
          onClick={() => setScope('session')}
        >
          {t('promptScopeSession')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={scope === 'global'}
          className={clsx(styles.scopeTab, scope === 'global' && styles.scopeTabActive)}
          onClick={() => setScope('global')}
        >
          {t('promptScopeGlobal')}
        </button>
      </div>

      <div className={styles.sectionLabel}>{t('promptPresetsLabel')}</div>
      <div className={styles.presetList}>
        {presets.map((preset) => {
          const isDefault = preset.prompt === DEFAULT_SYSTEM_PROMPT
          const active =
            (isDefault && !currentValue.trim()) ||
            effectivePreview === preset.prompt.trim()
          return (
            <button
              key={preset.id}
              type="button"
              className={clsx(styles.presetChip, active && styles.presetChipActive)}
              onClick={() => setCurrentValue(isDefault ? '' : preset.prompt)}
            >
              <span>{preset.name}</span>
              {!preset.builtin ? (
                <span
                  role="button"
                  tabIndex={0}
                  className={styles.presetDelete}
                  aria-label={t('delete')}
                  onClick={(event) => {
                    event.stopPropagation()
                    deleteCustomPreset(preset.id)
                    showToast({ key: 'promptPresetDeleted' })
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      event.stopPropagation()
                      deleteCustomPreset(preset.id)
                      showToast({ key: 'promptPresetDeleted' })
                    }
                  }}
                >
                  <IconCloseFill14 />
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <textarea
        className={styles.textarea}
        value={currentValue}
        placeholder={
          scope === 'session'
            ? t('promptSessionPlaceholder')
            : t('settingsSystemPromptPlaceholder')
        }
        onChange={(event) => setCurrentValue(event.target.value)}
      />

      <div className={styles.savePresetRow}>
        <input
          type="text"
          className={styles.presetNameInput}
          value={presetName}
          maxLength={24}
          placeholder={t('promptPresetNamePlaceholder')}
          onChange={(event) => setPresetName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault()
              onSavePreset()
            }
          }}
        />
        <Button
          variant="outlined"
          size="m"
          disabled={!presetName.trim() || !currentValue.trim()}
          onClick={onSavePreset}
        >
          {t('promptSaveAsPreset')}
        </Button>
      </div>
    </Modal>
  )
}
