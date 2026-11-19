import { formatDate } from '../../utils/format.js'
import { saveOrShareFile } from '../native/bridge.js'
import { getVisibleMessages } from './branches.js'
import type { Session } from './types.js'

/** 将当前会话的可见消息分支导出为结构清晰的 Markdown 文本 */
export const sessionToMarkdown = (session: Session): string => {
  const title = session.title.trim() || 'DeepSeek Chat'
  const lines: string[] = [
    `# ${title}`,
    '',
    `> Exported: ${new Date().toLocaleString()}`,
    '',
    '---',
    '',
  ]
  const messages = getVisibleMessages(session)
  for (const message of messages) {
    if (message.role === 'user') {
      lines.push('## User', '')
      if (message.files.length > 0) {
        const names = message.files.map((file) => `\`${file.name}\``).join(', ')
        lines.push(`*Attachments:* ${names}`, '')
      }
      if (message.content.trim()) {
        lines.push(message.content.trim(), '')
      }
      continue
    }
    const modelLabel = message.model ? ` (${message.model})` : ''
    lines.push(`## DeepSeek${modelLabel}`, '')
    const thinkingParts: string[] = []
    const textParts: string[] = []
    for (const block of message.blocks) {
      if (block.type === 'thinking' && block.thinking.trim()) {
        thinkingParts.push(block.thinking.trim())
      } else if (block.type === 'text' && block.text.trim()) {
        textParts.push(block.text)
      }
    }
    if (thinkingParts.length > 0) {
      lines.push('<details>', '<summary>DeepThink</summary>', '')
      lines.push(thinkingParts.join('\n\n'), '', '</details>', '')
    }
    if (textParts.length > 0) {
      lines.push(textParts.join('\n\n').trim(), '')
    }
  }
  return `${lines.join('\n').trimEnd()}\n`
}

/** 导出当前会话为 .md 文件（安卓端调起原生分享/保存面板） */
export const exportSessionMarkdown = async (session: Session): Promise<void> => {
  const markdown = sessionToMarkdown(session)
  const baseName = (session.title.trim() || `deepseek-chat-${formatDate(new Date())}`)
    .replace(/[\\/:*?"<>|]+/g, '_')
    .slice(0, 60)
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  await saveOrShareFile(blob, `${baseName}.md`)
}
