import clsx from 'clsx'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import {
  IconCloseFill14,
  IconCpuOutline16,
  IconDarkOutline16,
  IconDataOutline16,
  IconDownloadOutline16,
  IconFollowsystemOutline16,
  IconLightOutline16,
  IconSettingsOutline16,
  IconUploadOutline14,
} from '../base/icons.js'
import {
  BackupError,
  clearHistory,
  exportHistory,
  importHistory,
} from '../../services/chat/backup.js'
import { saveOrShareFile } from '../../services/native/bridge.js'
import { DEFAULT_SYSTEM_PROMPT, getBuiltinPresets } from '../../services/prompts.js'
import { useIsMobile } from '../../app/viewport.js'
import { useChatStore } from '../../services/chat/store.js'
import { regionCodes, getRegionName, provinces } from '../../services/location.js'
import {
  addCustomPreset,
  deleteCustomPreset,
  isChineseBrowser,
  setApiOrigin,
  setFontSize,
  setLocale,
  setLocation,
  setModel,
  setShowTokenUsage,
  setSystemPrompt,
  setThemePreference,
  setTtsVoice,
  setVoiceAutoReadAloud,
  setVoiceAutoSend,
  setVoiceEngine,
  useSettings,
  type FontSizePreference,
  type ThemePreference,
  type VoiceEngine,
} from '../../services/settings.js'
import type { ChatModel } from '../../services/api/types.js'
import { useTranslate, type TranslationKey, type TranslationMessage } from '../../i18n/index.js'
import { Button } from '../base/Button.js'
import { Modal } from '../base/Modal.js'
import { Select } from '../base/Select.js'
import { showToast } from '../base/toastState.js'
import { ApiKeyConfirm, ApiKeyField, useApiKeyEditor } from './ApiKeyField.js'
import { closeSettings, useSettingsDialog, type SettingsSection } from './settingsDialogState.js'
import styles from './Settings.module.css'

/**
 * 设置弹窗：分「通用设置」（主题、语言、朗读音色、位置）与「数据管理」（API Key、导入、导出、删除）。
 * 桌面端为居中弹窗、左侧导航；移动端为底部弹层、导航横排在内容上方
 */
export const SettingsDialog = () => {
  const open = useSettingsDialog((state) => state.open)
  return open ? <SettingsContent /> : null
}

const sections: { value: SettingsSection; label: TranslationKey; icon: ReactNode }[] = [
  {
    value: 'general',
    label: 'settingDialogAsideGeneralOptionLabel',
    icon: <IconSettingsOutline16 />,
  },
  {
    value: 'model',
    label: 'settingDialogAsideModelOptionLabel',
    icon: <IconCpuOutline16 />,
  },
  { value: 'data', label: 'settingDialogAsideDataOptionLabel', icon: <IconDataOutline16 /> },
]

