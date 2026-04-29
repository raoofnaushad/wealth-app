import { CheckCircle2, Loader2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RunStep } from '@/api/types'

const STEP_SEQUENCE = [
  'fetch_clients_dashboard',
  'fetch_prospects_dashboard',
  'generate_summary',
] as const

const STEP_LABELS: Record<string, string> = {
  fetch_clients_dashboard: 'Fetching client dashboard',
  fetch_prospects_dashboard: 'Fetching prospect pipeline',
  generate_summary: 'Generating summary',
}

interface Client360StepProgressProps {
  steps: RunStep[]
}

export function Client360StepProgress({ steps }: Client360StepProgressProps) {
  const completedNodes = new Set(
    steps.filter((s) => s.status === 'complete').map((s) => s.node)
  )
  const runningNode = steps.find((s) => s.status === 'running')?.node ?? null

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-8">
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">Running Client 360</p>
        <p className="text-xs text-muted-foreground mt-1">Fetching live data from Engage…</p>
      </div>
      <ol className="flex flex-col gap-3 w-full max-w-xs">
        {STEP_SEQUENCE.map((node) => {
          const isDone = completedNodes.has(node)
          const isRunning = runningNode === node
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
