import type {
  CopilotRequest,
  CopilotTriggerResponse,
  CopilotRunResponse,
  RunStatus,
  LLMProvider,
} from './types'
import { getAccessToken, refreshTokens, clearTokens } from './platform-api'

const TERMINAL_STATUSES: RunStatus[] = ['complete', 'failed', 'cancelled']
const COPILOT_URL = import.meta.env.VITE_COPILOT_API_URL || '/api'

class CopilotError extends Error {
  status: number
  constructor(
    status: number,
    message: string,
  ) {
    super(message)
    this.name = 'CopilotError'
    this.status = status
  }
}

async function copilotFetch<T>(path: string, options?: RequestInit): Promise<T> {
  let token = getAccessToken()

  const doFetch = async (authToken: string | null) => {
    const res = await fetch(`${COPILOT_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...options?.headers,
      },
    })
    return res
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
      throw new CopilotError(401, 'Session expired')
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const detail = (body as { detail?: string }).detail
    throw new CopilotError(res.status, detail || `Request failed: ${res.status}`)
  }

  return res.json() as Promise<T>
}

/** Trigger a copilot run — returns run_id immediately */
export function sendCopilotMessage(
  request: CopilotRequest,
): Promise<CopilotTriggerResponse> {
  return copilotFetch<CopilotTriggerResponse>('/agents/run', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

/** Poll a run until it reaches a terminal status */
export async function pollCopilotRun(
  runId: string,
  onProgress?: (run: CopilotRunResponse) => void,
): Promise<CopilotRunResponse> {
  const MAX_ATTEMPTS = 20
  let delay = 1500

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, delay))

    const run = await copilotFetch<CopilotRunResponse>(`/runs/${runId}`)
    onProgress?.(run)

    if (TERMINAL_STATUSES.includes(run.status)) {
      return run
    }

    delay = Math.min(Math.round(delay * 1.3), 5000)
  }

  throw new CopilotError(408, 'Copilot request timed out')
}

/** Send a message and wait for the complete result */
export async function askCopilot(
  request: CopilotRequest,
  onProgress?: (run: CopilotRunResponse) => void,
): Promise<CopilotRunResponse> {
  const { run_id } = await sendCopilotMessage(request)
  return pollCopilotRun(run_id, onProgress)
}

/** Fetch available LLM providers and models */
export function getCopilotProviders(): Promise<LLMProvider[]> {
  return copilotFetch<LLMProvider[]>('/agents/llm-providers')
}

export { CopilotError }
