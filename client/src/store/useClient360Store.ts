import { create } from 'zustand'
import type { AgentRunResponse, Client360Output, RunStep } from '@/api/types'
import { triggerClient360, pollClient360Run, parseClient360Output, Client360Error } from '@/api/client360-client'

type Client360Status = 'idle' | 'loading' | 'complete' | 'failed'

interface Client360State {
  status: Client360Status
  runId: string | null
  steps: RunStep[]
  output: Client360Output | null
  error: string | null
  trigger: () => Promise<void>
  reset: () => void
}

export const useClient360Store = create<Client360State>((set) => ({
  status: 'idle',
  runId: null,
  steps: [],
  output: null,
  error: null,

  trigger: async () => {
    set({ status: 'loading', steps: [], output: null, error: null, runId: null })

    try {
      const { run_id } = await triggerClient360()
      set({ runId: run_id })

      const run = await pollClient360Run(run_id, (partial: AgentRunResponse) => {
        set({ steps: partial.steps ?? [] })
      })

      if (run.status === 'failed' || run.status === 'cancelled') {
        set({ status: 'failed', error: run.error ?? (run.status === 'cancelled' ? 'Run was cancelled' : 'Run failed'), steps: run.steps ?? [] })
        return
      }

      const output = parseClient360Output(run)
      set({ status: 'complete', output, steps: run.steps ?? [] })
    } catch (err) {
      const message = err instanceof Client360Error ? err.message : 'An unexpected error occurred'
      set({ status: 'failed', error: message })
    }
  },

  reset: () => set({ status: 'idle', runId: null, steps: [], output: null, error: null }),
}))
