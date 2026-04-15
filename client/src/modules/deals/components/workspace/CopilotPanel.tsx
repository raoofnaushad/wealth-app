import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, X, Zap, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { Editor } from '@tiptap/react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  context?: string
  /** Clean text to splice into the editor — only set when context was provided */
  applyText?: string
  /** TipTap positions to replace when applying */
  _pos?: { from: number; to: number }
}

interface CopilotPanelProps {
  opportunityName: string
  selectedText?: string
  onApplyText?: (text: string, pos: { from: number; to: number }) => void
  editor?: Editor | null
}

const QUICK_ACTIONS = [
  { label: 'Summarize', prompt: 'Summarize this selection concisely.' },
  { label: 'Shorten', prompt: 'Shorten this text while preserving the key points.' },
  { label: 'Expand', prompt: 'Expand this text with more detail and context.' },
  { label: 'Improve', prompt: 'Improve the clarity and professionalism of this text.' },
]

export function CopilotPanel({ opportunityName, onApplyText, editor }: CopilotPanelProps) {
  const [mode, setMode] = useState<'chat' | 'agent'>('chat')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'sys-1',
      role: 'assistant',
      content: `I'm your AI Analyst for "${opportunityName}". Select text in the editor and ask me to summarize, shorten, or improve it — or ask me anything about this deal.`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [latchedSelection, setLatchedSelection] = useState('')
  // Store TipTap {from, to} at mousedown — before focus moves and selection collapses
  const savedPosRef = useRef<{ from: number; to: number } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  function handlePanelMouseDown() {
    const text = window.getSelection()?.toString().trim() ?? ''
    if (!text) return
    setLatchedSelection(text)
    // Read TipTap selection positions right now, before focus moves
    if (editor && !editor.state.selection.empty) {
      const { from, to } = editor.state.selection
      savedPosRef.current = { from, to }
    } else {
      savedPosRef.current = null
    }
  }

  function clearSelection() {
    setLatchedSelection('')
    savedPosRef.current = null
  }

  function handleSend(overridePrompt?: string) {
    const text = (overridePrompt ?? input).trim()
    if (!text || loading) return

    const context = latchedSelection || undefined
    const savedPos = savedPosRef.current

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      context,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    clearSelection()
    setLoading(true)

    setTimeout(() => {
      const { display, apply } = generateMockReply(text, context ?? null, mode)
      const reply: Message = {
        id: `msg-${Date.now()}-reply`,
        role: 'assistant',
        content: display,
        applyText: apply && savedPos ? apply : undefined,
        _pos: apply && savedPos ? savedPos : undefined,
      }
      setMessages((prev) => [...prev, reply])
      setLoading(false)
    }, 900 + Math.random() * 1200)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className="flex flex-col h-full border-l bg-background"
      onMouseDown={handlePanelMouseDown}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-3 py-2.5 shrink-0">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
          <Bot className="size-3.5 text-primary" />
        </div>
        <span className="text-sm font-medium flex-1">AI Analyst</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' && 'flex-row-reverse')}>
            <div className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs mt-0.5',
              msg.role === 'assistant' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            )}>
              {msg.role === 'assistant' ? <Bot className="size-3" /> : <User className="size-3" />}
            </div>
            <div className="flex flex-col gap-1 max-w-[85%] min-w-0">
              {msg.context && (
                <div className="flex items-start gap-1 rounded-md bg-muted/60 border border-border px-2 py-1">
                  <FileText className="size-3 text-muted-foreground mt-0.5 shrink-0" />
                  <span className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {msg.context}
                  </span>
                </div>
              )}
              <div className={cn(
                'rounded-lg px-3 py-2 text-sm leading-relaxed',
                msg.role === 'assistant' ? 'bg-muted' : 'bg-primary text-primary-foreground'
              )}>
                {msg.content}
              </div>
              {msg.role === 'assistant' && mode === 'agent' && onApplyText &&
                msg.applyText && msg._pos &&
                msg.id === messages[messages.length - 1]?.id && !loading && (
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => onApplyText(msg.applyText!, msg._pos!)}
                  className="self-start flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  <Zap className="size-3" />
                  Apply to editor
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
              <Bot className="size-3" />
            </div>
            <div className="rounded-lg bg-muted px-3 py-2">
              <span className="inline-flex gap-0.5">
                <span className="animate-bounce text-muted-foreground" style={{ animationDelay: '0ms' }}>●</span>
                <span className="animate-bounce text-muted-foreground" style={{ animationDelay: '150ms' }}>●</span>
                <span className="animate-bounce text-muted-foreground" style={{ animationDelay: '300ms' }}>●</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Selected text context pill */}
      {latchedSelection && (
        <div className="mx-3 mb-1 flex items-start gap-1.5 rounded-md border bg-amber-500/5 border-amber-500/20 px-2.5 py-2">
          <FileText className="size-3.5 text-amber-600 shrink-0 mt-0.5" />
          <span className="flex-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
            {latchedSelection}
          </span>
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={clearSelection}
            className="text-muted-foreground hover:text-foreground shrink-0 ml-1"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      {/* Quick action chips */}
      {latchedSelection && !loading && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => handleSend(action.prompt)}
              className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium hover:bg-muted transition-colors"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="border-t px-3 pt-2 pb-3 space-y-2 shrink-0">
        <div className="flex items-end gap-2 min-w-0">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              latchedSelection
                ? 'Ask about the selection, or pick an action above...'
                : mode === 'agent'
                ? 'Give the agent a task...'
                : 'Ask about this opportunity...'
            }
            rows={2}
            className="min-w-0 flex-1 resize-none text-sm py-2"
            disabled={loading}
          />
          <Button
            type="button"
            size="icon"
            className="size-9 shrink-0 mb-0.5"
            disabled={!input.trim() || loading}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => handleSend()}
          >
            <Send className="size-4" />
          </Button>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setMode(mode === 'chat' ? 'agent' : 'chat')}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors',
              mode === 'agent'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted',
            )}
          >
            <Zap className="size-3" />
            {mode === 'agent' ? 'Agent mode on' : 'Agent mode'}
          </button>
          {mode === 'agent' && (
            <span className="text-[10px] text-muted-foreground">Can apply to editor</span>
          )}
        </div>
      </div>
    </div>
  )
}

