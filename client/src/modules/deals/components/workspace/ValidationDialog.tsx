import { useState, useEffect } from 'react'
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
import { useDealsStore } from '../../store'
import { dealsApi } from '../../api'
import type { Document, TeamMember } from '../../types'

interface ValidationDialogProps {
  documents: Document[]
  onClose: () => void
}

const typeLabels: Record<string, string> = {
  investment_memo: 'Memo',
  pre_screening: 'Pre-screening',
  ddq: 'DDQ',
  news: 'News',
  market_analysis: 'Analysis',
  custom: 'Custom',
}

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  in_review: 'In Review',
  approved: 'Approved',
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function ValidationDialog({ documents, onClose }: ValidationDialogProps) {
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set())
  const [selectedReviewerIds, setSelectedReviewerIds] = useState<Set<string>>(new Set())
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const updateWorkspaceDocument = useDealsStore((s) => s.updateWorkspaceDocument)

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
    if (selectedDocIds.size === 0 || selectedReviewerIds.size === 0) return

    setSubmitting(true)
    try {
      const documentIds = Array.from(selectedDocIds)

      await Promise.all(
        Array.from(selectedReviewerIds).map((reviewerId) =>
          dealsApi.createReview({ reviewerId, documentIds })
        )
      )

      for (const doc of documents) {
        if (selectedDocIds.has(doc.id)) {
          updateWorkspaceDocument({ ...doc, status: 'in_review' })
        }
      }

      onClose()
    } catch {
      // Error handling will be improved when toast notifications are added
    } finally {
      setSubmitting(false)
    }
  }

  // Only show managers for validation
  const managers = teamMembers.filter((m) => m.role === 'manager')

  const canSubmit = selectedDocIds.size > 0 && selectedReviewerIds.size > 0 && !submitting

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send for Validation</DialogTitle>
          <DialogDescription>
            Select documents and choose team members to validate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Document selection */}
          <div className="space-y-2">
            <Label>Documents</Label>
            <div className="max-h-48 space-y-0.5 overflow-y-auto rounded-md border p-2">
              {documents.map((doc) => {
                const isDraft = doc.status === 'draft'
                const isSelected = selectedDocIds.has(doc.id)

                return (
                  <label
                    key={doc.id}
                    className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors ${
                      isDraft
                        ? 'cursor-pointer hover:bg-muted/60'
                        : 'cursor-not-allowed opacity-50'
                    } ${isSelected ? 'bg-muted/40' : ''}`}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={!isDraft}
                      onCheckedChange={() => handleToggleDoc(doc.id)}
                    />
                    <span className="flex-1 truncate font-medium">{doc.name}</span>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {typeLabels[doc.documentType] ?? doc.documentType}
                    </Badge>
                    <Badge
                      variant={isDraft ? 'outline' : 'default'}
                      className="text-[10px] shrink-0"
                    >
                      {statusLabels[doc.status] ?? doc.status}
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

          {/* Team member picker */}
          <div className="space-y-2">
            <Label>Choose managers to validate this report:</Label>
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
                      className={`flex items-center gap-3 rounded-md px-2 py-2 cursor-pointer transition-colors hover:bg-muted/60 ${
                        isSelected ? 'bg-muted/40' : ''
                      }`}
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
                        <div className="text-xs text-muted-foreground truncate">{member.role}</div>
                      </div>
                    </label>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting
              ? 'Sending...'
              : `Send to Selected (${selectedReviewerIds.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
