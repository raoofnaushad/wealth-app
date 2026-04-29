import type { AgentRunResponse, Client360Output, RunStatus } from './types'
import { getAccessToken, refreshTokens, clearTokens } from './platform-api'

const TERMINAL_STATUSES: RunStatus[] = ['complete', 'failed', 'cancelled']
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

class Client360Error extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'Client360Error'
    this.status = status
  }
}

async function c360Fetch<T>(path: string, options?: RequestInit): Promise<T> {
  let token = getAccessToken()

  const doFetch = async (authToken: string | null) => {
    return fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...options?.headers,
      },
    })
  }

  let res = await doFetch(token)

  if (res.status === 401) {
    try {
      await refreshTokens()
      token = getAccessToken()
      res = await doFetch(token)
    } catch {
      clearTokens()
      window.location.href = '/login'
      throw new Client360Error(401, 'Session expired')
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const detail = (body as { detail?: string }).detail
    throw new Client360Error(res.status, detail || `Request failed: ${res.status}`)
  }

  return res.json() as Promise<T>
}

/** Trigger the client_360 workflow — returns run_id immediately */
export function triggerClient360(): Promise<{ run_id: string; status: string }> {
  return c360Fetch('/agents/client_360/run', { method: 'POST' })
}

/** Poll a client_360 run until terminal status.
 *  Calls onStep on every poll so the caller can update live step progress. */
export async function pollClient360Run(
  runId: string,
  onStep?: (run: AgentRunResponse) => void,
): Promise<AgentRunResponse> {
  const INTERVAL_MS = 1000
  const TIMEOUT_MS = 30_000
  const deadline = Date.now() + TIMEOUT_MS

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, INTERVAL_MS))
    const run = await c360Fetch<AgentRunResponse>(`/runs/${runId}`)
    onStep?.(run)
    if (TERMINAL_STATUSES.includes(run.status)) return run
  }

  throw new Client360Error(408, 'Client 360 request timed out after 30 seconds')
}

/** Extract and cast the output to Client360Output.
 *  Returns null if output is missing. */
export function parseClient360Output(run: AgentRunResponse): Client360Output | null {
  if (!run.output) return null
  return run.output as unknown as Client360Output
}

export { Client360Error }
