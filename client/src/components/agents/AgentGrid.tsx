import type { WorkflowDefinition, AgentRunResponse } from '@/api/types'
import { AgentCard } from './AgentCard'

interface AgentGridProps {
  agents: WorkflowDefinition[]
  runs: AgentRunResponse[]
}

export function AgentGrid({ agents, runs }: AgentGridProps) {
  function getLastRun(workflow: string): AgentRunResponse | undefined {
    return runs
      .filter((r) => r.workflow === workflow)
      .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())[0]
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
      {agents.map((agent) => (
        <AgentCard key={agent.workflow ?? agent.name} agent={agent} lastRun={getLastRun(agent.workflow ?? agent.name)} />
      ))}
    </div>
  )
}
