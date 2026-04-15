import { useState } from 'react'
import { X, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import type { SyncedEmail } from '../../types'

interface EmailPreviewProps {
  email: SyncedEmail
  onImport: () => void
  onIgnore: () => void
  onUnignore: () => void
  onClose: () => void
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return 'Unknown size'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014'
  return new Date(dateStr).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function EmailPreview({ email, onImport, onIgnore, onUnignore, onClose }: EmailPreviewProps) {
  const isImported = email.importStatus === 'imported'
  const isIgnored = email.importStatus === 'ignored'
  const [showReprocessConfirm, setShowReprocessConfirm] = useState(false)

  return (
    <div className="flex h-full flex-col rounded-lg border bg-card">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b p-4">
        <div className="flex flex-col gap-1 min-w-0">
          <h3 className="text-lg font-semibold leading-tight truncate">
            {email.subject || '(No subject)'}
          </h3>
          <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">{email.fromName || 'Unknown'}</span>
              {email.fromAddress && (
                <span className="ml-1">&lt;{email.fromAddress}&gt;</span>
              )}
            </span>
            <span>{formatDate(email.receivedAt)}</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={onClose}>
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="prose prose-sm max-w-none dark:prose-invert text-sm leading-relaxed whitespace-pre-wrap">
          {email.bodyText || 'No content available'}
        </div>
      </div>

      {/* Attachments */}
      {email.attachments.length > 0 && (
        <div className="border-t p-4">
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Attachments ({email.attachments.length})
          </h4>
          <div className="flex flex-col gap-2">
            {email.attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate flex-1">{att.fileName || 'Untitled'}</span>
                {att.fileType && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                    {att.fileType}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatFileSize(att.fileSize)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="border-t p-4">
        {isImported ? (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={cn('bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400')}>
              Already imported
            </Badge>
            {email.opportunityId && (
              <a
                href={`/home/deals/opportunities/${email.opportunityId}`}
                className="text-sm text-primary hover:underline"
              >
                View opportunity
              </a>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowReprocessConfirm(true)}>
              Re-process
            </Button>
          </div>
        ) : isIgnored ? (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              Ignored
            </Badge>
            <Button variant="outline" size="sm" onClick={onUnignore}>
              Unignore
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button onClick={onImport}>
              Add as Opportunity
            </Button>
            <Button variant="ghost" onClick={onIgnore}>
              Ignore
            </Button>
          </div>
        )}
      </div>

      {/* Re-process confirm dialog */}
      {showReprocessConfirm && (
        <Dialog open onOpenChange={(open) => { if (!open) setShowReprocessConfirm(false) }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Re-process Email?</DialogTitle>
              <DialogDescription>
                This email has already been imported as an opportunity. Re-processing will create a new opportunity from this email. The existing opportunity will not be affected.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReprocessConfirm(false)}>
                Cancel
              </Button>
              <Button onClick={() => { setShowReprocessConfirm(false); onImport() }}>
                Re-process
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