const SettingsContent = () => {
  const t = useTranslate()
  const isMobile = useIsMobile()
  // 打开时按调用方指定的分组选中，之后在弹窗内切换
  const [section, setSection] = useState(() => useSettingsDialog.getState().section)
  // 切换分组不丢失正在输入的 API Key 与导入状态
  const apiKeyEditor = useApiKeyEditor()
  const historyImport = useHistoryImport()
  const historyDelete = useHistoryDelete()
  const replacingHistory = useChatStore((state) => state.importingHistory)
  const historyBusy = historyImport.busy || historyDelete.busy || replacingHistory
  return (
    <>
      <Modal
        title={t('settings')}
        closable
        className={styles.dialog}
        mainClassName={styles.dialogMain}
        onClose={() => {
          if (!historyDelete.busy) {
            closeSettings()
          }
        }}
      >
        <div role="tablist" className={styles.navigation}>
          {sections.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={section === item.value}
              className={clsx(styles.navItem, section === item.value && styles.navItemActive)}
              onClick={() => setSection(item.value)}
            >
              {item.icon}
              {t(item.label)}
            </button>
          ))}
        </div>
        <div role="tabpanel" className={styles.content}>
          {section === 'general' ? (
            <>
              <ThemeSetting />
              <FontSizeSetting />
              <LocaleSetting />
              <VoiceEngineSetting />
              <VoiceAutoSendSetting />
              <VoiceAutoReadSetting />
              <TtsVoiceSetting />
              <ShowTokenUsageSetting />
              <LocationSetting />
            </>
          ) : section === 'model' ? (
            <>
              <ModelSetting />
              <SystemPromptSetting />
            </>
          ) : (
            <>
              <ApiKeyField editor={apiKeyEditor} />
              <ApiOriginSetting />
              <ImportHistory historyImport={historyImport} disabled={historyBusy} />
              <ExportHistory disabled={historyBusy} />
              <SettingCell
                label={t('deleteAllSessions')}
                status={null}
                action={
                  <Button
                    variant="dangerOutlined"
                    size="m"
                    className={styles.cellButton}
                    disabled={historyBusy}
                    onClick={historyDelete.open}
                  >
                    {t('delete')}
                  </Button>
                }
              />
              {isMobile ? <ApiKeyConfirm editor={apiKeyEditor} /> : null}
            </>
          )}
        </div>
      </Modal>
      {historyImport.file ? <ImportConfirm historyImport={historyImport} /> : null}
      {historyDelete.opened ? <DeleteAllConfirm historyDelete={historyDelete} /> : null}
    </>
  )
}

/** 删除确认保留在设置之上；失败可重试，成功只关闭确认弹窗。 */
const DeleteAllConfirm = ({
  historyDelete,
}: {
  historyDelete: ReturnType<typeof useHistoryDelete>
}) => {
  const t = useTranslate()
  return (
    <Modal
      title={t('deleteAllSessionsModalTitle')}
      className={styles.deleteConfirm}
      onClose={historyDelete.cancel}
      footer={
        <div className={styles.deleteActions} aria-busy={historyDelete.busy}>
          <Button
            variant="outlined"
            autoFocus
            disabled={historyDelete.busy}
            onClick={historyDelete.cancel}
          >
            {t('cancel')}
          </Button>
          <Button
            variant="danger"
            disabled={historyDelete.busy}
            onClick={() => void historyDelete.confirm()}
          >
            {t(historyDelete.busy ? 'historyDeleting' : 'deleteAllSessions')}
          </Button>
        </div>
      }
    >
      {t('deleteAllSessionsModalDescription')}
    </Modal>
  )
}

const useHistoryDelete = () => {
  const [opened, setOpened] = useState(false)
  const [busy, setBusy] = useState(false)
  const deleting = useRef(false)

  const confirm = async () => {
    if (deleting.current) {
      return
    }
    deleting.current = true
    setBusy(true)
    try {
      await clearHistory()
      setOpened(false)
      showToast({ key: 'historyDeleted' })
    } catch {
      showToast({ key: 'historyDeleteFailed', type: 'error' })
    } finally {
      deleting.current = false
      setBusy(false)
    }
  }

  return {
    opened,
    busy,
    open: () => setOpened(true),
    cancel: () => {
      if (!deleting.current) {
        setOpened(false)
      }
    },
    confirm,
  }
}

