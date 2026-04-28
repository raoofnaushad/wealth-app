import { useEffect, useRef, useState } from 'react'
import { Loader2, SquarePen, History, ArrowLeft, Trash2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/store/useChatStore'
import { InvictusLogo } from '@/components/shared/InvictusLogo'
import type { ChatThread } from '@/store/useChatStore'
import { ChatMessage } from '@/components/chat/ChatMessage'
import { ChatInput } from '@/components/chat/ChatInput'
import { formatDistanceToNow } from 'date-fns'

function HistorySidebar({
  history,
  activeThreadId,
  onLoad,
  onDelete,
  onNew,
}: {
  history: ChatThread[]
  activeThreadId: string | null
  onLoad: (id: string) => void
  onDelete: (id: string) => void
  onNew: () => void
}) {
  return (
    <div className="w-64 border-r border-border bg-sidebar flex flex-col shrink-0 h-full">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold">Chats</h3>
        <Button variant="ghost" size="icon" onClick={onNew} className="h-7 w-7" title="New chat">
          <SquarePen className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-6 w-6 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">No previous chats</p>
          </div>
        ) : (
          history.map((thread) => (
            <div
              key={thread.id}
              className={`group flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                thread.id === activeThreadId
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'hover:bg-sidebar-accent/50'
              }`}
              onClick={() => onLoad(thread.id)}
            >
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{thread.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(thread.id)
                }}
              >
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function ChatPage() {
  const {
    messages, isLoading, history, activeThreadId, enabledMcps,
    sendMessage, newChat, loadThread, deleteThread, setEnabledMcps,
  } = useChatStore()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [showSidebar, setShowSidebar] = useState(true)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div className="flex h-full">
      {/* History Sidebar */}
      {showSidebar && (
        <HistorySidebar
          history={history}
          activeThreadId={activeThreadId}
          onLoad={loadThread}
          onDelete={deleteThread}
          onNew={newChat}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSidebar(!showSidebar)}
              className="h-7 w-7"
              title={showSidebar ? 'Hide history' : 'Show history'}
            >
              {showSidebar ? <ArrowLeft className="h-4 w-4" /> : <History className="h-4 w-4" />}
            </Button>
            <InvictusLogo size="xs" />
            <h2 className="text-sm font-semibold">Invictus AI Copilot</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={newChat} className="h-7 gap-1.5 text-xs">
            <SquarePen className="h-3.5 w-3.5" /> New Chat
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-6 space-y-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <InvictusLogo size="lg" className="mb-4" />
                <h2 className="text-lg font-semibold mb-2">Invictus AI Copilot</h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  Your AI-powered wealth management assistant. Ask about your portfolio, clients, meetings, market insights, or anything else.
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
        <div className="max-w-3xl mx-auto w-full pb-4">
          <ChatInput onSend={sendMessage} disabled={isLoading} enabledMcps={enabledMcps} onMcpsChange={setEnabledMcps} />
        </div>
      </div>
    </div>
  )
}
