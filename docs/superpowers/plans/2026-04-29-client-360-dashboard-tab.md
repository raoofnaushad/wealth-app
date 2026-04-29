# Client 360 Dashboard Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Client 360" tab to the dashboard that triggers the `client_360` backend workflow on demand, shows live step progress while polling, and renders structured data cards from the real API response.

**Architecture:** A dedicated Zustand store (`useClient360Store`) manages the run lifecycle (idle → loading → complete/failed) and caches the result for the session. A new `client360-client.ts` handles trigger + 1-second polling against the real backend. Three new components under `components/insights/` render the three UI states (empty, loading, results), and `DashboardPage.tsx` gets a tab switcher wrapping the existing content in "Your Daily" and the new content in "Client 360".

**Tech Stack:** React 19, TypeScript 5.9, Zustand 5, Tailwind CSS 4.2, shadcn/ui, Lucide React, Vite (VITE_API_BASE_URL env var)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `client/src/api/types.ts` | Modify | Add `Client360Output` and related interfaces |
| `client/src/api/client360-client.ts` | Create | Trigger + poll functions for `client_360` workflow |
| `client/src/store/useClient360Store.ts` | Create | Zustand store — run state, output, steps, error |
| `client/src/components/insights/Client360Tab.tsx` | Create | Tab container — renders idle/loading/complete/failed states |
| `client/src/components/insights/Client360StepProgress.tsx` | Create | Live step list shown during loading |
| `client/src/components/insights/Client360Results.tsx` | Create | Data cards + collapsible run summary |
| `client/src/pages/DashboardPage.tsx` | Modify | Add tab switcher, render `<Client360Tab />` |

---

## Task 1: Add Client360 Types to `types.ts`

**Files:**
- Modify: `client/src/api/types.ts`

- [ ] **Step 1: Append the Client 360 type definitions**

Open `client/src/api/types.ts` and append the following at the end of the file (after the `LLMModel` interface):

```typescript
// ── Client 360 ────────────────────────────────────────────────────

export interface Client360AumEntry {
  assetClassAum: number
  assetClassName: string
  assetClassAumPercentage: number
}

export interface Client360Clients {
  aum: {
    clientsAum: number
    clientsAumGrowth: number
    clientsAumPreviousPeriod: number
  }
  count: {
    clients: number
    newClientsGrowth: number
  }
  partial: boolean
  aum_by_asset_class: Client360AumEntry[]
}

export interface Client360ProspectSegment {
  lowRange: number
  highRange?: number
  segmentName: string
  prospectsCount: number
}

export interface Client360Prospects {
  partial: boolean
  pipeline: {
    proposal: number
    agreement: number
    converted: number
    qualified: number
    inProgress: number
    preApproved: number
    newProspects: number
    engagementLetter: number
    estimatedWealthCurrent: number
    estimatedWealthPrevious: number
    prospectTimelineCurrent: number
    prospectTimelinePrevious: number
    potentialInvestableCapitalCurrent: number
    potentialInvestableCapitalPrevious: number
  }
  segments: Client360ProspectSegment[]
  count_metrics: {
    companyCount: number
    userTeamCount: number
    currentUserCount: number
  }
}

export interface Client360ErrorEnvelope {
  error: string
  message: string
}

export interface Client360Output {
  clients: Client360Clients | Client360ErrorEnvelope
  prospects: Client360Prospects | Client360ErrorEnvelope
  clients_warnings: Array<{ field: string; message: string }>
  prospects_warnings: Array<{ field: string; message: string }>
  run_summary: string
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run from `client/`:
```bash
pnpm exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/api/types.ts
git commit -m "feat(client360): add Client360Output types"
```

---

## Task 2: Create `client360-client.ts`

**Files:**
- Create: `client/src/api/client360-client.ts`

- [ ] **Step 1: Create the file**

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/api/client360-client.ts
git commit -m "feat(client360): add client360-client trigger+poll"
```

---

## Task 3: Create `useClient360Store`

**Files:**
- Create: `client/src/store/useClient360Store.ts`

- [ ] **Step 1: Create the store**