const LocationSetting = () => {
  const t = useTranslate()
  const locale = useSettings((state) => state.locale)
  const location = useSettings((state) => state.location)
  const province =
    location?.region === 'CN'
      ? provinces.find((item) => item.code === location.province)
      : undefined

  return (
    <SettingCell
      label={t('settingsLocation')}
      status={null}
      className={styles.locationCell}
      action={
        <div className={styles.locationSelectors}>
          {isChineseBrowser() ? (
            <>
              <Select
                ariaLabel={t('settingsLocationProvince')}
                className={styles.provinceSelect}
                value={province?.code ?? ''}
                placeholder={t('settingsLocationProvince')}
                options={provinces.map((item) => ({ value: item.code, label: item.name }))}
                onChange={(value) => {
                  if (value !== province?.code) {
                    setLocation({ region: 'CN', province: value })
                  }
                }}
              />
              <Select
                ariaLabel={t('settingsLocationCity')}
                className={styles.citySelect}
                value={province ? (location?.city ?? '') : ''}
                disabled={!province?.cities.length}
                placeholder={t('settingsLocationCity')}
                options={
                  province?.cities.map((item) => ({ value: item.code, label: item.name })) ?? []
                }
                onChange={(value) => {
                  if (province) {
                    setLocation({ region: 'CN', province: province.code, city: value })
                  }
                }}
              />
            </>
          ) : (
            <Select
              ariaLabel={t('settingsLocationRegion')}
              className={styles.regionSelect}
              value={location?.region ?? ''}
              placeholder={t('settingsLocationRegion')}
              options={regionCodes
                .map((code) => ({ value: code, label: getRegionName(code, locale) }))
                .sort((a, b) => a.label.localeCompare(b.label, locale))}
              onChange={(value) => setLocation({ region: value })}
            />
          )}
        </div>
      }
    />
  )
}

const LocaleSetting = () => {
  const t = useTranslate()
  const locale = useSettings((state) => state.locale)
  return (
    <SettingCell
      label={t('settingsLocalePreference')}
      status={null}
      action={
        <Select
          ariaLabel={t('settingsLocalePreference')}
          value={locale}
          options={[
            { value: 'zh-CN', label: t('settingsLocaleZhCN'), lang: 'zh-CN' },
            { value: 'en-US', label: t('settingsLocaleEnUS'), lang: 'en' },
          ]}
          onChange={setLocale}
        />
      }
    />
  )
}

/** 朗读音色：stella（海星，女声）/ tide（暗潮，男声） */
const TtsVoiceSetting = () => {
  const t = useTranslate()
  const ttsVoice = useSettings((state) => state.ttsVoice)
  return (
    <SettingCell
      label={t('settingsTtsVoice')}
      status={null}
      action={
        <Select
          ariaLabel={t('settingsTtsVoice')}
          value={ttsVoice}
          options={[
            { value: 'stella', label: t('settingsTtsVoiceStella') },
            { value: 'tide', label: t('settingsTtsVoiceTide') },
          ]}
          onChange={setTtsVoice}
        />
      }
    />
  )
}

const fontSizeOptions: { value: FontSizePreference; label: TranslationKey }[] = [
  { value: 'small', label: 'settingsFontSizeSmall' },
  { value: 'medium', label: 'settingsFontSizeMedium' },
  { value: 'large', label: 'settingsFontSizeLarge' },
]

const FontSizeSetting = () => {
  const t = useTranslate()
  const fontSize = useSettings((state) => state.fontSize)
  return (
    <SettingCell
      label={t('settingsFontSizeLabel')}
      status={null}
      action={
        <div role="radiogroup" aria-label={t('settingsFontSizeLabel')} className={styles.segment}>
          {fontSizeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={fontSize === option.value}
              className={clsx(
                styles.segmentOption,
                fontSize === option.value && styles.segmentOptionActive
              )}
              onClick={() => setFontSize(option.value)}
            >
              {t(option.label)}
            </button>
          ))}
        </div>
      }
    />
  )
}

const VoiceEngineSetting = () => {
  const t = useTranslate()
  const voiceEngine = useSettings((state) => state.voiceEngine)
  return (
    <SettingCell
      label={t('settingsVoiceEngineLabel')}
      description={t('settingsVoiceEngineDescription')}
      status={null}
      action={
        <Select<VoiceEngine>
          ariaLabel={t('settingsVoiceEngineLabel')}
          value={voiceEngine}
          options={[
            { value: 'api', label: t('settingsVoiceEngineApi') },
            { value: 'browser', label: t('settingsVoiceEngineBrowser') },
          ]}
          onChange={setVoiceEngine}
        />
      }
    />
  )
}

const ToggleSettingCell = ({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (next: boolean) => void
}) => (
  <SettingCell
    label={label}
    description={description}
    status={null}
    action={
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={clsx(styles.switch, checked && styles.switchChecked)}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.switchThumb} />
      </button>
    }
  />
)

