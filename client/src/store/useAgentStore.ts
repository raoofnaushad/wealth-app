import { create } from 'zustand'
import type { WorkflowDefinition } from '@/api/types'
import { agentsApi } from '@/api/endpoints'

interface AgentState {
  agents: WorkflowDefinition[]
  loading: boolean
  fetchAgents: () => Promise<void>
  getAgent: (workflow: string) => WorkflowDefinition | undefined
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  loading: false,

  fetchAgents: async () => {
    if (get().agents.length > 0) return
    set({ loading: true })
    try {
      const agents = await agentsApi.list()
      set({ agents, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  getAgent: (workflow: string) => get().agents.find((a) => (a.workflow ?? a.name) === workflow),
}))
