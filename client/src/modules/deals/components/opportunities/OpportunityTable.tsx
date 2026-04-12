import { useNavigate } from 'react-router-dom'
import type { Opportunity } from '../../types'
import { PipelineStatusBadge } from './PipelineStatusBadge'
import { FitScoreBadge } from './FitScoreBadge'

interface OpportunityTableProps {
  opportunities: Opportunity[]
}

export function OpportunityTable({ opportunities }: OpportunityTableProps) {
  const navigate = useNavigate()

  if (opportunities.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed py-12 text-sm text-muted-foreground">
        No opportunities found.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-muted-foreground">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Asset Manager</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Fit</th>
            <th className="px-4 py-3 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {opportunities.map((opp) => (
            <tr
              key={opp.id}
              className="cursor-pointer border-b transition-colors hover:bg-muted/50 last:border-b-0"
              onClick={() => navigate(`/home/deals/opportunities/${opp.id}`)}
            >
              <td className="px-4 py-3 font-medium">{opp.name}</td>
              <td className="px-4 py-3">{opp.investmentTypeName}</td>
              <td className="px-4 py-3">{opp.assetManagerName}</td>
              <td className="px-4 py-3">
                <PipelineStatusBadge status={opp.pipelineStatus} />
              </td>
              <td className="px-4 py-3">
                {opp.mandateFits.length > 0 ? (
                  <FitScoreBadge score={opp.mandateFits[0].fitScore} />
                ) : (
                  <span className="text-muted-foreground">&mdash;</span>
                )}
              </td>
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
