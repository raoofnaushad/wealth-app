import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { FitScore } from '../../types'

interface FitScoreBadgeProps {
  score: FitScore
}

const scoreConfig: Record<FitScore, { label: string; className: string }> = {
  strong: {
    label: 'Strong Fit',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  moderate: {
    label: 'Moderate Fit',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
  weak: {
    label: 'Weak Fit',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  },
}

export function FitScoreBadge({ score }: FitScoreBadgeProps) {
  const config = scoreConfig[score]

  return (
    <Badge className={cn('border-none', config.className)}>
      {config.label}
    </Badge>
  )
}
