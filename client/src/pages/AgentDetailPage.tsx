import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  FileText, User, Shield, ListChecks, Database,
  AlertTriangle, PieChart, MessageSquare, Play, ArrowLeft,
  Newspaper, FileBarChart, UserPlus, FileSpreadsheet,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAgentStore } from '@/store/useAgentStore'
import { useRunStore } from '@/store/useRunStore'
import { RunTimeline } from '@/components/runs/RunTimeline'
import { RunStatusBadge } from '@/components/runs/RunStatusBadge'
import { RunHistoryTable } from '@/components/runs/RunHistoryTable'
import { RunOutputViewer } from '@/components/runs/RunOutputViewer'
import { EmptyState } from '@/components/shared/EmptyState'
import { ModuleBadge } from '@/components/shared/ModuleBadge'
import { LoadingScreen } from '@/components/shared/LoadingScreen'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText, User, Shield, ListChecks, Database,
  AlertTriangle, PieChart, MessageSquare, Newspaper,
  FileBarChart, UserPlus, FileSpreadsheet,
}

export function AgentDetailPage() {
  const { workflow } = useParams<{ workflow: string }>()
  const navigate = useNavigate()
  const { agents, fetchAgents, getAgent } = useAgentStore()
  const { allRuns, fetchRuns } = useRunStore()

  useEffect(() => {
    fetchAgents()
    fetchRuns(workflow)
  }, [fetchAgents, fetchRuns, workflow])

  const agent = getAgent(workflow!)
  const workflowRuns = allRuns
    .filter((r) => r.workflow === workflow)
    .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
  const latestRun = workflowRuns[0]

  if (agents.length > 0 && !agent) {
    return (
      <div className="p-6">
        <EmptyState
          icon={AlertTriangle}
          title="Agent not found"
          description={`No agent found with workflow "${workflow}"`}
          action={<Button variant="outline" size="sm" onClick={() => navigate('/home/agents')}>Back to Agents</Button>}
        />
      </div>
    )
  }

  if (!agent) {
    return <LoadingScreen message="Loading agent..." fullScreen={false} />
  }

  const Icon = ICON_MAP[agent.icon ?? ''] || FileText

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/home/agents')} className="mb-3 -ml-2 gap-1 text-xs">
          <ArrowLeft className="h-3 w-3" /> Back to Agents
        </Button>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{agent.name}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{agent.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <ModuleBadge moduleKey={agent.modules[0] ?? ''} />
                {agent.supportsHitl && (
                  <Badge variant="outline" className="text-[10px]">Human-in-the-Loop</Badge>
                )}
                {agent.steps && <Badge variant="outline" className="text-[10px]">{agent.steps.length} steps</Badge>}
              </div>
            </div>
          </div>
          <Button size="sm" onClick={() => navigate(`/home/agents/${workflow}/trigger`)} className="gap-1.5">
            <Play className="h-3.5 w-3.5" /> Trigger Run
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="latest">
        <TabsList className="h-9">
          <TabsTrigger value="latest" className="text-xs">Latest Run</TabsTrigger>
          <TabsTrigger value="history" className="text-xs">
            Run History {workflowRuns.length > 0 && `(${workflowRuns.length})`}
          </TabsTrigger>
          <TabsTrigger value="config" className="text-xs">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="latest" className="mt-4 space-y-4">
          {latestRun ? (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      Run <span className="font-mono text-muted-foreground">{latestRun.id}</span>
                    </CardTitle>
                    <RunStatusBadge status={latestRun.status} />
                  </div>
                </CardHeader>
                <CardContent>
                  <RunTimeline steps={latestRun.steps} />
                </CardContent>
              </Card>

              {latestRun.output && latestRun.status === 'complete' && (
                <RunOutputViewer output={latestRun.output} workflow={latestRun.workflow} />
              )}

              {latestRun.error && (
                <Card className="border-destructive/50">
                  <CardContent className="p-4">
                    <p className="text-sm text-destructive font-mono">{latestRun.error}</p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <EmptyState
              icon={Play}
              title="No runs yet"
              description="Trigger your first run to see results here."
              action={
                <Button size="sm" onClick={() => navigate(`/home/agents/${workflow}/trigger`)} className="gap-1">
                  <Play className="h-3 w-3" /> Trigger Run
                </Button>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {workflowRuns.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <RunHistoryTable runs={workflowRuns} />
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={Play}
              title="No run history"
              description="Trigger a run to start building history."
            />
          )}
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Workflow Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Steps</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(agent.steps ?? []).map((step, i) => (
                    <Badge key={step} variant="secondary" className="text-[10px] font-mono">
                      {i + 1}. {step.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Input Fields</h4>
                <div className="space-y-1">
                  {(agent.inputFields ?? []).map((field) => (
                    <div key={field.key} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-muted-foreground">{field.key}</span>
                      <span className="text-muted-foreground">({field.type})</span>
                      {field.required && <Badge variant="destructive" className="text-[8px] h-4">required</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  )
}