```typescript
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

      if (run.status === 'failed') {
        set({ status: 'failed', error: run.error ?? 'Run failed', steps: run.steps ?? [] })
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/store/useClient360Store.ts
git commit -m "feat(client360): add useClient360Store"
```

---

## Task 4: Create `Client360StepProgress.tsx`

**Files:**
- Create: `client/src/components/insights/Client360StepProgress.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { CheckCircle2, Loader2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RunStep } from '@/api/types'

const STEP_SEQUENCE = [
  'fetch_clients_dashboard',
  'fetch_prospects_dashboard',
  'generate_summary',
] as const

const STEP_LABELS: Record<string, string> = {
  fetch_clients_dashboard: 'Fetching client dashboard',
  fetch_prospects_dashboard: 'Fetching prospect pipeline',
  generate_summary: 'Generating summary',
}

interface Client360StepProgressProps {
  steps: RunStep[]
}

export function Client360StepProgress({ steps }: Client360StepProgressProps) {
  const completedNodes = new Set(
    steps.filter((s) => s.status === 'complete').map((s) => s.node)
  )
  const runningNode = steps.find((s) => s.status === 'running')?.node ?? null

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-8">
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">Running Client 360</p>
        <p className="text-xs text-muted-foreground mt-1">Fetching live data from Engage…</p>
      </div>
      <ol className="flex flex-col gap-3 w-full max-w-xs">
        {STEP_SEQUENCE.map((node) => {
          const isDone = completedNodes.has(node)
          const isRunning = runningNode === node
          const isPending = !isDone && !isRunning

          return (
            <li key={node} className="flex items-center gap-3">
              {isDone && (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              )}
              {isRunning && (
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin shrink-0" />
              )}
              {isPending && (
                <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              )}
              <span
                className={cn(
                  'text-sm',
                  isDone && 'text-foreground',
                  isRunning && 'text-foreground font-medium',
                  isPending && 'text-muted-foreground',
                )}
              >
                {STEP_LABELS[node] ?? node}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/insights/Client360StepProgress.tsx
git commit -m "feat(client360): add Client360StepProgress component"
```

---

## Task 5: Create `Client360Results.tsx`

