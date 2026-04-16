import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { dealsApi } from '../api'
import { StrategyOverview } from '../components/mandates/StrategyOverview'
import { PipelineStatusBadge } from '../components/opportunities/PipelineStatusBadge'
import type { Mandate, MandateStatus, Opportunity } from '../types'

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
          <MatchedOpportunities mandateId={mandate.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MatchedOpportunities({ mandateId }: { mandateId: string }) {
  const navigate = useNavigate()
  const [matches, setMatches] = useState<(Opportunity & { matchScore: number })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dealsApi.getMandateMatches(mandateId)
      .then(setMatches)
      .finally(() => setLoading(false))
  }, [mandateId])

  if (loading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Loading matches...</div>
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <FileText className="size-10 text-muted-foreground/50" />
        <div>
          <p className="font-medium">No Matches</p>
          <p className="text-sm text-muted-foreground">
            No opportunities match this mandate yet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-muted-foreground">
            <th className="px-4 py-3 font-medium">Fit Score</th>
            <th className="px-4 py-3 font-medium">Opportunity</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Pipeline Status</th>
            <th className="px-4 py-3 font-medium">Asset Manager</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((opp) => (
            <tr
              key={opp.id}
              className="cursor-pointer border-b transition-colors hover:bg-muted/50 last:border-b-0"
              onClick={() => navigate(`/home/deals/opportunities/${opp.id}`)}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {opp.matchScore}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 font-medium">{opp.name}</td>
              <td className="px-4 py-3">{opp.investmentTypeName}</td>
              <td className="px-4 py-3">
                <PipelineStatusBadge status={opp.pipelineStatus} />
              </td>
              <td className="px-4 py-3 text-muted-foreground">{opp.assetManagerName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
