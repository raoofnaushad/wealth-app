import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow, format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RunStatusBadge } from './RunStatusBadge'
import { ModuleBadge } from '@/components/shared/ModuleBadge'
import type { AgentRunResponse, WorkflowDefinition } from '@/api/types'

interface RunHistoryTableProps {
  runs: AgentRunResponse[]
  showWorkflow?: boolean
  agents?: WorkflowDefinition[]
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '-'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
}

export function RunHistoryTable({ runs, showWorkflow = false, agents }: RunHistoryTableProps) {
  const navigate = useNavigate()

  function getModule(workflow: string): string {
    return agents?.find(a => (a.workflow ?? a.name) === workflow)?.modules[0] ?? ''
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs">Run ID</TableHead>
          {showWorkflow && <TableHead className="text-xs">Workflow</TableHead>}
          {showWorkflow && <TableHead className="text-xs">Module</TableHead>}
          <TableHead className="text-xs">Status</TableHead>
          <TableHead className="text-xs">Started</TableHead>
          <TableHead className="text-xs">Duration</TableHead>
          <TableHead className="text-xs">Model</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <TableRow
            key={run.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => navigate(`/home/runs/${run.id}`)}
          >
            <TableCell className="font-mono text-xs">{run.id}</TableCell>
            {showWorkflow && (
              <TableCell className="text-xs">
                {run.workflow.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </TableCell>
            )}
            {showWorkflow && (
              <TableCell>
                {getModule(run.workflow) && <ModuleBadge moduleKey={getModule(run.workflow)} />}
              </TableCell>
            )}
            <TableCell>
              <RunStatusBadge status={run.status} />
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {run.created_at
                ? formatDistanceToNow(new Date(run.created_at), { addSuffix: true })
                : '-'}
              <br />
              <span className="text-[10px]">
                {run.created_at ? format(new Date(run.created_at), 'MMM d, HH:mm') : ''}
              </span>
            </TableCell>
            <TableCell className="text-xs">{formatDuration(run.duration_ms)}</TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {(run.llm_config as Record<string, string>)?.model || '-'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
