import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useDealsStore } from '../store'
import { OpportunityTable } from '../components/opportunities/OpportunityTable'
import { CreateOpportunityDialog } from '../components/opportunities/CreateOpportunityDialog'
import type { PipelineStatus } from '../types'

const tabs: { label: string; value: PipelineStatus | null }[] = [
  { label: 'All', value: null },
  { label: 'New', value: 'new' },
  { label: 'Active', value: 'active' },
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Opportunities</h1>
        <CreateOpportunityDialog />
      </div>

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
        <OpportunityTable opportunities={opportunities} />
      )}
    </div>
  )
}
