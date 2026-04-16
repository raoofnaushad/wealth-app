import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { dealsApi } from '../../api'
import { toast } from 'sonner'
import type { Opportunity, ApprovalStage } from '../../types'
import { PipelineStatusBadge } from './PipelineStatusBadge'
import { FitScoreBadge } from './FitScoreBadge'
import { ProcessingStatusBadge } from './ProcessingStatusBadge'

interface OpportunityTableProps {
  opportunities: Opportunity[]
  onDeleted?: (id: string) => void
}

const STAGE_CONFIG: Record<ApprovalStage, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  pre_screening: { label: 'Pre-Screening', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  due_diligence: { label: 'Due Diligence', className: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300' },
  ic_review: { label: 'IC Review', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
}

const STRATEGY_FIT_CONFIG: Record<string, { label: string; className: string }> = {
  strong: { label: 'Strong', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  moderate: { label: 'Moderate', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  limited: { label: 'Limited', className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
}

export function OpportunityTable({ opportunities, onDeleted }: OpportunityTableProps) {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.getModuleRole('deals'))
  const isOwner = role === 'owner'
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    setDeletingId(id)
    try {
      await dealsApi.deleteOpportunity(id)
      toast.success('Opportunity deleted.')
      onDeleted?.(id)
    } catch {
      toast.error('Failed to delete opportunity.')
    } finally {
      setDeletingId(null)
    }
  }

  if (opportunities.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed py-12 text-sm text-muted-foreground">
        No opportunities found.
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Asset Manager</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Strategy Fit</th>
              <th className="px-4 py-3 font-medium">Mandate Fit</th>
              <th className="px-4 py-3 font-medium">Date</th>
              {isOwner && <th className="px-4 py-3 font-medium w-12" />}
            </tr>
          </thead>
          <tbody>
            {opportunities.map((opp) => {
              const stageConfig = STAGE_CONFIG[opp.approvalStage]
              const strategyConfig = opp.strategyFit ? STRATEGY_FIT_CONFIG[opp.strategyFit] : null
              const topFit = opp.mandateFits[0]

              return (
                <tr
                  key={opp.id}
                  className="cursor-pointer border-b transition-colors hover:bg-muted/50 last:border-b-0"
                  onClick={() => navigate(`/home/deals/opportunities/${opp.id}`)}
                >
                  <td className="px-4 py-3 font-medium">{opp.name}</td>
                  <td className="px-4 py-3">{opp.investmentTypeName}</td>
                  <td className="px-4 py-3">{opp.assetManagerName}</td>
                  <td className="px-4 py-3">
                    {opp.pipelineStatus === 'processing' ? (
                      <ProcessingStatusBadge status={opp.pipelineStatus} />
                    ) : (
                      <PipelineStatusBadge status={opp.pipelineStatus} />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={cn('border-none text-xs', stageConfig.className)}>
                      {stageConfig.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {strategyConfig ? (
                      <Tooltip>
                        <TooltipTrigger className="cursor-help">
                          <Badge className={cn('border-none', strategyConfig.className)}>
                            {strategyConfig.label}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">
                            Strategy fit is <strong>{opp.strategyFit}</strong> based on investment criteria alignment, sector overlap, and return profile match.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {topFit ? (
                      <Tooltip>
                        <TooltipTrigger className="cursor-help">
                          <FitScoreBadge score={topFit.fitScore} />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">{topFit.reasoning}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(opp.createdAt).toLocaleDateString()}
                  </td>
                  {isOwner && (
                    <td className="px-2 py-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        disabled={deletingId === opp.id}
                        onClick={(e) => handleDelete(e, opp.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  )
}
