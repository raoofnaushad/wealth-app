import { useState } from 'react'
import Markdown from 'react-markdown'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { User, Brain, ChevronDown, ChevronRight, Loader2, CheckCircle2, Database, Search, Globe, Wrench, ThumbsUp, ThumbsDown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { ChatMessage as ChatMessageType, ToolCallStep, CopilotSource } from '@/api/types'
import { InvictusLogo } from '@/components/shared/InvictusLogo'
import { useChatStore } from '@/store/useChatStore'

interface ChatMessageProps {
  message: ChatMessageType
}

const TOOL_ICONS: Record<string, typeof Database> = {
  query_task_hub: Database,
  check_calendar: Search,
  query_crm: Database,
  query_compliance_db: Database,
  search_documents: Search,
  search_inbox: Search,
  check_priority_rules: Wrench,
  query_risk_profile: Database,
  query_portfolio_db: Database,
  check_transactions: Database,
  search_news: Globe,
  check_pending_items: Database,
  query_capital_flows: Database,
  check_notices: Database,
  search_market_news: Globe,
  search_knowledge_base: Search,
  query_risk_planning: Database,
  query_data_aggregation: Database,
  query_deals: Search,
  query_insights: Globe,
  query_client_portal: Database,
  web_search: Globe,
}

function ToolCallRow({ toolCall }: { toolCall: ToolCallStep }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = TOOL_ICONS[toolCall.toolName] || Wrench

  return (
    <div className="border border-border/50 rounded-md overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-muted/50 transition-colors"
      >
        <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="flex-1 text-left text-muted-foreground truncate">{toolCall.description}</span>
        {toolCall.status === 'running' ? (
          <Loader2 className="h-3 w-3 animate-spin text-blue-500 shrink-0" />
        ) : toolCall.status === 'complete' ? (
          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
        ) : null}
        {toolCall.result && (
          expanded
            ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
            : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
      </button>
      {expanded && toolCall.result && (
        <div className="px-2.5 py-2 border-t border-border/50 bg-muted/30">
          <p className="text-[10px] text-muted-foreground leading-relaxed">{toolCall.result}</p>
        </div>
      )}
    </div>
  )
}

function SourceCitation({ sources }: { sources: CopilotSource[] }) {
  if (sources.length === 0) return null

  return (
    <div className="border-t border-border/30 mt-2 pt-2">
      <p className="text-[10px] font-medium text-muted-foreground mb-1">Sources</p>
      <div className="space-y-1">
        {sources.map((source, idx) => (
          <div key={idx} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
            <span className="shrink-0">
              {source.type === 'document' ? '📄' : source.type === 'crm' ? '📊' : source.type === 'web' ? '🌐' : '🔧'}
            </span>
            <span>
              {source.type === 'document' && source.doc_id
                ? `${source.doc_id}${source.page_numbers?.length ? ` — p.${source.page_numbers.join(', ')}` : ''}${source.excerpt ? ` — "${source.excerpt}"` : ''}`
                : source.type === 'crm'
                  ? `${source.tool}${source.data ? ` — ${JSON.stringify(source.data)}` : ''}`
                  : source.tool
              }
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ThinkingBlock({ content, isComplete }: { content: string; isComplete: boolean }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="w-full flex items-start gap-2 px-2.5 py-1.5 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors text-left"
    >
      <Brain className="h-3.5 w-3.5 mt-0.5 text-violet-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
            {isComplete ? 'Thought process' : 'Thinking...'}
          </span>
          {!isComplete && <Loader2 className="h-3 w-3 animate-spin text-violet-500" />}
          {expanded
            ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
            : <ChevronRight className="h-3 w-3 text-muted-foreground" />
          }
        </div>
        {expanded && (
          <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{content}</p>
        )}
      </div>
    </button>
  )
}

// Convert any markdown tables to bullet lists, then normalize block spacing.
function normalizeMarkdown(raw: string): string {
  // Step 1: Convert tables to bullet lists
  const converted = convertTablesToLists(raw)

  // Step 2: Ensure blank lines around headers, hrs, and list starts
  const lines = converted.split('\n')
  const out: string[] = []

  const isHeader = (l: string) => /^\s*#{1,6}\s/.test(l)
  const isList = (l: string) => /^\s*[-*+]\s/.test(l) || /^\s*\d+\.\s/.test(l)
  const isHr = (l: string) => /^\s*---+\s*$/.test(l)
  const isEmpty = (l: string) => l.trim() === ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const prev = i > 0 ? lines[i - 1] : ''
    const next = i < lines.length - 1 ? lines[i + 1] : ''

    if ((isHeader(line) || isHr(line)) && !isEmpty(prev)) {
      out.push('')
    }

    out.push(line)

    if ((isHeader(line) || isHr(line)) && !isEmpty(next)) {
      out.push('')
    }

    if (isList(next) && !isList(line) && !isEmpty(line) && !isHeader(line)) {
      out.push('')
    }
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n')
}

// Convert markdown table blocks into bullet lists
function convertTablesToLists(text: string): string {
  const lines = text.split('\n')
  const result: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Detect start of a table (line starts with |)
    if (/^\s*\|/.test(line)) {
      // Collect all consecutive table lines
      const tableLines: string[] = []
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        tableLines.push(lines[i])
        i++
      }

      // Parse the table
      const parseCells = (row: string) =>
        row.split('|').map((c) => c.trim()).filter((c) => c.length > 0)

      // First line is the header
      const headers = parseCells(tableLines[0])

      // Skip separator row (| --- | --- |), then process data rows
      const dataRows = tableLines
        .slice(1)
        .filter((r) => !/^\s*\|[\s-:|]+\|\s*$/.test(r))

      for (const row of dataRows) {
        const cells = parseCells(row)
        if (cells.length === 0) continue

        if (headers.length >= 2 && cells.length >= 2) {
          // Format as "**Header1:** value1 — **Header2:** value2" or simpler bullet
          const parts = cells.map((cell, ci) => {
            const header = headers[ci]
            if (!header || header === cells[0]) return null
            return `${header}: ${cell}`
          }).filter(Boolean)

          if (parts.length > 0) {
            result.push(`- **${cells[0]}** — ${parts.join(' · ')}`)
          } else {
            result.push(`- ${cells.join(' — ')}`)
          }
        } else {
          result.push(`- ${cells.join(' — ')}`)
        }
      }
    } else {
      result.push(line)
      i++
    }
  }

  return result.join('\n')
}

function MarkdownContent({ content }: { content: string }) {
  const normalized = normalizeMarkdown(content)

  return (
    <Markdown
      components={{
        h1: ({ children }) => <h3 className="text-sm font-bold mt-3 mb-1.5 first:mt-0">{children}</h3>,
        h2: ({ children }) => <h4 className="text-[13px] font-bold mt-2.5 mb-1 first:mt-0">{children}</h4>,
        h3: ({ children }) => <h5 className="text-xs font-bold mt-2 mb-1 first:mt-0">{children}</h5>,
        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            {children}
          </a>
        ),
        ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
        hr: () => <hr className="my-2 border-border/60" />,
        table: ({ children }) => (
          <div className="overflow-x-auto my-1.5">
            <table className="w-full text-xs border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
        th: ({ children }) => (
          <th className="text-left font-semibold px-2 py-1 border-b border-border/60 text-[11px]">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-2 py-1 border-b border-border/30 text-[11px]">{children}</td>
        ),
        code: ({ children }) => (
          <code className="bg-muted/80 rounded px-1 py-0.5 text-[11px] font-mono">{children}</code>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-primary/40 pl-2.5 my-1.5 text-muted-foreground italic">
            {children}
          </blockquote>
        ),
      }}
    >
      {normalized}
    </Markdown>
  )
}

function FeedbackButtons({ messageId, currentRating }: { messageId: string; currentRating?: 'positive' | 'negative' }) {
  const submitFeedback = useChatStore((s) => s.submitFeedback)

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => submitFeedback(messageId, 'positive')}
        disabled={!!currentRating}
        className={cn(
          'p-1 rounded transition-colors',
          currentRating === 'positive'
            ? 'text-emerald-500'
            : currentRating
              ? 'text-muted-foreground/30 cursor-default'
              : 'text-muted-foreground/50 hover:text-emerald-500 hover:bg-emerald-500/10'
        )}
        title="Helpful"
      >
        <ThumbsUp className="h-3 w-3" />
      </button>
      <button
        onClick={() => submitFeedback(messageId, 'negative')}
        disabled={!!currentRating}
        className={cn(
          'p-1 rounded transition-colors',
          currentRating === 'negative'
            ? 'text-red-500'
            : currentRating
              ? 'text-muted-foreground/30 cursor-default'
              : 'text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10'
        )}
        title="Not helpful"
      >
        <ThumbsDown className="h-3 w-3" />
      </button>
    </div>
  )
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const hasThinking = !isUser && message.thinking
  const hasToolCalls = !isUser && message.toolCalls && message.toolCalls.length > 0
  const hasContent = message.content.length > 0
  const isComplete = hasContent // if we have content, the response is done

  return (
    <div className={cn('flex gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {isUser ? (
        <Avatar className="h-7 w-7 shrink-0 mt-0.5">
          <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
            <User className="h-3.5 w-3.5" />
          </AvatarFallback>
        </Avatar>
      ) : (
        <InvictusLogo size="xs" className="shrink-0 mt-0.5" />
      )}
      <div className={cn('max-w-[85%] space-y-1.5', isUser ? 'items-end' : 'items-start')}>
        {/* Thinking block */}
        {hasThinking && (
          <ThinkingBlock content={message.thinking!.content} isComplete={isComplete} />
        )}

        {/* Tool calls */}
        {hasToolCalls && (
          <div className="space-y-1">
            {message.toolCalls!.map((tc) => (
              <ToolCallRow key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {/* Main content */}
        {hasContent && (
          <div
            className={cn(
              'rounded-lg px-3 py-2 text-sm leading-relaxed',
              isUser
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            )}
          >
            {isUser ? (
              <p>{message.content}</p>
            ) : (
              <MarkdownContent content={message.content} />
            )}
          </div>
        )}

        {/* Source citations */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <SourceCitation sources={message.sources} />
        )}

        {/* Feedback buttons */}
        {!isUser && message.runId && isComplete && (
          <FeedbackButtons messageId={message.id} currentRating={message.feedbackRating} />
        )}

        <p className={cn('text-[10px] text-muted-foreground', isUser ? 'text-right' : 'text-left')}>
          {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
        </p>
      </div>
    </div>
  )
}
