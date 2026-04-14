import { useState } from 'react'
import { AlertCircle, Check, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { dealsApi } from '../../api'
import type { ApprovalRequest } from '../../types'

const STAGE_LABELS: Record<string, string> = {
  pre_screening: 'Pre-Screening',
  due_diligence: 'Due Diligence',
  ic_review: 'IC Review',
  approved: 'Final Approval',
}

interface ReviewBannerProps {
  opportunityId: string
  approvals: ApprovalRequest[]
  currentUserId: string
  onApprovalUpdate: (approval: ApprovalRequest) => void
}

export function ReviewBanner({ opportunityId, approvals, currentUserId, onApprovalUpdate }: ReviewBannerProps) {
  const [activeAction, setActiveAction] = useState<{ approvalId: string; action: 'approve' | 'request_changes' } | null>(null)
  const [rationale, setRationale] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const pendingForUser = approvals.filter(
    (a) => a.status === 'pending' && a.reviewerId === currentUserId,
  )

  if (pendingForUser.length === 0) {
    return null
  }

  const approval = pendingForUser[0]
  const stageLabel = STAGE_LABELS[approval.stage] ?? approval.stage
  const docCount = approval.documentIds.length

  async function handleSubmit() {
    if (!activeAction || !rationale.trim()) return

    setSubmitting(true)
    try {
      const status = activeAction.action === 'approve' ? 'approved' : 'changes_requested'
      const updated = await dealsApi.updateApproval(opportunityId, activeAction.approvalId, {
        status,
        rationale: rationale.trim(),
      })
      onApprovalUpdate(updated)
      setActiveAction(null)
      setRationale('')
    } catch {
      // Error handling will be improved when toast notifications are added
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="border-b bg-amber-50 px-4 py-3 dark:bg-amber-950/30">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                This opportunity is pending{' '}
                <Badge variant="outline" className="mx-0.5 border-amber-300 text-amber-700 dark:border-amber-600 dark:text-amber-300">
                  {stageLabel}
                </Badge>{' '}
                approval
              </p>
              {docCount > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {docCount} document{docCount !== 1 ? 's' : ''} shared for review
                </p>
              )}
            </div>

            {!activeAction && (
              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-green-300 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-700 dark:bg-green-950/50 dark:text-green-300 dark:hover:bg-green-950"
                  onClick={() =>
                    setActiveAction({ approvalId: approval.id, action: 'approve' })
                  }
                >
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setActiveAction({ approvalId: approval.id, action: 'request_changes' })
                  }
                >
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />
                  Request Changes
                </Button>
              </div>
            )}
          </div>

          {activeAction && (
            <div className="space-y-2">
              <Textarea
                placeholder={
                  activeAction.action === 'approve'
                    ? 'Add approval rationale...'
                    : 'Describe the changes needed...'
                }
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                rows={3}
                className="bg-white dark:bg-background"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!rationale.trim() || submitting}
                >
                  {submitting
                    ? 'Submitting...'
                    : activeAction.action === 'approve'
                      ? 'Confirm Approval'
                      : 'Submit Feedback'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setActiveAction(null)
                    setRationale('')
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
