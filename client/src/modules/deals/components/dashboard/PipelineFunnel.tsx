import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { PipelineStatusCount } from '../../types'

interface PipelineFunnelProps {
  pipelineCounts: PipelineStatusCount[]
}

const STATUS_COLORS: Record<string, string> = {
  new: '#3b82f6',
  active: '#10b981',
  archived: '#94a3b8',
  ignored: '#ef4444',
}

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  active: 'Active',
  archived: 'Archived',
  ignored: 'Ignored',
}

export function PipelineFunnel({ pipelineCounts }: PipelineFunnelProps) {
  const data = pipelineCounts.map((item) => ({
    name: STATUS_LABELS[item.status] ?? item.status,
    count: item.count,
    status: item.status,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={80} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={28}>
                {data.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#6b7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
