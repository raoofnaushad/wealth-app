import { Fragment, useState, useEffect } from 'react'
import { Bot, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { dealsApi } from '../../api'
import { cn } from '@/lib/utils'
import type { ApprovalStage, ApprovalRequest, Document, TeamMember } from '../../types'

interface ValidationDialogProps {
  opportunityId: string
  currentStage: ApprovalStage
  documents: Document[]
  onClose: () => void
  onSubmitted: (approvals: ApprovalRequest[]) => void
}

const STAGE_LABELS: Record<string, string> = {
  pre_screening: 'Pre-Screening',
  due_diligence: 'Due Diligence',
  ic_review: 'IC Review',
  approved: 'Final Approval',
}

const typeLabels: Record<string, string> = {
  investment_memo: 'Memo',
  pre_screening: 'Pre-screen',
  ddq: 'DDQ',
  news: 'News',
  market_analysis: 'Analysis',
  custom: 'Custom',
  note: 'Note',
}

function getNextStage(current: ApprovalStage): ApprovalStage | null {
  if (current === 'new') return 'pre_screening'
  if (current === 'pre_screening') return 'due_diligence'
  if (current === 'due_diligence') return 'ic_review'
  if (current === 'ic_review') return 'approved'
  return null
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function StageProgress({ currentStage }: { currentStage: ApprovalStage }) {
  const stages = [
    { key: 'pre_screening', label: 'Pre-Screening' },
    { key: 'due_diligence', label: 'Due Diligence' },
    { key: 'ic_review', label: 'IC Review' },
    { key: 'approved', label: 'Approved' },
  ]
  const currentIdx = stages.findIndex(s => s.key === currentStage)

  return (
    <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg border bg-muted/30">
      {stages.map((stage, i) => {
        const isCompleted = i < currentIdx
        const isCurrent = stage.key === currentStage
        const isFuture = i > currentIdx
        return (
          <Fragment key={stage.key}>
            {i > 0 && (
              <div className={cn('h-px w-8', isCompleted ? 'bg-emerald-500' : 'bg-border')} />
            )}
            <div className="flex items-center gap-1.5">
              <div className={cn(
                'h-2.5 w-2.5 rounded-full',
                isCompleted && 'bg-emerald-500',
                isCurrent && 'bg-primary ring-2 ring-primary/30',
                isFuture && 'bg-muted-foreground/30',
              )} />
              <span className={cn(
                'text-xs font-medium',
                isCompleted && 'text-emerald-600',
                isCurrent && 'text-primary',
                isFuture && 'text-muted-foreground',
              )}>
                {stage.label}
              </span>
            </div>
          </Fragment>
        )
      })}
    </div>
  )
}

export function ValidationDialog({
  opportunityId,
  currentStage,
  documents,
  onClose,
  onSubmitted,
}: ValidationDialogProps) {
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set())
  const [selectedReviewerIds, setSelectedReviewerIds] = useState<Set<string>>(new Set())
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [rationale, setRationale] = useState('')
  const [generatingRationale, setGeneratingRationale] = useState(false)

  const nextStage = getNextStage(currentStage)

  useEffect(() => {
    let cancelled = false
    async function fetchMembers() {
      try {
        const members = await dealsApi.listTeamMembers()
        if (!cancelled) {
          setTeamMembers(members)
        }
      } catch {
        // Silently handle — team members list will remain empty
      } finally {
        if (!cancelled) {
          setLoadingMembers(false)
        }
      }
    }
    fetchMembers()
    return () => { cancelled = true }
  }, [])

  function handleToggleDoc(docId: string) {
    setSelectedDocIds((prev) => {
      const next = new Set(prev)
      if (next.has(docId)) {
        next.delete(docId)
      } else {
        next.add(docId)
      }
      return next
    })
  }

  function handleToggleReviewer(memberId: string) {
    setSelectedReviewerIds((prev) => {
      const next = new Set(prev)
      if (next.has(memberId)) {
        next.delete(memberId)
      } else {
        next.add(memberId)
      }
      return next
    })
  }

  async function handleSubmit() {
    if (!nextStage || selectedDocIds.size === 0 || selectedReviewerIds.size === 0) return

    setSubmitting(true)
    try {
      const result = await dealsApi.submitForApproval(opportunityId, {
        stage: nextStage,
        reviewerIds: Array.from(selectedReviewerIds),
        documentIds: Array.from(selectedDocIds),
      })
      onSubmitted(result)
    } catch {
      // TODO: toast
    } finally {
      setSubmitting(false)
    }
  }

  const managers = teamMembers.filter((m) => m.role === 'manager')

  const canSubmit =
    !!nextStage && selectedDocIds.size > 0 && selectedReviewerIds.size > 0 && !submitting

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send for Approval</DialogTitle>
          <DialogDescription>
            Advance this opportunity to the next review stage.
          </DialogDescription>
        </DialogHeader>

        <StageProgress currentStage={currentStage} />

        <div className="space-y-5">
          {/* Document selection */}
          <div className="space-y-2">
            <Label>Documents to share with reviewers:</Label>
            <div className="max-h-48 space-y-0.5 overflow-y-auto rounded-md border p-2">
              {documents.map((doc) => {
                const isSelected = selectedDocIds.has(doc.id)

                return (
                  <label
                    key={doc.id}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-2 py-2 text-sm cursor-pointer transition-colors hover:bg-muted/60',
                      isSelected && 'bg-muted/40',
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleDoc(doc.id)}
                    />
                    <span className="flex-1 truncate font-medium">{doc.name}</span>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {typeLabels[doc.documentType] ?? doc.documentType}
                    </Badge>
                  </label>
                )
              })}
              {documents.length === 0 && (
                <p className="py-2 text-center text-xs text-muted-foreground">
                  No documents in this workspace.
                </p>
              )}
            </div>
          </div>

          {/* Manager picker */}
          <div className="space-y-2">
            <Label>Select managers to review:</Label>
            <div className="max-h-56 space-y-0.5 overflow-y-auto rounded-md border p-2">
              {loadingMembers ? (
                <p className="py-3 text-center text-xs text-muted-foreground">
                  Loading team members...
                </p>
              ) : managers.length === 0 ? (
                <p className="py-3 text-center text-xs text-muted-foreground">
                  No managers found.
                </p>
              ) : (
                managers.map((member) => {
                  const isSelected = selectedReviewerIds.has(member.id)

                  return (
                    <label
                      key={member.id}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-2 py-2 cursor-pointer transition-colors hover:bg-muted/60',
                        isSelected && 'bg-muted/40',
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleReviewer(member.id)}
                      />
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                        {getInitials(member.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{member.name}</div>
                        <div className="text-xs text-muted-foreground truncate capitalize">{member.role}</div>
                      </div>
                    </label>
                  )
                })
              )}
            </div>
          </div>

          {/* Rationale */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Rationale (optional):</Label>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                disabled={generatingRationale || selectedDocIds.size === 0}
                onClick={async () => {
                  setGeneratingRationale(true)
                  // Simulate AI rationale generation
                  await new Promise(r => setTimeout(r, 1500))
                  setRationale(
                    `Based on analysis of ${selectedDocIds.size} document(s), this opportunity demonstrates strong alignment with active mandates. Key strengths include competitive fee structure, experienced GP team, and favorable market positioning. The opportunity meets the criteria for advancement to ${nextStage ? STAGE_LABELS[nextStage] : 'the next stage'}.`
                  )
                  setGeneratingRationale(false)
                }}
              >
                {generatingRationale ? (
                  <>
                    <Loader2 className="size-3 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Bot className="size-3" />
                    Auto-generate
                  </>
                )}
              </Button>
            </div>
            <Textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Provide context for reviewers..."
              rows={3}
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting
              ? 'Sending...'
              : nextStage
                ? `Send for ${STAGE_LABELS[nextStage]} Approval`
                : 'Cannot Advance'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
