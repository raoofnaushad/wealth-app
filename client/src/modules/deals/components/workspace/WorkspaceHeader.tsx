import {
  ArrowLeft,
  Bell,
  Download,
  Redo2,
  Share2,
  Shield,
  Undo2,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { downloadAsHTML, downloadAsText } from './downloadDocument'

import type { Opportunity, Document } from '../../types'

interface WorkspaceHeaderProps {
  opportunity: Opportunity
  activeDocument: Document | null
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onBack: () => void
  onValidate: () => void
  onShare: () => void
}

const pipelineColors: Record<string, string> = {
  new: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  archived: 'bg-muted text-muted-foreground',
  ignored: 'bg-muted text-muted-foreground',
}

const fitColors: Record<string, string> = {
  strong: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  moderate: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  limited: 'bg-red-500/15 text-red-700 dark:text-red-400',
}

const recoColors: Record<string, string> = {
  approve: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  watch: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  pass: 'bg-red-500/15 text-red-700 dark:text-red-400',
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function WorkspaceHeader({
  opportunity,
  activeDocument,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onBack,
  onValidate,
  onShare,
}: WorkspaceHeaderProps) {
  const hasDoc = activeDocument !== null

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b shrink-0 bg-background">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </Button>

      <span className="text-lg font-semibold truncate">
        {opportunity.name}
      </span>

      <Badge
        className={cn(
          'border-transparent',
          pipelineColors[opportunity.pipelineStatus],
        )}
      >
        {capitalize(opportunity.pipelineStatus)}
      </Badge>

      {(opportunity.strategyFit || opportunity.recommendation) && (
        <>
          <div className="h-5 w-px bg-border mx-2" />

          {opportunity.strategyFit && (
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-muted-foreground leading-none mb-0.5">
                Strategy Fit
              </span>
              <Badge
                className={cn(
                  'border-transparent',
                  fitColors[opportunity.strategyFit],
                )}
              >
                {capitalize(opportunity.strategyFit)}
              </Badge>
            </div>
          )}

          {opportunity.recommendation && (
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-muted-foreground leading-none mb-0.5">
                Recommendation
              </span>
              <Badge
                className={cn(
                  'border-transparent',
                  recoColors[opportunity.recommendation],
                )}
              >
                {capitalize(opportunity.recommendation)}
              </Badge>
            </div>
          )}
        </>
      )}

      <div className="ml-auto flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={!canUndo}
                onClick={onUndo}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            }
          />
          <TooltipContent>Undo</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={!canRedo}
                onClick={onRedo}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            }
          />
          <TooltipContent>Redo</TooltipContent>
        </Tooltip>

        <div className="h-5 w-px bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={!hasDoc}
                onClick={onValidate}
              >
                <Shield className="h-4 w-4" />
              </Button>
            }
          />
          <TooltipContent>Send for Validation</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={!hasDoc}
                onClick={onShare}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            }
          />
          <TooltipContent>Share</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuTrigger
                  className={cn(
                    'inline-flex items-center justify-center rounded-md h-8 w-8 transition-colors',
                    hasDoc
                      ? 'hover:bg-accent hover:text-accent-foreground cursor-pointer text-foreground'
                      : 'opacity-50 pointer-events-none text-muted-foreground',
                  )}
                >
                  <Download className="h-4 w-4" />
                </DropdownMenuTrigger>
              }
            />
            <TooltipContent>Download</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                if (activeDocument) downloadAsHTML(activeDocument, opportunity.name)
              }}
            >
              Download as HTML
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (activeDocument) downloadAsText(activeDocument)
              }}
            >
              Download as Text
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled
              >
                <Bell className="h-4 w-4" />
              </Button>
            }
          />
          <TooltipContent>Notifications</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
