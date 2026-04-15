import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface CopilotPanelProps {
  opportunityName: string
}

export function CopilotPanel({ opportunityName }: CopilotPanelProps) {
  const [mode, setMode] = useState<'chat' | 'autonomous'>('chat')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'sys-1',
      role: 'assistant',
      content: `I'm your deal copilot for ${opportunityName}. Ask me about the opportunity, request analysis, or switch to autonomous mode for automatic insights.`,
      timestamp: new Date().toISOString(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    if (!input.trim() || loading) return
    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // Simulated response
    setTimeout(() => {
      const reply: Message = {
        id: `msg-${Date.now()}-reply`,
        role: 'assistant',
        content: generateMockReply(userMsg.content),
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, reply])
      setLoading(false)
    }, 1000 + Math.random() * 1500)
  }

  return (
    <div className="flex flex-col h-full border-l">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-primary" />
          <span className="text-sm font-medium">Copilot</span>
        </div>
        <button
          type="button"
          onClick={() => setMode(mode === 'chat' ? 'autonomous' : 'chat')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {mode === 'chat' ? (
            <ToggleLeft className="size-4" />
          ) : (
            <ToggleRight className="size-4 text-primary" />
          )}
          <Badge variant={mode === 'autonomous' ? 'default' : 'outline'} className="text-[10px] px-1.5 py-0">
            {mode === 'chat' ? 'Chat' : 'Auto'}
          </Badge>
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex gap-2.5', msg.role === 'user' && 'flex-row-reverse')}>
            <div className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs',
              msg.role === 'assistant' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            )}>
              {msg.role === 'assistant' ? <Bot className="size-3.5" /> : <User className="size-3.5" />}
            </div>
            <div className={cn(
              'rounded-lg px-3 py-2 text-sm max-w-[80%]',
              msg.role === 'assistant' ? 'bg-muted' : 'bg-primary text-primary-foreground'
            )}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="size-3.5" />
            </div>
            <div className="rounded-lg bg-muted px-3 py-2 text-sm">
              <span className="inline-flex gap-1">
                <span className="animate-bounce">.</span>
                <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-3">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend() }}
          className="flex items-center gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'chat' ? 'Ask about this opportunity...' : 'Give the agent a task...'}
            className="flex-1 h-9 text-sm"
            disabled={loading}
          />
          <Button type="submit" size="icon" className="size-9 shrink-0" disabled={!input.trim() || loading}>
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

function generateMockReply(query: string): string {
  const lower = query.toLowerCase()
  if (lower.includes('fee') || lower.includes('cost'))
    return 'Based on the snapshot data, the management fee is 2.0% with carried interest at 20%. This is in line with industry standard for this fund size and strategy.'
  if (lower.includes('risk') || lower.includes('concern'))
    return 'Key risks include concentration risk in the healthcare sector, currency exposure from EU portfolio companies, and GP key-person dependency. I recommend adding a risk section to the investment memo.'
  if (lower.includes('compare') || lower.includes('benchmark'))
    return 'Compared to peer funds in the same vintage year, this fund targets a higher IRR (18-22% vs median 15-18%) but also has a larger fund size. The fee structure is competitive.'
  if (lower.includes('summary') || lower.includes('overview'))
    return 'This is a growth equity fund targeting healthcare and technology sectors. Fund size is $2B with a 10-year term. The GP has strong track record with 2 prior funds. Strategy fit with your mandates is strong.'
  return 'I\'ve analyzed the opportunity data. The key metrics look solid — strong mandate fit score, competitive terms, and experienced GP team. Would you like me to drill deeper into any specific aspect?'
}
