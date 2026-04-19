import { create } from 'zustand'
import type {
  ChatMessage,
  ToolCallStep,
  CopilotRunResponse,
  LLMConfig,
  CopilotSource,
} from '@/api/types'
import { askCopilot } from '@/api/copilot-client'

export interface ChatThread {
  id: string
  title: string
  messages: ChatMessage[]
  conversationId: string
  createdAt: string
}

interface ChatState {
  messages: ChatMessage[]
  activeThreadId: string | null
  conversationId: string
  history: ChatThread[]
  showHistory: boolean
  isOpen: boolean
  isLoading: boolean
  error: string | null

  toggle: () => void
  open: () => void
  close: () => void
  newChat: () => void
  loadThread: (threadId: string) => void
  deleteThread: (threadId: string) => void
  toggleHistory: () => void
  sendMessage: (content: string, llmConfig?: LLMConfig) => void
}

function deriveTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user')
  if (!firstUser) return 'New chat'
  const text = firstUser.content
  return text.length > 40 ? text.slice(0, 40) + '...' : text
}

function getSourceModule(): 'engage' | 'deals' | 'plan' | 'insights' | 'portal' {
  const path = window.location.pathname
  if (path.startsWith('/home/deals')) return 'deals'
  if (path.startsWith('/home/insights')) return 'insights'
  return 'engage'
}

function mapRunToToolCalls(run: CopilotRunResponse): ToolCallStep[] {
  if (!run.output?.tools_called) return []
  return run.output.tools_called.map((tc, idx) => ({
    id: `tc-${run.id}-${idx}`,
    toolName: tc.tool,
    description: `${tc.tool}(${Object.keys(tc.args).join(', ')})`,
    parameters: tc.args,
    status: 'complete' as const,
    result: JSON.stringify(tc.args),
  }))
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  activeThreadId: null,
  conversationId: crypto.randomUUID(),
  history: [],
  showHistory: false,
  isOpen: false,
  isLoading: false,
  error: null,

  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),

  newChat: () => {
    const { messages, activeThreadId, history, conversationId } = get()

    let updatedHistory = history
    if (messages.length > 0) {
      if (activeThreadId) {
        updatedHistory = history.map((t) =>
          t.id === activeThreadId
            ? { ...t, messages: [...messages], title: deriveTitle(messages) }
            : t
        )
      } else {
        const thread: ChatThread = {
          id: `thread-${Date.now()}`,
          title: deriveTitle(messages),
          messages: [...messages],
          conversationId,
          createdAt: new Date().toISOString(),
        }
        updatedHistory = [thread, ...history]
      }
    }

    set({
      messages: [],
      activeThreadId: null,
      conversationId: crypto.randomUUID(),
      history: updatedHistory,
      isLoading: false,
      error: null,
      showHistory: false,
    })
  },

  loadThread: (threadId: string) => {
    const { messages, activeThreadId, history, conversationId } = get()

    let updatedHistory = history
    if (messages.length > 0 && !activeThreadId) {
      const thread: ChatThread = {
        id: `thread-${Date.now()}`,
        title: deriveTitle(messages),
        messages: [...messages],
        conversationId,
        createdAt: new Date().toISOString(),
      }
      updatedHistory = [thread, ...history]
    } else if (messages.length > 0 && activeThreadId) {
      updatedHistory = history.map((t) =>
        t.id === activeThreadId
          ? { ...t, messages: [...messages], title: deriveTitle(messages) }
          : t
      )
    }

    const target = updatedHistory.find((t) => t.id === threadId)
    if (!target) return

    set({
      messages: [...target.messages],
      activeThreadId: threadId,
      conversationId: target.conversationId,
      history: updatedHistory,
      isLoading: false,
      error: null,
      showHistory: false,
    })
  },

  deleteThread: (threadId: string) => {
    set((s) => ({
      history: s.history.filter((t) => t.id !== threadId),
      ...(s.activeThreadId === threadId
        ? { messages: [], activeThreadId: null, conversationId: crypto.randomUUID() }
        : {}),
    }))
  },

  toggleHistory: () => set((s) => ({ showHistory: !s.showHistory })),

  sendMessage: async (content: string, llmConfig?: LLMConfig) => {
    const { conversationId } = get()

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }

    const assistantMsgId = `msg-${Date.now()}-resp`

    set((s) => ({
      messages: [
        ...s.messages,
        userMsg,
        {
          id: assistantMsgId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          thinking: { content: 'Processing your request...' },
          toolCalls: [],
        },
      ],
      isLoading: true,
      error: null,
    }))

    try {
      const run = await askCopilot(
        {
          message: content,
          workflow: 'copilot',
          conversation_id: conversationId,
          source_module: getSourceModule(),
          llm_config: llmConfig,
        },
        (progressRun) => {
          if (progressRun.status === 'running' && progressRun.steps.length > 0) {
            const toolCalls: ToolCallStep[] = progressRun.steps.map((step, idx) => ({
              id: `tc-${progressRun.id}-${idx}`,
              toolName: step.node,
              description: step.result_summary || step.node,
              status: step.status === 'complete' ? 'complete' as const : 'running' as const,
            }))
            set((s) => ({
              messages: s.messages.map((m) =>
                m.id === assistantMsgId ? { ...m, toolCalls } : m
              ),
            }))
          }
        },
      )

      if (run.status === 'complete' && run.output) {
        const toolCalls = mapRunToToolCalls(run)
        set((s) => {
          const updatedMessages = s.messages.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: run.output!.answer, toolCalls, sources: run.output!.sources, thinking: undefined }
              : m
          )
          let updatedHistory = s.history
          if (s.activeThreadId) {
            updatedHistory = s.history.map((t) =>
              t.id === s.activeThreadId
                ? { ...t, messages: [...updatedMessages], title: deriveTitle(updatedMessages) }
                : t
            )
          } else {
            const newThreadId = `thread-${Date.now()}`
            const thread: ChatThread = {
              id: newThreadId,
              title: deriveTitle(updatedMessages),
              messages: [...updatedMessages],
              conversationId: s.conversationId,
              createdAt: new Date().toISOString(),
            }
            updatedHistory = [thread, ...s.history]
            return {
              messages: updatedMessages,
              isLoading: false,
              error: null,
              history: updatedHistory,
              activeThreadId: newThreadId,
            }
          }
          return { messages: updatedMessages, isLoading: false, error: null, history: updatedHistory }
        })
      } else {
        const errorMsg = run.error?.includes('disallowed')
          ? 'Your message was flagged. Please rephrase.'
          : run.error || 'Something went wrong. Please try again.'
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: `Sorry: ${errorMsg}`, thinking: undefined }
              : m
          ),
          isLoading: false,
          error: errorMsg,
        }))
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred'
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: `Sorry, I encountered an error: ${errorMsg}`, thinking: undefined }
            : m
        ),
        isLoading: false,
        error: errorMsg,
      }))
    }
  },
}))
