import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X,
  Bell,
  FileText,
  MessageSquare,
  UserCheck,
  ArrowRightCircle,
  Mail,
  Target,
  ClipboardCheck,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { dealsApi } from '../api'
import type { DealNotification, NotificationType } from '../types'

interface NotificationPanelProps {
  open: boolean
  onClose: () => void
}

const TYPE_CONFIG: Record<NotificationType, { icon: typeof Bell; label: string; className: string }> = {
  opportunity_created: { icon: Target, label: 'New Opportunity', className: 'text-blue-500' },
  opportunity_assigned: { icon: Users, label: 'Assigned', className: 'text-violet-500' },
  stage_changed: { icon: ArrowRightCircle, label: 'Stage Changed', className: 'text-amber-500' },
  document_shared: { icon: FileText, label: 'Document Shared', className: 'text-emerald-500' },
  review_requested: { icon: ClipboardCheck, label: 'Review Requested', className: 'text-orange-500' },
  review_completed: { icon: CheckCircle, label: 'Review Complete', className: 'text-emerald-500' },
  approval_requested: { icon: ClipboardCheck, label: 'Approval Requested', className: 'text-orange-500' },
  approval_decision: { icon: CheckCircle, label: 'Approval Decision', className: 'text-emerald-500' },
  comment_added: { icon: MessageSquare, label: 'New Comment', className: 'text-blue-500' },
  task_assigned: { icon: UserCheck, label: 'Task Assigned', className: 'text-violet-500' },
  task_due_soon: { icon: Clock, label: 'Task Due Soon', className: 'text-amber-500' },
  email_imported: { icon: Mail, label: 'Email Imported', className: 'text-emerald-500' },
  mandate_match: { icon: AlertTriangle, label: 'Mandate Match', className: 'text-amber-500' },
}

export function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<DealNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    dealsApi.listNotifications()
      .then(setNotifications)
      .finally(() => setLoading(false))
  }, [open])

  async function markRead(id: string) {
    await dealsApi.markNotificationRead(id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  function handleClick(notif: DealNotification) {
    if (!notif.read) markRead(notif.id)
    if (notif.linkTo) {
      navigate(notif.linkTo)
      onClose()
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      {/* Slide-in panel */}
      <div className="fixed right-0 top-0 z-50 h-full w-96 max-w-full bg-background shadow-xl border-l flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="size-4" />
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <Badge className="h-5 min-w-5 px-1.5 text-[10px]">{unreadCount}</Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
          ) : notifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No notifications.</p>
          ) : (
            <div>
              {notifications
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((notif) => {
                  const config = TYPE_CONFIG[notif.type]
                  const Icon = config.icon
                  return (
                    <button
                      key={notif.id}
                      type="button"
                      className={cn(
                        'flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-muted/50',
                        !notif.read && 'bg-primary/5',
                      )}
                      onClick={() => handleClick(notif)}
                    >
                      <div className={cn('mt-0.5 shrink-0', config.className)}>
                        <Icon className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{notif.title}</span>
                          {!notif.read && (
                            <div className="size-1.5 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatRelativeTime(notif.createdAt)}
                        </p>
                      </div>
                    </button>
                  )
                })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

// Bell icon component for the header
export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    dealsApi.listNotifications().then((notifications) => {
      setUnreadCount(notifications.filter(n => !n.read).length)
    })
  }, [])

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative size-8"
        onClick={() => setOpen(true)}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>
      <NotificationPanel open={open} onClose={() => {
        setOpen(false)
        // Refresh count
        dealsApi.listNotifications().then((notifications) => {
          setUnreadCount(notifications.filter(n => !n.read).length)
        })
      }} />
    </>
  )
}
