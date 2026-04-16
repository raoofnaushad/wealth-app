import { useState } from 'react'
import { Download, FileText, TrendingUp, AlertCircle, Newspaper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDealsStore } from '../../store'

function getTodayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function DailyReportButton() {
  const [open, setOpen] = useState(false)
  const newsItems = useDealsStore((s) => s.newsItems)

  const market = newsItems.filter((n) => n.category === 'market')
  const sector = newsItems.filter((n) => n.category === 'sector')
  const regulatory = newsItems.filter((n) => n.category === 'regulatory')
  const assetManager = newsItems.filter((n) => n.category === 'asset_manager')

  function handleDownload() {
    const lines: string[] = [
      `DAILY DEALS REPORT — ${getTodayLabel()}`,
      '='.repeat(60),
      '',
    ]

    const sections: { label: string; items: typeof newsItems }[] = [
      { label: 'Market', items: market },
      { label: 'Sector', items: sector },
      { label: 'Asset Manager', items: assetManager },
      { label: 'Regulatory', items: regulatory },
    ]

    for (const { label, items } of sections) {
      if (items.length === 0) continue
      lines.push(`── ${label.toUpperCase()} ──`)
      for (const item of items) {
        lines.push(`• ${item.headline}`)
        if (item.summary) lines.push(`  ${item.summary}`)
        lines.push('')
      }
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `daily-report-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileText className="mr-1.5 size-4" />
        Daily Report
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Newspaper className="size-4" />
              Daily Deals Report
            </DialogTitle>
            <p className="text-xs text-muted-foreground">{getTodayLabel()}</p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-5 py-2 pr-1">
            {newsItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No news items available for today's report.
              </p>
            ) : (
              <>
                {market.length > 0 && (
                  <ReportSection icon={TrendingUp} label="Market" items={market} color="text-blue-500" />
                )}
                {sector.length > 0 && (
                  <ReportSection icon={TrendingUp} label="Sector" items={sector} color="text-emerald-500" />
                )}
                {assetManager.length > 0 && (
                  <ReportSection icon={FileText} label="Asset Manager" items={assetManager} color="text-amber-500" />
                )}
                {regulatory.length > 0 && (
                  <ReportSection icon={AlertCircle} label="Regulatory" items={regulatory} color="text-violet-500" />
                )}
              </>
            )}
          </div>

          {newsItems.length > 0 && (
            <div className="border-t pt-3">
              <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={handleDownload}>
                <Download className="size-3.5" />
                Download as .txt
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function ReportSection({
  icon: Icon,
  label,
  items,
  color,
}: {
  icon: typeof TrendingUp
  label: string
  items: ReturnType<typeof useDealsStore.getState>['newsItems']
  color: string
}) {
  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${color}`}>
        <Icon className="size-3.5" />
        {label}
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="space-y-0.5">
            <p className="text-sm font-medium leading-snug">{item.headline}</p>
            {item.summary && (
              <p className="text-xs text-muted-foreground line-clamp-2">{item.summary}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
