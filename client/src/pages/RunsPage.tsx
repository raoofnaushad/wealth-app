import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useRunStore } from '@/store/useRunStore'
import { useAgentStore } from '@/store/useAgentStore'
import { RunHistoryTable } from '@/components/runs/RunHistoryTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { ModuleFilter } from '@/components/shared/ModuleFilter'

export function RunsPage() {
  const { allRuns, fetchRuns, loading } = useRunStore()
  const { agents, fetchAgents } = useAgentStore()
  const [selectedModule, setSelectedModule] = useState('all')

  useEffect(() => {
    fetchRuns()
    fetchAgents()
  }, [fetchRuns, fetchAgents])

  const filteredWorkflows = selectedModule === 'all'
    ? null
    : new Set(agents.filter(a => a.modules.includes(selectedModule)).map(a => a.workflow ?? a.name))

  const filteredRuns = filteredWorkflows === null
    ? allRuns
    : allRuns.filter(r => filteredWorkflows.has(r.workflow))

  // Count runs by module
  const moduleCounts: Record<string, number> = { all: allRuns.length }
  allRuns.forEach(r => {
    const agent = agents.find(a => (a.workflow ?? a.name) === r.workflow)
    if (agent) {
      for (const mod of agent.modules) {
        moduleCounts[mod] = (moduleCounts[mod] || 0) + 1
      }
    }
  })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Run History</h1>
        <p className="text-sm text-muted-foreground">View all agent runs across workflows</p>
      </div>

      {/* Module Filter */}
      <ModuleFilter selected={selectedModule} onChange={setSelectedModule} counts={moduleCounts} />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredRuns.length === 0 ? (
        <EmptyState
          icon={History}
          title="No runs yet"
          description={selectedModule === 'all' ? 'Trigger an agent to see run history here.' : 'No runs found for this module.'}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <RunHistoryTable runs={filteredRuns} showWorkflow agents={agents} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