**Files:**
- Create: `client/src/components/insights/Client360Results.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { useState } from 'react'
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Client360Output, Client360Clients, Client360Prospects, Client360ErrorEnvelope } from '@/api/types'

function isErrorEnvelope(v: unknown): v is Client360ErrorEnvelope {
  return typeof v === 'object' && v !== null && 'error' in v
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

function TrendBadge({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const positive = value >= 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full',
        positive
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      )}
    >
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? '+' : ''}{value.toFixed(1)}{suffix}
    </span>
  )
}

function WarningBanner({ warnings }: { warnings: Array<{ field: string; message: string }> }) {
  if (!warnings.length) return null
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-3 mb-4">
      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
      <div className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5">
        {warnings.map((w, i) => (
          <p key={i}><span className="font-medium">{w.field}:</span> {w.message}</p>
        ))}
      </div>
    </div>
  )
}

function ClientsSection({
  clients,
  warnings,
}: {
  clients: Client360Clients | Client360ErrorEnvelope
  warnings: Array<{ field: string; message: string }>
}) {
  if (isErrorEnvelope(clients)) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        <p className="font-medium">Client data unavailable</p>
        <p className="text-xs mt-1 opacity-80">{clients.message}</p>
      </div>
    )
  }

  const nonZeroAssetClasses = clients.aum_by_asset_class.filter(
    (e) => e.assetClassAumPercentage > 0,
  )

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Clients</h3>
      <WarningBanner warnings={warnings} />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Total Clients</p>
          <p className="text-2xl font-bold tabular-nums">{clients.count.clients}</p>
          <TrendBadge value={clients.count.newClientsGrowth} suffix="% new this month" />
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Total AUM</p>
          <p className="text-2xl font-bold tabular-nums">{formatCurrency(clients.aum.clientsAum)}</p>
          <TrendBadge value={clients.aum.clientsAumGrowth} suffix="% MoM" />
        </div>
      </div>

      {/* AUM by asset class */}
      {nonZeroAssetClasses.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-3">AUM by Asset Class</p>
          <div className="space-y-2">
            {nonZeroAssetClasses
              .sort((a, b) => b.assetClassAumPercentage - a.assetClassAumPercentage)
              .map((entry) => (
                <div key={entry.assetClassName}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="text-foreground">{entry.assetClassName}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatCurrency(entry.assetClassAum)} · {entry.assetClassAumPercentage}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${entry.assetClassAumPercentage}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

const PIPELINE_STAGES: Array<{ key: keyof Client360Prospects['pipeline']; label: string }> = [
  { key: 'newProspects', label: 'New' },
  { key: 'inProgress', label: 'In Progress' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'agreement', label: 'Agreement' },
  { key: 'engagementLetter', label: 'Eng. Letter' },
  { key: 'converted', label: 'Converted' },
]

function ProspectsSection({
  prospects,
  warnings,
}: {
  prospects: Client360Prospects | Client360ErrorEnvelope
  warnings: Array<{ field: string; message: string }>
}) {
  if (isErrorEnvelope(prospects)) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        <p className="font-medium">Prospect data unavailable</p>
        <p className="text-xs mt-1 opacity-80">{prospects.message}</p>
      </div>
    )
  }

  const nonZeroSegments = prospects.segments.filter((s) => s.prospectsCount > 0)

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Prospects</h3>
      <WarningBanner warnings={warnings} />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Total Prospects</p>
          <p className="text-2xl font-bold tabular-nums">{prospects.pipeline.prospectTimelineCurrent}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Potential Capital</p>
          <p className="text-2xl font-bold tabular-nums">
            {formatCurrency(prospects.pipeline.potentialInvestableCapitalCurrent)}
          </p>
        </div>
      </div>

      {/* Pipeline stage breakdown */}
      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs text-muted-foreground mb-3">Pipeline Stages</p>
        <div className="grid grid-cols-4 gap-2">
          {PIPELINE_STAGES.map(({ key, label }) => {
            const value = prospects.pipeline[key] as number
            return (
              <div key={key} className="text-center">
                <p className="text-lg font-bold tabular-nums">{value}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Segments — only if any have counts */}
      {nonZeroSegments.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-3">Wealth Segments</p>
          <div className="space-y-2">
            {nonZeroSegments.map((seg) => (
              <div key={seg.segmentName} className="flex items-center justify-between text-xs">
                <span className="text-foreground">{seg.segmentName}</span>
                <span className="tabular-nums font-medium">{seg.prospectsCount}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface Client360ResultsProps {
  output: Client360Output
}

export function Client360Results({ output }: Client360ResultsProps) {
  const [summaryOpen, setSummaryOpen] = useState(false)

  return (
    <div className="space-y-8">
      <ClientsSection clients={output.clients} warnings={output.clients_warnings} />
      <ProspectsSection prospects={output.prospects} warnings={output.prospects_warnings} />

      {/* Collapsible run summary */}
      <div className="rounded-xl border bg-card">
        <button
          type="button"
          onClick={() => setSummaryOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          View run summary
          {summaryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {summaryOpen && (
          <div className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed border-t pt-3">
            {output.run_summary}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/insights/Client360Results.tsx
git commit -m "feat(client360): add Client360Results component"
```

---

## Task 6: Create `Client360Tab.tsx`

**Files:**
- Create: `client/src/components/insights/Client360Tab.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { RefreshCw, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useClient360Store } from '@/store/useClient360Store'
import { Client360StepProgress } from './Client360StepProgress'
import { Client360Results } from './Client360Results'

export function Client360Tab() {
  const { status, steps, output, error, trigger, reset } = useClient360Store()

  if (status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="rounded-full bg-muted p-4">
          <BarChart3 className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Client 360 Overview</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Fetch live client and prospect KPIs from Engage, with an AI-generated summary.
          </p>
        </div>
        <Button onClick={trigger} size="sm">
          Generate Client 360
        </Button>
      </div>
    )
  }

  if (status === 'loading') {
    return <Client360StepProgress steps={steps} />
  }

  if (status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Something went wrong</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">{error}</p>
        </div>
        <Button onClick={() => { reset(); trigger() }} size="sm" variant="secondary">
          Try again
        </Button>
      </div>
    )
  }

  // status === 'complete'
  if (!output) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button
          onClick={() => { reset(); trigger() }}
          size="sm"
          variant="secondary"
          className="gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>
      <Client360Results output={output} />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/insights/Client360Tab.tsx
git commit -m "feat(client360): add Client360Tab component"
```

