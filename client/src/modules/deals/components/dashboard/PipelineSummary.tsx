import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import type { PipelineStatusCount } from '../../types'

interface PipelineSummaryProps {
  pipelineCounts: PipelineStatusCount[]
  totalOpportunities: number
}

const STATUS_CONFIG: Record<string, { label: string; subtitle: string; accent: string }> = {
  new: { label: 'New', subtitle: 'new opportunities', accent: 'text-blue-600 dark:text-blue-400' },
  active: { label: 'Active', subtitle: 'in progress', accent: 'text-emerald-600 dark:text-emerald-400' },
  archived: { label: 'Archived', subtitle: 'archived', accent: 'text-slate-600 dark:text-slate-400' },
  ignored: { label: 'Ignored', subtitle: 'passed', accent: 'text-red-600 dark:text-red-400' },
}

export function PipelineSummary({ pipelineCounts, totalOpportunities }: PipelineSummaryProps) {
  const navigate = useNavigate()

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">
        {totalOpportunities} Total Opportunities
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {pipelineCounts.map((item) => {
          const config = STATUS_CONFIG[item.status]
          if (!config) return null

          return (
            <Card
              key={item.status}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => navigate('/home/deals/opportunities')}
            >
              <CardContent>
                <p className={`text-3xl font-bold ${config.accent}`}>{item.count}</p>
                <p className="text-sm text-muted-foreground mt-1">{config.label}</p>
                <p className="text-xs text-muted-foreground">{config.subtitle}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
