import { useState, useMemo } from 'react'
import { Paperclip, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'
import type { SyncedEmail, EmailImportStatus } from '../../types'

interface EmailListProps {
  emails: SyncedEmail[]
  selectedId: string | null
  onSelect: (email: SyncedEmail) => void
}

const statusTabs: { label: string; value: EmailImportStatus | null }[] = [
  { label: 'All', value: null },
  { label: 'New', value: 'new' },
  { label: 'Imported', value: 'imported' },
  { label: 'Ignored', value: 'ignored' },
]

const statusVariant: Record<EmailImportStatus, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  imported: { label: 'Imported', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  ignored: { label: 'Ignored', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '\u2014'
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMinutes = Math.floor(diffMs / 60000)
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export function EmailList({ emails, selectedId, onSelect }: EmailListProps) {
  const [statusFilter, setStatusFilter] = useState<EmailImportStatus | null>(null)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let result = emails
    if (statusFilter) {
      result = result.filter((e) => e.importStatus === statusFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (e) =>
          (e.subject ?? '').toLowerCase().includes(q) ||
          (e.fromName ?? '').toLowerCase().includes(q) ||
          (e.fromAddress ?? '').toLowerCase().includes(q),
      )
    }
    return result
  }, [emails, statusFilter, search])

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1 border-b">
          {statusTabs.map((tab) => (
            <button
              key={tab.label}
              type="button"
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                'hover:text-foreground',
                statusFilter === tab.value
                  ? 'border-b-2 border-primary text-foreground'
                  : 'text-muted-foreground',
              )}
              onClick={() => setStatusFilter(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed py-12 text-sm text-muted-foreground">
          No emails found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <TooltipProvider>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">From</th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Attachments</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((email) => (
                  <tr
                    key={email.id}
                    className={cn(
                      'cursor-pointer border-b transition-colors last:border-b-0',
                      selectedId === email.id
                        ? 'bg-muted'
                        : 'hover:bg-muted/50',
                    )}
                    onClick={() => onSelect(email)}
                  >
                    <td className="px-4 py-3">
                      <Tooltip>
                        <TooltipTrigger className="text-left font-medium truncate max-w-[180px] block">
                          {email.fromName || email.fromAddress || 'Unknown'}
                        </TooltipTrigger>
                        <TooltipContent>
                          {email.fromAddress ?? 'No address'}
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="px-4 py-3 max-w-[300px] truncate">
                      {email.subject || '(No subject)'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(email.receivedAt)}
                    </td>
                    <td className="px-4 py-3">
                      {email.attachmentCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Paperclip className="size-3.5" />
                          {email.attachmentCount}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">&mdash;</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn('border-transparent text-[11px]', statusVariant[email.importStatus].className)}
                      >
                        {statusVariant[email.importStatus].label}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TooltipProvider>
        </div>
      )}
    </div>
  )
}
