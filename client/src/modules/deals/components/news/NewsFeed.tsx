import { Newspaper } from 'lucide-react'
import { NewsCard } from './NewsCard'
import type { NewsItem } from '../../types'

interface NewsFeedProps {
  items: NewsItem[]
}

export function NewsFeed({ items }: NewsFeedProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <Newspaper className="size-10 text-muted-foreground/50" />
        <div>
          <p className="font-medium">No news available</p>
          <p className="text-sm text-muted-foreground">
            News will be generated based on active opportunities and mandates.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <NewsCard key={item.id} item={item} />
      ))}
    </div>
  )
}
