import { ExternalLink } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { NewsItem, NewsCategory } from '../../types'

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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold leading-snug">
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
          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-muted-foreground hover:text-foreground"
              aria-label="Open source"
            >
              <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