const VoiceAutoSendSetting = () => {
  const t = useTranslate()
  const checked = useSettings((state) => state.voiceAutoSend)
  return (
    <ToggleSettingCell
      label={t('settingsVoiceAutoSendLabel')}
      description={t('settingsVoiceAutoSendDescription')}
      checked={checked}
      onChange={setVoiceAutoSend}
    />
  )
}

const VoiceAutoReadSetting = () => {
  const t = useTranslate()
  const checked = useSettings((state) => state.voiceAutoReadAloud)
  return (
    <ToggleSettingCell
      label={t('settingsVoiceAutoReadLabel')}
      description={t('settingsVoiceAutoReadDescription')}
      checked={checked}
      onChange={setVoiceAutoReadAloud}
    />
  )
}

const ShowTokenUsageSetting = () => {
  const t = useTranslate()
  const checked = useSettings((state) => state.showTokenUsage)
  return (
    <ToggleSettingCell
      label={t('settingsShowTokenUsageLabel')}
      description={t('settingsShowTokenUsageDescription')}
      checked={checked}
      onChange={setShowTokenUsage}
    />
  )
}

const ModelSetting = () => {
  const t = useTranslate()
  const model = useSettings((state) => state.model)
  return (
    <SettingCell
      label={t('settingsModelLabel')}
      description={t('settingsModelDescription')}
      status={null}
      action={
        <Select<ChatModel>
          ariaLabel={t('settingsModelLabel')}
          value={model}
          options={[
            { value: 'deepseek-flash', label: t('settingsModelFlash') },
            { value: 'deepseek-v4-pro', label: t('settingsModelPro') },
          ]}
          onChange={setModel}
        />
      }
    />
  )
}

