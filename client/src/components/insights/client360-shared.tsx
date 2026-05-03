import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Client360ErrorEnvelope } from '@/api/types'

export const CARD = 'rounded-xl bg-white dark:bg-card border border-border/60 shadow-sm'
export const GAP_COLORS = ['#6366f1', '#3b82f6', '#14b8a6', '#f59e0b', '#f43f5e', '#8b5cf6', '#10b981']

export function isErrorEnvelope(v: unknown): v is Client360ErrorEnvelope {
  return typeof v === 'object' && v !== null && 'error' in v
}

export function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

export function TrendBadge({ value, suffix = '%' }: { value: number; suffix?: string }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
        0{suffix}
      </span>
    )
  }
  const positive = value > 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium',
        positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
      )}
    >
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? '+' : ''}{value.toFixed(1)}{suffix}
    </span>
  )
}

export function WarningBanner({ warnings }: { warnings: Array<{ field: string; message: string }> }) {
  if (!warnings.length) return null
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-3 mb-4">
      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
      <div className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5">
        {warnings.map((w) => (
          <p key={w.field}><span className="font-medium">{w.field}:</span> {w.message}</p>
        ))}
      </div>
    </div>
  )
}
