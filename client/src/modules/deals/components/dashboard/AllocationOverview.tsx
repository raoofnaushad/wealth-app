import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { MandateAllocationSummary } from '../../types'

interface AllocationOverviewProps {
  mandateAllocations: MandateAllocationSummary[]
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`
  }
  return `$${value.toLocaleString()}`
}

export function AllocationOverview({ mandateAllocations }: AllocationOverviewProps) {
  const navigate = useNavigate()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Allocation Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {mandateAllocations.length === 0 && (
          <p className="text-sm text-muted-foreground">No mandate allocations</p>
        )}
        {mandateAllocations.map((mandate) => {
          const target = mandate.targetAllocation ?? 0
          const progressPct = target > 0
            ? Math.min((mandate.currentAllocation / target) * 100, 100)
            : 0

          return (
            <div key={mandate.mandateId} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="font-semibold text-sm hover:underline text-left"
                  onClick={() => navigate(`/home/deals/mandates/${mandate.mandateId}`)}
                >
                  {mandate.mandateName}
                </button>
                <span className="text-xs text-muted-foreground">
                  {mandate.opportunityCount} opportunities
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Target: {target > 0 ? formatCurrency(target) : 'N/A'}</span>
                <span>{progressPct.toFixed(0)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
