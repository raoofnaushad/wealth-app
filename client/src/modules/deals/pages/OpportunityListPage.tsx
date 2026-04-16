import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDealsStore } from '../store'
import { OpportunityTable } from '../components/opportunities/OpportunityTable'
import { CreateOpportunityDialog } from '../components/opportunities/CreateOpportunityDialog'
import { FitScoreBadge } from '../components/opportunities/FitScoreBadge'
import type { PipelineStatus } from '../types'

const tabs: { label: string; value: PipelineStatus | null }[] = [
  { label: 'All', value: null },
  { label: 'New', value: 'new' },
  { label: 'Active', value: 'active' },
  { label: 'Processing', value: 'processing' },
  { label: 'Archived', value: 'archived' },
  { label: 'Ignored', value: 'ignored' },
]

export function OpportunityListPage() {
  const {
    opportunities,
    loadingOpportunities,
    pipelineFilter,
    setPipelineFilter,
    fetchOpportunities,
  } = useDealsStore()

  useEffect(() => {
    const filters = pipelineFilter ? { pipelineStatus: pipelineFilter } : undefined
    fetchOpportunities(filters)
  }, [pipelineFilter, fetchOpportunities])

  // Top matches: opportunities with 'strong' mandate fit, sorted by most fits
  const topMatches = opportunities
    .filter(opp => opp.mandateFits.some(f => f.fitScore === 'strong'))
    .sort((a, b) => b.mandateFits.length - a.mandateFits.length)
    .slice(0, 5)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Opportunities</h1>
        <CreateOpportunityDialog />
      </div>

      {topMatches.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="size-4 text-amber-500" />
              Top Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {topMatches.map((opp) => (
                <div
                  key={opp.id}
                  className="rounded-lg border p-3 space-y-1.5 cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => window.location.href = `/home/deals/opportunities/${opp.id}`}
                >
                  <p className="text-sm font-medium truncate">{opp.name}</p>
                  <p className="text-xs text-muted-foreground">{opp.investmentTypeName}</p>
                  <div className="flex items-center gap-1.5">
                    <FitScoreBadge score={opp.mandateFits[0].fitScore} />
                    {opp.mandateFits.length > 1 && (
                      <span className="text-xs text-muted-foreground">
                        +{opp.mandateFits.length - 1} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            type="button"
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              'hover:text-foreground',
              pipelineFilter === tab.value
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground',
            )}
            onClick={() => setPipelineFilter(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loadingOpportunities ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Loading opportunities...
        </div>
      ) : (
        <OpportunityTable
          opportunities={opportunities}
          onDeleted={() => {
            const filters = pipelineFilter ? { pipelineStatus: pipelineFilter } : undefined
            fetchOpportunities(filters)
          }}
        />
      )}
    </div>
  )
}
