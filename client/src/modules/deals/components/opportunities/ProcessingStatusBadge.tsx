import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { PipelineStatus } from '../../types'

interface ProcessingStatusBadgeProps {
  status: PipelineStatus
}

export function ProcessingStatusBadge({ status }: ProcessingStatusBadgeProps) {
  if (status !== 'processing') return null

  return (
    <Badge className="gap-1.5 border-none bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
      <Loader2 className="size-3 animate-spin" />
      Processing
    </Badge>
  )
}
