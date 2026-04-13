import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { useDealsStore } from '../../store'
import { PipelineStatusBadge } from '../opportunities/PipelineStatusBadge'

interface LinkedOpportunitiesProps {
  assetManagerId: string
}

export function LinkedOpportunities({ assetManagerId }: LinkedOpportunitiesProps) {
  const navigate = useNavigate()
  const opportunities = useDealsStore((s) => s.opportunities)
  const loadingOpportunities = useDealsStore((s) => s.loadingOpportunities)
  const fetchOpportunities = useDealsStore((s) => s.fetchOpportunities)

  useEffect(() => {
    if (opportunities.length === 0) {
      fetchOpportunities()
    }
  }, [opportunities.length, fetchOpportunities])

  const linked = opportunities.filter((opp) => opp.assetManagerId === assetManagerId)

  if (loadingOpportunities) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (linked.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <FileText className="size-10 text-muted-foreground/50" />
        <div>
          <p className="font-medium">No opportunities from this asset manager.</p>
          <p className="text-sm text-muted-foreground">
            Opportunities linked to this asset manager will appear here.
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
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Investment Type</th>
            <th className="px-4 py-3 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {linked.map((opp) => (
            <tr
              key={opp.id}
              className="cursor-pointer border-b transition-colors hover:bg-muted/50 last:border-b-0"
              onClick={() => navigate(`/home/deals/opportunities/${opp.id}`)}
            >
              <td className="px-4 py-3 font-medium">{opp.name}</td>
              <td className="px-4 py-3">
                <PipelineStatusBadge status={opp.pipelineStatus} />
              </td>
              <td className="px-4 py-3">{opp.investmentTypeName}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(opp.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
