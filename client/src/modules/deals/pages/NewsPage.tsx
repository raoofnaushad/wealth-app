import { useEffect, useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useDealsStore } from '../store'
import { NewsFeed } from '../components/news/NewsFeed'
import { DailyReportButton } from '../components/news/DailyReportButton'
import type { NewsCategory } from '../types'

type TabValue = 'all' | NewsCategory

const tabs: { value: TabValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'market', label: 'Market' },
  { value: 'sector', label: 'Sector' },
  { value: 'asset_manager', label: 'Asset Manager' },
  { value: 'regulatory', label: 'Regulatory' },
]

export function NewsPage() {
  const { newsItems, loadingNews, fetchNews } = useDealsStore()
  const [tab, setTab] = useState<TabValue>('all')

  useEffect(() => {
    const category = tab === 'all' ? undefined : tab
    fetchNews(category)
  }, [tab, fetchNews])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">News</h1>
        <DailyReportButton />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList variant="line">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {loadingNews ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-36 animate-pulse rounded-xl bg-muted"
                />
              ))}
            </div>
          ) : (
            <NewsFeed items={newsItems} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
