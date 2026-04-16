import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PipelineStatus } from '../../types'

interface PipelineStatusBadgeProps {
  status: PipelineStatus
}

const statusConfig: Record<PipelineStatus, { label: string; className: string }> = {
  new: {
    label: 'New',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  },
  active: {
    label: 'Active',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  archived: {
    label: 'Archived',
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400',
  },
  ignored: {
    label: 'Ignored',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  },
  processing: {
    label: 'Processing',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
}

export function PipelineStatusBadge({ status }: PipelineStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <Badge className={cn('border-none', config.className)}>
      {config.label}
    </Badge>
  )
}