const SystemPromptSetting = () => {
  const t = useTranslate()
  const locale = useSettings((state) => state.locale)
  const systemPrompt = useSettings((state) => state.systemPrompt)
  const customPresets = useSettings((state) => state.customPresets)
  const [draft, setDraft] = useState(systemPrompt)
  const [presetName, setPresetName] = useState('')

  const presets = useMemo(
    () => [...customPresets, ...getBuiltinPresets(locale)],
    [customPresets, locale]
  )

  const applyValue = (next: string) => {
    setDraft(next)
    setSystemPrompt(next)
  }

  const onSavePreset = () => {
    const created = addCustomPreset(presetName, draft)
    if (created) {
      setPresetName('')
      showToast({ key: 'promptPresetSaved' })
    }
  }

  const effective = draft.trim() || DEFAULT_SYSTEM_PROMPT

  return (
    <div className={clsx(styles.cell, styles.promptSection)}>
      <div className={styles.promptHeader}>
        <div className={styles.text}>
          <div className={styles.label}>{t('settingsSystemPromptLabel')}</div>
          <div className={styles.description}>{t('settingsSystemPromptDescription')}</div>
        </div>
        <Button
          variant="outlined"
          size="s"
          disabled={!draft.trim()}
          onClick={() => {
            applyValue('')
            showToast({ key: 'promptSaved' })
          }}
        >
          {t('settingsSystemPromptReset')}
        </Button>
      </div>
      <div className={styles.presetChips}>
        {presets.map((preset) => {
          const isDefault = preset.prompt === DEFAULT_SYSTEM_PROMPT
          const active = (isDefault && !draft.trim()) || effective === preset.prompt.trim()
          return (
            <button
              key={preset.id}
              type="button"
              className={clsx(styles.presetChip, active && styles.presetChipActive)}
              onClick={() => {
                applyValue(isDefault ? '' : preset.prompt)
                showToast({ key: 'promptSaved' })
              }}
            >
              <span>{preset.name}</span>
              {!preset.builtin ? (
                <span
                  role="button"
                  tabIndex={0}
                  className={styles.presetChipDelete}
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
        className={styles.promptTextarea}
        value={draft}
        placeholder={t('settingsSystemPromptPlaceholder')}
        onChange={(event) => {
          setDraft(event.target.value)
          setSystemPrompt(event.target.value)
        }}
      />
      <div className={styles.inlineRow}>
        <input
          type="text"
          className={styles.inlineInput}
          maxLength={24}
          value={presetName}
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
          disabled={!presetName.trim() || !draft.trim()}
          onClick={onSavePreset}
        >
          {t('promptSaveAsPreset')}
        </Button>
      </div>
    </div>
  )
}

const ApiOriginSetting = () => {
  const t = useTranslate()
  const apiOrigin = useSettings((state) => state.apiOrigin)
  const [draft, setDraft] = useState(apiOrigin)
  const [error, setError] = useState<string | null>(null)

  const onSave = () => {
    if (!setApiOrigin(draft)) {
      setError(t('settingsApiOriginInvalid'))
      return
    }
    setError(null)
    setDraft(useSettings.getState().apiOrigin)
    showToast({ key: 'settingsApiOriginSaved' })
  }

  const onReset = () => {
    setApiOrigin('')
    setDraft('')
    setError(null)
    showToast({ key: 'settingsApiOriginSaved' })
  }

  return (
    <div className={clsx(styles.cell, styles.promptSection)}>
      <div className={styles.promptHeader}>
        <div className={styles.text}>
          <div className={styles.label}>{t('settingsApiOriginLabel')}</div>
          <div className={styles.description}>{t('settingsApiOriginDescription')}</div>
        </div>
        {apiOrigin ? (
          <Button variant="outlined" size="s" onClick={onReset}>
            {t('settingsApiOriginReset')}
          </Button>
        ) : null}
      </div>
      <div className={styles.inlineRow}>
        <input
          type="url"
          className={styles.inlineInput}
          value={draft}
          spellCheck={false}
          autoComplete="off"
          placeholder={t('settingsApiOriginPlaceholder')}
          onChange={(event) => {
            setDraft(event.target.value)
            if (error) {
              setError(null)
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault()
              onSave()
            }
          }}
        />
        <Button variant="outlined" size="m" disabled={draft.trim() === apiOrigin} onClick={onSave}>
          {t('save')}
        </Button>
      </div>
      {error ? <div className={styles.error}>{error}</div> : null}
    </div>
  )
}

/** 覆盖导入的二次确认，叠在设置弹窗上 */
const ImportConfirm = ({
  historyImport,
}: {
  historyImport: ReturnType<typeof useHistoryImport>
}) => {
  const t = useTranslate()
  return (
    <Modal
      title={t('historyImportConfirmTitle')}
      className={styles.importConfirm}
      onClose={historyImport.cancel}
      footer={
        <>
          <Button variant="outlined" size="m" autoFocus onClick={historyImport.cancel}>
            {t('cancel')}
          </Button>
          <Button variant="dangerOutlined" size="m" onClick={() => void historyImport.confirm()}>
            {t('historyImportConfirm')}
          </Button>
        </>
      }
    >
      <div className={styles.importConfirmText}>{t('historyImportConfirmDescription')}</div>
    </Modal>
  )
}

const themeOptions: { value: ThemePreference; label: TranslationKey; icon: ReactNode }[] = [
  {
    value: 'light',
    label: 'avatarMenuSettingsDialogThemeSelectLightOption',
    icon: <IconLightOutline16 />,
  },
  {
    value: 'dark',
    label: 'avatarMenuSettingsDialogThemeSelectDarkOption',
    icon: <IconDarkOutline16 />,
  },
  {
    value: 'system',
    label: 'avatarMenuSettingsDialogThemeSelectSystemOption',
    icon: <IconFollowsystemOutline16 />,
  },
]

/**
 * 主题项：标题下方浅色 / 深色 / 跟随系统三个选块。
 * 与下方语言选项连续排列。
 */
const ThemeSetting = () => {
  const t = useTranslate()
  const themePreference = useSettings((state) => state.themePreference)
  const label = t('avatarMenuSettingsDialogThemeItemLabel')
  return (
    <div className={styles.theme}>
      {label}
      <div role="radiogroup" aria-label={label} className={styles.themeOptions}>
        {themeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={themePreference === option.value}
            className={clsx(
              styles.themeOption,
              themePreference === option.value && styles.themeOptionSelected
            )}
            onClick={() => setThemePreference(option.value)}
          >
            {option.icon}
            {t(option.label)}
          </button>
        ))}
      </div>
    </div>
  )
}

/** `reason` 为失败原因的文案 key，展示时按当前语言翻译后填入 `message` 参数。 */
type Status = (TranslationMessage & { error?: boolean; reason?: TranslationKey }) | null

/** 导出失败附带原因：预期的错误用对应文案作原因，其他错误用错误信息。 */
const errorStatus = (key: TranslationKey, error: unknown): Status => ({
  key,
  ...(error instanceof BackupError
    ? { reason: error.key }
    : { params: { message: error instanceof Error ? error.message : String(error) } }),
  error: true,
})

const SettingCell = ({
  label,
  description,
  status,
  action,
  className,
}: {
  label: string
  description?: string
  status: Status
  action: ReactNode
  className?: string
}) => {
  const t = useTranslate()
  return (
    <div className={clsx(styles.cell, styles.row, className)}>
      <div className={styles.text}>
        <div className={styles.label}>{label}</div>
        {status || description ? (
          <div className={clsx(styles.description, status?.error && styles.error)}>
            {status
              ? t(status.key, status.reason ? { message: t(status.reason) } : status.params)
              : description}
          </div>
        ) : null}
      </div>
      {action}
    </div>
  )
}

/** 选文件后先提示覆盖；确认后才检查文件并执行导入，任何错误都提示导入失败。 */
const useHistoryImport = () => {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>(null)
  const importing = useRef(false)

  const confirm = async () => {
    if (!file || importing.current) {
      return
    }
    importing.current = true
    setFile(null)
    setBusy(true)
    setStatus(null)
    try {
      const count = await importHistory(file)
      setStatus({ key: count === 1 ? 'historyImportedOne' : 'historyImported', params: { count } })
    } catch {
      setStatus({ key: 'historyImportFailed', error: true })
    } finally {
      importing.current = false
      setBusy(false)
    }
  }

  return { file, busy, status, select: setFile, cancel: () => setFile(null), confirm }
}

/** 导入 = 覆盖：用选中文件替换本地全部会话与附件。 */
const ImportHistory = ({
  historyImport,
  disabled,
}: {
  historyImport: ReturnType<typeof useHistoryImport>
  disabled: boolean
}) => {
  const t = useTranslate()
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <SettingCell
      label={t('historyImport')}
      description={t('historyImportDescription')}
      status={historyImport.status}
      action={
        <>
          <Button
            variant="outlined"
            size="m"
            className={clsx(styles.cellButton, styles.uploadButton)}
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <IconUploadOutline14 />
            {t('upload')}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) {
                historyImport.select(file)
              }
            }}
          />
        </>
      }
    />
  )
}

/** 将全部会话及图片导出为 ZIP 文件并下载 */
const ExportHistory = ({ disabled }: { disabled: boolean }) => {
  const t = useTranslate()
  const empty = useChatStore((state) => state.sessions.length === 0)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  const onExport = async () => {
    setBusy(true)
    setStatus(null)
    try {
      const { name, blob } = await exportHistory()
      await saveOrShareFile(blob, name)
    } catch (error) {
      setStatus(errorStatus('historyExportFailed', error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingCell
      label={t('exportAllLabel')}
      description={t('historyExportDescription')}
      status={status}
      action={
        <Button
          variant="outlined"
          size="m"
          className={styles.cellButton}
          disabled={disabled || busy || empty}
          onClick={() => void onExport()}
        >
          <IconDownloadOutline16 />
          {t('exportAllDownload')}
        </Button>
      }
    />
  )
}
