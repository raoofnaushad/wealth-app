import { useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
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
import type { EmailAccount } from '../../types'

interface EmailAccountListProps {
  accounts: EmailAccount[]
  onSync: (id: string) => void
  onDisconnect: (id: string) => void
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMinutes = Math.floor(diffMs / 60000)
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

const statusColors: Record<EmailAccount['status'], string> = {
  connected: 'bg-green-500',
  syncing: 'bg-amber-500',
  error: 'bg-red-500',
  disconnected: 'bg-gray-400',
}

export function EmailAccountList({ accounts, onSync, onDisconnect }: EmailAccountListProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null)

  if (accounts.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No email accounts connected.
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2.5"
          >
            <span
              className={cn('size-2 shrink-0 rounded-full', statusColors[account.status])}
              aria-label={account.status}
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{account.emailAddress}</span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                  {account.provider === 'gmail' ? 'Gmail' : account.provider}
                </Badge>
                <span>Synced {formatRelativeTime(account.lastSyncedAt)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => onSync(account.id)}
                disabled={account.status === 'syncing'}
              >
                <RefreshCw className={cn('size-3.5', account.status === 'syncing' && 'animate-spin')} />
                <span className="sr-only">Sync now</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => setConfirmId(account.id)}
              >
                <X className="size-3.5" />
                <span className="sr-only">Disconnect</span>
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={confirmId !== null} onOpenChange={(open) => { if (!open) setConfirmId(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Disconnect Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect this email account? Synced emails will be preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmId) onDisconnect(confirmId)
                setConfirmId(null)
              }}
            >
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
