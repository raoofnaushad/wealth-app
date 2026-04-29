import { CheckCircle2, Loader2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RunStep } from '@/api/types'

const STEP_SEQUENCE = [
  'fetch_clients_dashboard',
  'fetch_prospects_dashboard',
  'fetch_planning_dashboard',
  'fetch_portfolio_alerts_data',
  'summarize_client_portfolios',
  'generate_portfolio_alerts',
  'fetch_action_items',
  'generate_action_items',
  'fetch_news',
  'generate_news_alerts',
  'fetch_meetings',
  'generate_summary',
] as const

const STEP_LABELS: Record<string, string> = {
  fetch_clients_dashboard: 'Fetching client data',
  fetch_prospects_dashboard: 'Fetching prospect pipeline',
  fetch_planning_dashboard: 'Fetching planning data',
  fetch_portfolio_alerts_data: 'Analysing portfolios',
  summarize_client_portfolios: 'Summarising client portfolios',
  generate_portfolio_alerts: 'Generating portfolio alerts',
  fetch_action_items: 'Fetching action items',
  generate_action_items: 'Generating action items',
  fetch_news: 'Fetching market news',
  generate_news_alerts: 'Generating news alerts',
  fetch_meetings: 'Fetching meetings',
  generate_summary: 'Generating run summary',
}

interface Client360StepProgressProps {
  steps: RunStep[]
}

export function Client360StepProgress({ steps }: Client360StepProgressProps) {
  // Build the display sequence: known steps in order, plus any unexpected steps from the API
  const apiNodes = steps.map((s) => s.node)
  const extraNodes = apiNodes.filter((n) => !STEP_SEQUENCE.includes(n as typeof STEP_SEQUENCE[number]))
  const displaySequence = [...STEP_SEQUENCE, ...extraNodes]

  const stepByNode = new Map(steps.map((s) => [s.node, s]))

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-8">
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">Running Client 360</p>
        <p className="text-xs text-muted-foreground mt-1">Analysing clients, portfolio alerts, news, and meetings…</p>
      </div>
      <ol className="flex flex-col gap-3 w-full max-w-xs">
        {displaySequence.map((node) => {
          const step = stepByNode.get(node)
          const isDone = step?.status === 'complete'
          const isRunning = step?.status === 'running'
          const isPending = !isDone && !isRunning

          return (
            <li key={node} className="flex items-center gap-3">
              {isDone && (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              )}
              {isRunning && (
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin shrink-0" />
              )}
              {isPending && (
                <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              )}
              <span
                className={cn(
                  'text-sm',
                  isDone && 'text-foreground',
                  isRunning && 'text-foreground font-medium',
                  isPending && 'text-muted-foreground',
                )}
              >
                {STEP_LABELS[node] ?? node}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
