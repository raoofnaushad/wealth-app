import { useState, useEffect } from 'react'
import { Bell, ExternalLink, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { toast } from 'sonner'
import { dealsApi } from '../../api'
import type { NewsItem, NewsCategory, TeamMember } from '../../types'

const categoryStyles: Record<NewsCategory, string> = {
  market: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  sector: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  asset_manager: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  regulatory: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
}

const categoryLabels: Record<NewsCategory, string> = {
  market: 'Market',
  sector: 'Sector',
  asset_manager: 'Asset Manager',
  regulatory: 'Regulatory',
}

function formatRelativeTime(dateString: string): string {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diffMs = now - then

  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`

  const hours = Math.floor(diffMs / 3_600_000)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`

  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface NewsCardProps {
  item: NewsItem
}

export function NewsCard({ item }: NewsCardProps) {
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [notifying, setNotifying] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoadingMembers(true)
    dealsApi.listTeamMembers()
      .then(setMembers)
      .finally(() => setLoadingMembers(false))
  }, [open])

  async function handleNotify(member: TeamMember) {
    setNotifying(member.id)
    // Simulate a network call (no real endpoint needed)
    await new Promise((r) => setTimeout(r, 600))
    setNotifying(null)
    setOpen(false)
    toast.success(`${member.name} notified about this article.`)
  }

  return (
    <Card className="group relative">
      <CardHeader>
        <CardTitle className="text-sm font-semibold leading-snug pr-6">
          {item.headline}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {item.summary && (
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {item.summary}
          </p>
        )}

        <div className="flex items-center gap-2">
          {item.category && (
            <Badge variant="secondary" className={categoryStyles[item.category]}>
              {categoryLabels[item.category]}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(item.generatedAt)}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Notify team member"
                >
                  <Bell className="size-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-52 p-2">
                <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Notify team member
                </p>
                {loadingMembers ? (
                  <div className="flex items-center justify-center py-3">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ul className="space-y-0.5">
                    {members.map((m) => (
                      <li key={m.id}>
                        <button
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50"
                          disabled={notifying === m.id}
                          onClick={() => handleNotify(m)}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                            {m.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                          <span className="flex-1 truncate text-left">{m.name}</span>
                          {notifying === m.id && <Loader2 className="size-3 animate-spin" />}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </PopoverContent>
            </Popover>

            {item.sourceUrl && (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Open source"
              >
                <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
