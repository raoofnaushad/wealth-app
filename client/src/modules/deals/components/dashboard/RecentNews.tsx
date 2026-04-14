import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { NewsItem } from '../../types'

interface RecentNewsProps {
  newsItems: NewsItem[]
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '...'
}

function relativeTime(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`

  const diffMonths = Math.floor(diffDays / 30)
  return `${diffMonths}mo ago`
}

export function RecentNews({ newsItems }: RecentNewsProps) {
  const navigate = useNavigate()
  const displayed = newsItems.slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent News</CardTitle>
      </CardHeader>
      <CardContent>
        {displayed.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent news</p>
        ) : (
          <ul className="divide-y divide-border">
            {displayed.map((item) => (
              <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium leading-snug">
                    {truncate(item.headline, 60)}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                    {relativeTime(item.generatedAt)}
                  </span>
                </div>
                {item.category && (
                  <Badge variant="secondary" className="mt-1.5 text-[10px]">
                    {item.category.replace('_', ' ')}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {displayed.length > 0 && (
        <CardFooter>
          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={() => navigate('/home/deals/news')}
          >
            View all &rarr;
          </button>
        </CardFooter>
      )}
    </Card>
  )
}
