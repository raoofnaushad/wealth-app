import { useEffect, useState } from 'react'
import { Bot } from 'lucide-react'
import { useAgentStore } from '@/store/useAgentStore'
import { useRunStore } from '@/store/useRunStore'
import { AgentGrid } from '@/components/agents/AgentGrid'
import { EmptyState } from '@/components/shared/EmptyState'
import { ModuleFilter } from '@/components/shared/ModuleFilter'

export function AgentsPage() {
  const { agents, fetchAgents, loading } = useAgentStore()
  const { allRuns, fetchRuns } = useRunStore()
  const [selectedModule, setSelectedModule] = useState('all')

  useEffect(() => {
    fetchAgents()
    fetchRuns()
  }, [fetchAgents, fetchRuns])

  const filteredAgents = selectedModule === 'all'
    ? agents
    : agents.filter(a => a.modules.includes(selectedModule))

  const filteredWorkflows = new Set(filteredAgents.map(a => a.workflow ?? a.name))
  const filteredRuns = selectedModule === 'all'
    ? allRuns
    : allRuns.filter(r => filteredWorkflows.has(r.workflow))

  const moduleCounts: Record<string, number> = { all: agents.length }
  agents.forEach(a => {
    for (const mod of a.modules) {
      moduleCounts[mod] = (moduleCounts[mod] || 0) + 1
    }
  })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Agents</h1>
        <p className="text-sm text-muted-foreground">Browse and run all available AI workflows</p>
      </div>

      {/* Module Filter */}
      <ModuleFilter selected={selectedModule} onChange={setSelectedModule} counts={moduleCounts} />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredAgents.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No agents in this module"
          description={selectedModule === 'all' ? "Agent workflows haven't been configured yet." : 'No agents have been assigned to this module yet.'}
        />
      ) : (
        <AgentGrid agents={filteredAgents} runs={filteredRuns} />
      )}
    </div>
  )
}
