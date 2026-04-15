import { useEffect, useRef } from 'react'
import { X, Loader2, SquarePen, History, ArrowLeft, Trash2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/store/useChatStore'
import { InvictusLogo } from '@/components/shared/InvictusLogo'
import type { ChatThread } from '@/store/useChatStore'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

function ChatHistoryList({
  history,
  onLoad,
  onDelete,
  onBack,
}: {
  history: ChatThread[]
  onLoad: (id: string) => void
  onDelete: (id: string) => void
  onBack: () => void
}) {
  return (
    <div className="flex-1 overflow-y-auto min-w-[380px]">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-7 w-7">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-sm font-semibold">Chat History</h3>
        </div>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No previous chats</p>
          </div>
        ) : (
          <div className="space-y-1">
            {history.map((thread) => (
              <div
                key={thread.id}
                className="group flex items-start gap-2 px-3 py-2.5 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => onLoad(thread.id)}
              >
                <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{thread.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {thread.messages.length} messages · {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(thread.id)
                  }}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function ChatPanel() {
  const {
    messages, isOpen, isLoading, showHistory, history,
    close, sendMessage, newChat, loadThread, deleteThread, toggleHistory,
  } = useChatStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (!showHistory) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading, showHistory])

  return (
    <div
      className={cn(
        'h-full bg-card border-l border-border shadow-xl flex flex-col shrink-0 transition-all duration-300 ease-in-out overflow-hidden',
        isOpen ? 'w-[380px]' : 'w-0 border-l-0'
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0 flex items-center justify-between min-w-[380px]">
        <div className="flex items-center gap-2">
          <InvictusLogo size="xs" />
          <h2 className="text-sm font-semibold">AI Analyst</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleHistory}
            className={cn('h-7 w-7', showHistory && 'bg-accent')}
            title="Chat history"
          >
            <History className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={newChat} className="h-7 w-7" title="New chat">
            <SquarePen className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={close} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* History view */}
      {showHistory ? (
        <ChatHistoryList
          history={history}
          onLoad={loadThread}
          onDelete={deleteThread}
          onBack={toggleHistory}
        />
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto min-w-[380px]">
            <div className="p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <InvictusLogo size="sm" className="mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Ask me anything about your daily summary, meetings, or portfolio.
                  </p>
                </div>
              )}
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isLoading && !messages.some((m) => m.thinking && !m.content) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">AI is thinking...</span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input */}
          <div className="min-w-[380px] shrink-0">
            <ChatInput onSend={sendMessage} disabled={isLoading} />
          </div>
        </>
      )}
    </div>
  )
}
