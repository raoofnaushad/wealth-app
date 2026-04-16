import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { dealsApi } from '../api'
import { StrategyOverview } from '../components/mandates/StrategyOverview'
import type { Mandate, MandateStatus } from '../types'

const statusConfig: Record<MandateStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  draft: { label: 'Draft', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  closed: { label: 'Closed', className: 'bg-muted text-muted-foreground' },
}

export function MandateDetailPage() {
  const { mandateId } = useParams<{ mandateId: string }>()
  const navigate = useNavigate()
  const [mandate, setMandate] = useState<Mandate | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!mandateId) return
    setLoading(true)
    dealsApi
      .getMandate(mandateId)
      .then(setMandate)
      .catch(() => {
        // TODO: handle not found
      })
      .finally(() => setLoading(false))
  }, [mandateId])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  if (!mandate) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <FileText className="size-10 text-muted-foreground/50" />
        <p className="font-medium">Mandate not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/home/deals/mandates')}>
          <ArrowLeft className="mr-1 size-3.5" />
          Back to Mandates
        </Button>
      </div>
    )
  }

  const status = statusConfig[mandate.status]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate('/home/deals/mandates')}
          aria-label="Back to mandates"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{mandate.name}</h1>
        <Badge variant="secondary" className={cn('shrink-0', status.className)}>
          {status.label}
        </Badge>
      </div>

      <Tabs defaultValue="strategy">
        <TabsList variant="line">
          <TabsTrigger value="strategy">Strategy Overview</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
        </TabsList>

        <TabsContent value="strategy" className="mt-4">
          <StrategyOverview mandate={mandate} onUpdate={setMandate} />
        </TabsContent>

        <TabsContent value="opportunities" className="mt-4">
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <FileText className="size-10 text-muted-foreground/50" />
            <div>
              <p className="font-medium">Opportunities</p>
              <p className="text-sm text-muted-foreground">
                Matched opportunities for this mandate will appear here.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