---

## Task 7: Add Tab Switcher to `DashboardPage.tsx`

**Files:**
- Modify: `client/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Add the import and tab state**

At the top of `DashboardPage.tsx`, add the `Client360Tab` import alongside the existing insights imports:

```typescript
import { Client360Tab } from '@/components/insights/Client360Tab'
```

Inside the `DashboardPage` function, add a tab state after the existing `useState` calls:

```typescript
const [activeTab, setActiveTab] = useState<'daily' | 'client360'>('daily')
```

- [ ] **Step 2: Wrap the header and content in a tab switcher**

The current `return (` renders a `<div className="p-6 lg:p-8 space-y-8">`. Modify it so the outer div keeps its padding but contains a tab switcher at the top, followed by conditionally rendered content.

Replace the opening of the return JSX — the `<div className="p-6 lg:p-8 space-y-8">` and the `{/* Header */}` block — with:

```tsx
return (
  <div className="p-6 lg:p-8 space-y-6">
    {/* Tab switcher */}
    <div className="flex items-center gap-1 border-b pb-2">
      <button
        type="button"
        onClick={() => setActiveTab('daily')}
        className={cn(
          'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
          activeTab === 'daily'
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
        )}
      >
        Your Daily
      </button>
      <button
        type="button"
        onClick={() => setActiveTab('client360')}
        className={cn(
          'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
          activeTab === 'client360'
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
        )}
      >
        Client 360
      </button>
    </div>

    {activeTab === 'client360' ? (
      <Client360Tab />
    ) : (
      <div className="space-y-8">
        {/* Header */}
```

Then close the `activeTab === 'daily'` block at the very end of the JSX — just before the final closing `</div>` of the outer div — by adding:

```tsx
      </div>
    )}
  </div>
)
```

The `cn` import is already available in `DashboardPage.tsx` — if not, add:
```typescript
import { cn } from '@/lib/utils'
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Start the dev server and verify manually**

```bash
pnpm dev
```

Open `http://localhost:5173`. Check:
1. Tab switcher shows "Your Daily" and "Client 360"
2. "Your Daily" tab renders exactly as before — no regressions
3. "Client 360" tab shows the idle empty state with "Generate Client 360" button
4. Clicking "Generate Client 360" triggers the API, shows the step progress list updating live
5. On completion, results render: Total Clients, Total AUM, AUM by asset class bars, Prospect KPIs, pipeline stage grid
6. "View run summary" collapses/expands correctly
7. "Refresh" button re-triggers the run
8. Switching back to "Your Daily" and then to "Client 360" shows cached results (no re-trigger)

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/DashboardPage.tsx
git commit -m "feat(client360): add Client 360 tab to dashboard"
```

---

## Self-Review Notes

- All type names used in components (`Client360Output`, `Client360Clients`, `Client360Prospects`, `Client360ErrorEnvelope`, `Client360AumEntry`, `Client360ProspectSegment`) are defined in Task 1 and consistently referenced in Tasks 5 and 6.
- `parseClient360Output` is defined in Task 2 and used in Task 3's store.
- `isErrorEnvelope` type guard correctly narrows `Client360Clients | Client360ErrorEnvelope` in `Client360Results`.
- The `PIPELINE_STAGES` array references `keyof Client360Prospects['pipeline']` — all keys (`newProspects`, `inProgress`, `qualified`, `proposal`, `agreement`, `engagementLetter`, `converted`) exist on the interface defined in Task 1.
- Partial/error state handling is covered for both clients and prospects sections (spec requirement).
- The collapsible run summary is always rendered (spec requires it always present on complete runs).
- Session cache is automatic via Zustand store — no cleanup on tab switch (spec requirement).
