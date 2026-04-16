import { useState } from 'react'
import {
  ArrowLeft,
  Bell,
  Check,
  CheckCircle,
  ChevronDown,
  ClipboardCheck,
  Download,
  FileCheck,
  Loader2,
  Redo2,
  Search,
  Share2,
  Shield,
  Undo2,
  XCircle,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { downloadAsPDF, downloadAsDocx } from './downloadDocument'
import { useAuthStore } from '@/store/useAuthStore'

import type { ApprovalStage, Opportunity, Document } from '../../types'

interface WorkspaceHeaderProps {
  opportunity: Opportunity
  activeDocument: Document | null
  activeTabType?: string
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onBack: () => void
  onValidate: () => void
  onShare: () => void
  onStageChange: (stage: ApprovalStage) => void
  onExportCanvas?: () => void
}

const stageColors: Record<string, string> = {
  new: 'bg-gray-400',
  pre_screening: 'bg-blue-500',
  due_diligence: 'bg-amber-500',
  ic_review: 'bg-purple-500',
  approved: 'bg-emerald-500',
  rejected: 'bg-red-500',
}

const stageLabels: Record<string, string> = {
  new: 'New',
  pre_screening: 'Pre-Screening',
  due_diligence: 'Due Diligence',
  ic_review: 'IC Review',
  approved: 'Approved',
  rejected: 'Rejected',
}

const stageItems: { stage: ApprovalStage; icon: typeof ClipboardCheck }[] = [
  { stage: 'pre_screening', icon: ClipboardCheck },
  { stage: 'due_diligence', icon: Search },
  { stage: 'ic_review', icon: FileCheck },
  { stage: 'approved', icon: CheckCircle },
]

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
  activeTabType,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onBack,
  onValidate,
  onShare,
  onStageChange,
  onExportCanvas,
}: WorkspaceHeaderProps) {
  const isCanvas = activeTabType === 'note'
  const hasDoc = activeDocument !== null || isCanvas
  const [isDownloading, setIsDownloading] = useState(false)
  const role = useAuthStore((s) => s.getModuleRole('deals'))
  const canChangeStage = role === 'owner' || role === 'manager'

  async function handleDownloadPDF() {
    if (!activeDocument) return
    setIsDownloading(true)
    try { await downloadAsPDF(activeDocument, opportunity.name) }
    catch (e) { console.error('PDF export failed', e) }
    finally { setIsDownloading(false) }
  }

  async function handleDownloadDocx() {
    if (!activeDocument) return
    setIsDownloading(true)
    try { await downloadAsDocx(activeDocument, opportunity.name) }
    catch (e) { console.error('DOCX export failed', e) }
    finally { setIsDownloading(false) }
  }

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

      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={!canChangeStage}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium transition-colors',
            canChangeStage ? 'cursor-pointer hover:bg-accent' : 'opacity-60 cursor-not-allowed',
          )}
        >
          <span className={cn('h-2 w-2 rounded-full', stageColors[opportunity.approvalStage])} />
          {stageLabels[opportunity.approvalStage]}
          {canChangeStage && <ChevronDown className="h-3 w-3 text-muted-foreground" />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground tracking-wide">
            DEAL STAGE
          </div>
          {stageItems.map(({ stage, icon: Icon }) => (
            <DropdownMenuItem
              key={stage}
              onClick={() => onStageChange(stage)}
              className="flex items-center gap-2"
            >
              <Icon className="h-4 w-4" />
              {stageLabels[stage]}
              {opportunity.approvalStage === stage && (
                <Check className="h-4 w-4 ml-auto" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onStageChange('rejected')}
            className="flex items-center gap-2 text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
          >
            <XCircle className="h-4 w-4" />
            Reject Deal
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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

        {isCanvas ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Export as PNG"
            onClick={onExportCanvas}
          >
            <Download className="h-4 w-4" />
          </Button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger
              title="Download"
              className={cn(
                'inline-flex items-center justify-center rounded-md h-8 w-8 transition-colors',
                hasDoc && !isDownloading
                  ? 'hover:bg-accent hover:text-accent-foreground cursor-pointer text-foreground'
                  : 'opacity-50 pointer-events-none text-muted-foreground',
              )}
            >
              {isDownloading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Download className="h-4 w-4" />}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownloadPDF}>
                Download as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadDocx}>
                Download as Word (.docx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

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
