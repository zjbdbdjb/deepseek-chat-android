import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import { useTranslate } from '../../i18n/index.js'
import {
  IconCloseFill14,
  IconPanelLeftOutline16,
  IconSearchOutline16,
  IconSettingsOutline16,
  NewChatIcon,
} from '../base/icons.js'
import { setSiderCollapsed, togglePinSession, useSettings } from '../../services/settings.js'
import { exportSessionMarkdown } from '../../services/chat/exportMarkdown.js'
import * as db from '../../services/chat/db.js'
import { groupSessions } from '../../services/chat/sessionGroups.js'
import { newChat, removeSession, useChatStore } from '../../services/chat/store.js'
import type { SessionSummary } from '../../services/chat/types.js'
import { Button } from '../base/Button.js'
import { IconButton } from '../base/IconButton.js'
import { Modal } from '../base/Modal.js'
import { showToast } from '../base/toastState.js'
import { openSettings } from '../settings/settingsDialogState.js'
import { closeMobileSider, useMobileSider } from './mobileSiderState.js'
import { SessionItem } from './SessionItem.js'
import styles from './Sider.module.css'

/** 展开的侧边栏：名称与收起按钮、开启新对话、按时间分组的会话列表、底部设置；移动端放在抽屉里，收起按钮关闭抽屉 */
export const Sider = ({ mobile = false }: { mobile?: boolean }) => {
  const t = useTranslate()
  const sessions = useChatStore((state) => state.sessions)
  const activeId = useChatStore((state) => state.activeId)
  const pinnedSessionIds = useSettings((state) => state.pinnedSessionIds)
  const [searchQuery, setSearchQuery] = useState('')
  const [now, setNow] = useState(Date.now)
  const pinnedSet = useMemo(() => new Set(pinnedSessionIds), [pinnedSessionIds])
  const groups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const filtered = query
      ? sessions.filter((session) =>
          (session.title || t('untitledChat')).toLowerCase().includes(query)
        )
      : sessions
    const pinned: SessionSummary[] = []
    const unpinned: SessionSummary[] = []
    for (const session of filtered) {
      if (pinnedSet.has(session.id)) {
        pinned.push(session)
      } else {
        unpinned.push(session)
      }
    }
    const timeGroups = groupSessions(unpinned, now, t)
    return pinned.length > 0
      ? [{ key: '__pinned__', label: t('pinnedSessionsLabel'), sessions: pinned }, ...timeGroups]
      : timeGroups
  }, [sessions, searchQuery, pinnedSet, now, t])
  const [deleting, setDeleting] = useState<SessionSummary | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  const onExportSession = async (summary: SessionSummary) => {
    try {
      const cached = useChatStore.getState().sessionCache[summary.id]
      const full = cached ?? (await db.loadSession(summary.id))
      if (!full) {
        showToast({ key: 'exportMarkdownFailed', type: 'error' })
        return
      }
      await exportSessionMarkdown({ ...full, ...summary })
      showToast({ key: 'exportMarkdownSuccess' })
    } catch {
      showToast({ key: 'exportMarkdownFailed', type: 'error' })
    }
  }

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const refresh = () => {
      clearTimeout(timer)
      const time = Date.now()
      setNow(time)
      const midnight = new Date(time).setHours(24, 0, 0, 0)
      timer = setTimeout(refresh, midnight - time)
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh()
      }
    }
    refresh()
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', refresh)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  return (
    <div className={clsx(styles.sider, mobile && styles.mobile)}>
      <div className={styles.top}>
        <div className={styles.appName}>{t('appName')}</div>
        <IconButton
          size="m"
          icon={<IconPanelLeftOutline16 />}
          tooltip={t('collapseSiderbarButton')}
          tooltipPlacement="bottom"
          onClick={() => (mobile ? closeMobileSider() : setSiderCollapsed(true))}
        />
      </div>
      <button
        type="button"
        className={styles.newChat}
        onClick={() => {
          newChat()
          closeMobileSider()
        }}
      >
        <span className={styles.newChatIcon}>
          <NewChatIcon />
        </span>
        {t('newChat')}
      </button>
      <div className={styles.searchBox}>
        <span className={styles.searchIcon} aria-hidden>
          <IconSearchOutline16 />
        </span>
        <input
          type="search"
          className={styles.searchInput}
          value={searchQuery}
          placeholder={t('searchSessionsPlaceholder')}
          aria-label={t('searchSessionsPlaceholder')}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
        {searchQuery ? (
          <button
            type="button"
            className={styles.searchClear}
            aria-label={t('close')}
            onClick={() => setSearchQuery('')}
          >
            <IconCloseFill14 />
          </button>
        ) : null}
      </div>
      <div className={styles.listWrap}>
        <div className={styles.list}>
          {groups.length === 0 && searchQuery.trim() ? (
            <div className={styles.emptySearch}>{t('searchSessionsEmpty')}</div>
          ) : (
            groups.map((group) => (
              <div key={group.key} className={styles.section}>
                <div className={styles.sectionHeader}>{group.label}</div>
                {group.sessions.map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    active={session.id === activeId}
                    pinned={pinnedSet.has(session.id)}
                    onTogglePin={() => togglePinSession(session.id)}
                    onExport={() => void onExportSession(session)}
                    onDelete={() => setDeleting(session)}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </div>
      <div className={styles.bottom}>
        <button type="button" className={styles.settings} onClick={() => openSettings('general')}>
          <span className={styles.settingsIcon}>
            <IconSettingsOutline16 />
          </span>
          <span className={styles.settingsLabel}>{t('settings')}</span>
        </button>
      </div>
      {deleting ? (
        <Modal
          title={t('deleteSessionModalContentTitle')}
          onClose={() => {
            if (!deletePending) {
              setDeleting(null)
            }
          }}
          footer={
            <>
              <Button variant="outlined" disabled={deletePending} onClick={() => setDeleting(null)}>
                {t('cancel')}
              </Button>
              <Button
                variant="danger"
                disabled={deletePending}
                onClick={async () => {
                  setDeletePending(true)
                  try {
                    if (await removeSession(deleting.id)) {
                      setDeleting(null)
                    } else {
                      showToast({ key: 'sessionDeleteFailed', type: 'error' })
                    }
                  } finally {
                    setDeletePending(false)
                  }
                }}
              >
                {t('delete')}
              </Button>
            </>
          }
        >
          {t('deleteSessionWithFilesDescription')}
        </Modal>
      ) : null}
    </div>
  )
}

/** 移动端抽屉：浮在页面上方，点空白区域关闭。 */
export const MobileSider = () => {
  const open = useMobileSider((state) => state.open)
  if (!open) {
    return null
  }
  return (
    <>
      <div className={styles.drawerMask} onClick={closeMobileSider} />
      <div className={styles.drawer}>
        <Sider mobile />
      </div>
    </>
  )
}
