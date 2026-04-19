import { useNavigate } from 'react-router-dom'
import {
  FileText, User, Shield, ListChecks, Database,
  AlertTriangle, PieChart, MessageSquare, Play,
  Newspaper, FileBarChart, UserPlus, FileSpreadsheet,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { WorkflowDefinition } from '@/api/types'
import type { AgentRunResponse } from '@/api/types'
import { STATUS_CONFIG } from '@/lib/constants'
import { StatusDot } from '@/components/shared/StatusDot'
import { ModuleBadge } from '@/components/shared/ModuleBadge'
import { formatDistanceToNow } from 'date-fns'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText, User, Shield, ListChecks, Database,
  AlertTriangle, PieChart, MessageSquare, Newspaper,
  FileBarChart, UserPlus, FileSpreadsheet,
}

interface AgentCardProps {
  agent: WorkflowDefinition
  lastRun?: AgentRunResponse
}

export function AgentCard({ agent, lastRun }: AgentCardProps) {
  const navigate = useNavigate()
  const Icon = ICON_MAP[agent.icon ?? ''] || FileText
  const statusConf = lastRun ? STATUS_CONFIG[lastRun.status] : null

  return (
    <Card
      className="group cursor-pointer hover:shadow-md transition-all hover:border-primary/30"
      onClick={() => navigate(`/home/agents/${agent.workflow ?? agent.name}`)}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <ModuleBadge moduleKey={agent.modules[0] ?? ''} />
        </div>

        <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
          {agent.name}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
          {agent.description}
        </p>

        <div className="flex items-center justify-between">
          {lastRun && statusConf ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <StatusDot status={lastRun.status === 'awaiting_review' ? 'awaiting_review' : lastRun.status === 'complete' ? 'complete' : lastRun.status === 'failed' ? 'failed' : lastRun.status === 'running' || lastRun.status === 'resuming' ? 'running' : 'pending'} />
              <span className={statusConf.color}>{statusConf.label}</span>
              {lastRun.created_at && (
                <span className="text-muted-foreground">
                  {formatDistanceToNow(new Date(lastRun.created_at), { addSuffix: true })}
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">No runs yet</span>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/home/agents/${agent.workflow ?? agent.name}/trigger`)
            }}
          >
            <Play className="h-3 w-3" /> Run
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
