import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar } from '@capacitor/status-bar'

import { copyText } from '../../utils/clipboard.js'

const LIGHT_BAR_BG = '#ffffff'
const DARK_BAR_BG = '#151517'
const BACK_EXIT_WINDOW_MS = 2000

export const isNativeApp = (): boolean => Capacitor.isNativePlatform()

/** 同步原生状态栏与导航栏图标颜色及背景色 */
export const syncNativeTheme = (theme: 'light' | 'dark'): void => {
  if (!isNativeApp()) {
    return
  }
  const style = theme === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light
  void SystemBars.setStyle({ style }).catch(() => {})
  void StatusBar.setBackgroundColor({
    color: theme === 'dark' ? DARK_BAR_BG : LIGHT_BAR_BG,
  }).catch(() => {})
}

/** 打开外部 HTTP/HTTPS 链接：原生端优先使用 Chrome Custom Tabs */
export const openExternalUrl = (url: string): void => {
  if (isNativeApp()) {
    void Browser.open({ url }).catch(() => {
      window.open(url, '_blank', 'noopener,noreferrer')
    })
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Failed to encode file data'))
        return
      }
      const commaIndex = reader.result.indexOf(',')
      resolve(commaIndex >= 0 ? reader.result.slice(commaIndex + 1) : reader.result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file data'))
    reader.readAsDataURL(blob)
  })

const sanitizeFileName = (name: string): string => {
  const cleaned = name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/^\.+/, '')
  return cleaned || 'export.bin'
}

const isShareCancelled = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error)
  return /cancel/i.test(message)
}

/** 分享纯文本：原生端调起系统分享面板，网页端优先 Web Share API，不支持则降级为复制 */
export const shareText = async (
  text: string,
  title?: string
): Promise<'shared' | 'copied' | 'cancelled'> => {
  if (isNativeApp()) {
    try {
      await Share.share({
        title: title || 'DeepSeek Chat',
        text,
        dialogTitle: title || 'DeepSeek Chat',
      })
      return 'shared'
    } catch (error) {
      if (isShareCancelled(error)) {
        return 'cancelled'
      }
      const copied = await copyText(text)
      return copied ? 'copied' : 'cancelled'
    }
  }
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: title || 'DeepSeek Chat', text })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled'
      }
    }
  }
  const copied = await copyText(text)
  return copied ? 'copied' : 'cancelled'
}

/** 导出或打开本地 Blob 文件：原生端写入缓存并调起系统分享/保存面板，网页端触发浏览器下载 */
export const saveOrShareFile = async (blob: Blob, name: string): Promise<void> => {
  if (!isNativeApp()) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    return
  }

  const safeName = sanitizeFileName(name)
  const data = await blobToBase64(blob)
  await Filesystem.writeFile({
    path: safeName,
    data,
    directory: Directory.Cache,
  })
  const { uri } = await Filesystem.getUri({
    path: safeName,
    directory: Directory.Cache,
  })
  try {
    await Share.share({
      title: safeName,
      files: [uri],
      dialogTitle: safeName,
    })
  } catch (error) {
    if (!isShareCancelled(error)) {
      throw error
    }
  }
}

const resolveAnchorFileName = (anchor: HTMLAnchorElement, blob: Blob): string => {
  const fromDownload = anchor.getAttribute('download')?.trim()
  if (fromDownload) {
    return fromDownload
  }
  const fromText = anchor.textContent?.trim()
  if (fromText && fromText.length <= 120) {
    return fromText
  }
  const subtype = blob.type.split('/')[1]?.split('+')[0]
  return subtype ? `attachment.${subtype}` : 'attachment.bin'
}

/**
 * 原生容器初始化：
 * - 首帧渲染后隐藏启动屏
 * - 拦截安卓物理返回键（依次关闭弹窗 / 搜索结果 / 侧边栏，再按一次退出）
 * - 拦截外部链接和 blob/data 附件点击，交由系统浏览器或原生分享打开
 */
export const setupNativeApp = ({
  onBack,
  onExitPrompt,
}: {
  onBack: () => boolean
  onExitPrompt: () => void
}): (() => void) => {
  if (!isNativeApp()) {
    return () => {}
  }

  let disposed = false
  let lastBackPress = 0

  void SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {})

  const backHandlePromise = App.addListener('backButton', () => {
    if (onBack()) {
      lastBackPress = 0
      return
    }
    const now = Date.now()
    if (now - lastBackPress < BACK_EXIT_WINDOW_MS) {
      void App.exitApp()
      return
    }
    lastBackPress = now
    onExitPrompt()
  })

  const onDocumentClick = (event: MouseEvent) => {
    if (event.defaultPrevented || !(event.target instanceof Element)) {
      return
    }
    const anchor = event.target.closest('a[href]')
    if (!(anchor instanceof HTMLAnchorElement)) {
      return
    }
    const rawHref = anchor.getAttribute('href')
    if (!rawHref) {
      return
    }
    if (rawHref.startsWith('blob:') || rawHref.startsWith('data:')) {
      event.preventDefault()
      void fetch(rawHref)
        .then((response) => response.blob())
        .then((blob) => saveOrShareFile(blob, resolveAnchorFileName(anchor, blob)))
        .catch(() => {})
      return
    }
    if (/^https?:\/\//i.test(anchor.href)) {
      const targetUrl = new URL(anchor.href)
      if (anchor.target === '_blank' || targetUrl.origin !== window.location.origin) {
        event.preventDefault()
        openExternalUrl(anchor.href)
      }
    }
  }

  document.addEventListener('click', onDocumentClick)

  return () => {
    disposed = true
    document.removeEventListener('click', onDocumentClick)
    void backHandlePromise
      .then((handle) => {
        if (disposed) {
          return handle.remove()
        }
        return undefined
      })
      .catch(() => {})
  }
}
