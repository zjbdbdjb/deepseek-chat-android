import { create } from 'zustand'

type PromptModalState = {
  open: boolean
  sessionId: string | null
}

export const usePromptModal = create<PromptModalState>(() => ({
  open: false,
  sessionId: null,
}))

export const openPromptModal = (sessionId: string | null) =>
  usePromptModal.setState({ open: true, sessionId })

export const closePromptModal = () => usePromptModal.setState({ open: false })
