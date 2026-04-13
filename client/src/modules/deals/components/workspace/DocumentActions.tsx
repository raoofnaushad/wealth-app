import { Shield, Share2, Mail, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { Document, DocumentStatus } from '../../types'

interface DocumentActionsProps {
  document: Document
  opportunityId: string
  onValidationClick: () => void
  onShareClick: () => void
}

const STATUS_CONFIG: Record<DocumentStatus, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-muted text-muted-foreground',
  },
  in_review: {
    label: 'In Review',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
}

export function DocumentActions({
  document,
  onValidationClick,
  onShareClick,
}: DocumentActionsProps) {
  const statusConfig = STATUS_CONFIG[document.status]

  function handleValidationClick() {
    console.log('[DocumentActions] Send for Validation clicked', document.id)
    onValidationClick()
  }

  function handleShareClick() {
    console.log('[DocumentActions] Share clicked', document.id)
    onShareClick()
  }

  return (
    <div className="flex items-center gap-1 border-b px-2 py-1.5">
      <Badge
        variant="secondary"
        className={cn('mr-2 border-0', statusConfig.className)}
      >
        {statusConfig.label}
      </Badge>

      <Button variant="ghost" size="sm" onClick={handleValidationClick}>
        <Shield className="mr-1.5 size-3.5" />
        Validate
      </Button>

      <Button variant="ghost" size="sm" onClick={handleShareClick}>
        <Share2 className="mr-1.5 size-3.5" />
        Share
      </Button>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="sm" disabled>
                <Mail className="mr-1.5 size-3.5" />
                Email
              </Button>
            }
          />
          <TooltipContent>Coming soon — requires email integration</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="sm" disabled>
                <Download className="mr-1.5 size-3.5" />
                Download
              </Button>
            }
          />
          <TooltipContent>Coming soon — requires OnlyOffice</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