function generateMockReply(
  query: string,
  context: string | null,
  mode: 'chat' | 'agent',
): { display: string; apply: string | null } {
  const lower = query.toLowerCase()

  if (context) {
    if (lower.includes('summar')) {
      const apply = `${context.slice(0, 80)}${context.length > 80 ? '...' : ''} — covering the core investment thesis, key risk factors, strong sector tailwinds, and a proprietary deal sourcing advantage.`
      return { display: `Here's a summary:\n\n"${apply}"`, apply }
    }
    if (lower.includes('shorten')) {
      const apply = context.split(' ').slice(0, Math.max(8, Math.floor(context.split(' ').length * 0.4))).join(' ') + '.'
      return { display: apply, apply }
    }
    if (lower.includes('expand')) {
      const apply = `${context} Furthermore, this aligns with broader market trends in the sector, supported by recent macroeconomic data indicating strong demand tailwinds and a favorable regulatory environment for new entrants.`
      return { display: apply, apply }
    }
    if (lower.includes('improve')) {
      const apply = `${context.charAt(0).toUpperCase() + context.slice(1).replace(/\s+/g, ' ').trim()} This positions the fund favorably relative to peers in terms of both return potential and downside protection.`
      return { display: apply, apply }
    }
    const display = `Based on the selected text: the content covers key investment considerations. ${mode === 'agent' ? 'Use a quick action (Summarize, Shorten, Expand, Improve) to generate applicable text.' : 'Let me know if you want me to rewrite or expand on any part.'}`
    return { display, apply: null }
  }

  if (lower.includes('fee') || lower.includes('cost'))
    return { display: 'The management fee is 2.0% with 20% carried interest — in line with industry standard for this fund size and strategy.', apply: null }
  if (lower.includes('risk'))
    return { display: 'Key risks include concentration in the healthcare sector, currency exposure from EU portfolio companies, and GP key-person dependency. I recommend adding a risk section to the investment memo.', apply: null }
  if (lower.includes('compare') || lower.includes('benchmark'))
    return { display: 'Compared to peer funds in the same vintage year, this fund targets a higher IRR (18–22% vs median 15–18%) but also has a larger fund size. Fee structure is competitive.', apply: null }
  if (lower.includes('summary') || lower.includes('overview'))
    return { display: 'Growth equity fund targeting healthcare and technology. Fund size $2B, 10-year term. Strong GP track record over 2 prior funds. Strategy fit with active mandates is high.', apply: null }
  return { display: "I've reviewed the opportunity data. The key metrics look solid — strong mandate fit score, competitive terms, and an experienced GP team. Would you like me to drill deeper into any specific aspect?", apply: null }
}
