# Client 360 Dashboard Tab — Design Spec

**Date:** 2026-04-29
**Status:** Approved

---

## Overview

Add a "Client 360" tab to the dashboard alongside the existing "Your Daily" tab. The tab triggers the `client_360` backend workflow on demand, polls for live step progress, and renders the results as structured data cards. Data is cached in memory for the session so switching tabs never loses the result. A "Refresh" button lets the user re-trigger at any time.

---

## Architecture

### State — `useClient360Store`

A new dedicated Zustand store at `client/src/store/useClient360Store.ts`.

**State shape:**
```typescript
{
  status: 'idle' | 'loading' | 'complete' | 'failed'
  runId: string | null
  steps: RunStep[]           // updated on every poll during loading
  output: Client360Output | null
  error: string | null
}
```

**Actions:**
- `trigger()` — POST `/agents/client_360/run`, set status to `loading`, begin polling
- `reset()` — clear output and set status back to `idle` (used by Refresh)

The store persists for the lifetime of the browser session. Switching between "Your Daily" and "Client 360" tabs does not unmount or reset it.

### API Client — `client360-client.ts`

New file at `client/src/api/client360-client.ts`, parallel to `copilot-client.ts`.

- `triggerClient360(): Promise<{ run_id: string }>` — POST `/agents/client_360/run` with no body; auth injected by `api` client
- `pollClient360Run(runId: string, onStep?: (steps: RunStep[]) => void): Promise<AgentRunResponse>` — polls `GET /runs/{run_id}` every 1 second, max 30 seconds; calls `onStep` on each poll to stream step updates; resolves on `complete`, rejects on `failed` or timeout

Reuses the existing `api` client from `client.ts` — no new auth logic needed.

---

## Components

All new components live under `client/src/components/insights/`.

### `Client360Tab.tsx`

Top-level tab container. Reads from `useClient360Store`. Conditionally renders:

| Store status | Rendered content |
|---|---|
| `idle` | Empty state — icon, description, "Generate Client 360" button |
| `loading` | `<Client360StepProgress steps={steps} />` |
| `complete` | `<Client360Results output={output} />` + "Refresh" button in top-right |
| `failed` | Error message with "Try again" button |

### `Client360StepProgress.tsx`

Shown during the `loading` state. Renders a vertical step list. Each row shows:
- Step label (human-readable, mapped from node key — see mapping below)
- Status indicator: pending (muted dot), running (animated spinner), complete (green checkmark)

**Node key → label mapping:**
```
fetch_clients_dashboard   → "Fetching client dashboard"
fetch_prospects_dashboard → "Fetching prospect pipeline"
generate_summary          → "Generating summary"
```

Steps not yet started are shown as pending (derived by comparing `steps` array length to the known 3-step sequence).

### `Client360Results.tsx`

Shown when `status === 'complete'`. Two sections — Clients and Prospects — followed by a collapsible run summary.

---

## Data Cards

### Clients Section

Sourced from `output.clients`. If `'error' in output.clients`, render an error card instead.

| Card | Field mapping |
|---|---|
| Total Clients | `clients.count.clients` with `clients.count.newClientsGrowth` as a trend badge ("+{n}% new this month") |
| Total AUM | `clients.aum.clientsAum` formatted as currency; `clients.aum.clientsAumGrowth` as MoM trend badge |
| AUM by Asset Class | Horizontal bar list from `clients.aum_by_asset_class`; filter out entries where `assetClassAumPercentage === 0`; show asset class name, formatted value, and percentage |

If `clients.partial === true`, show a warning banner above the section listing `clients_warnings`.

### Prospects Section

Sourced from `output.prospects`. If `'error' in output.prospects`, render an error card instead.

| Card | Field mapping |
|---|---|
| Pipeline Overview | Total from `prospects.pipeline.prospectTimelineCurrent`; stage breakdown: `newProspects`, `inProgress`, `qualified`, `proposal`, `agreement`, `engagementLetter`, `converted` |
| Potential Capital | `prospects.pipeline.potentialInvestableCapitalCurrent` formatted as currency |
| Wealth Segments | `prospects.segments` array — each row shows `segmentName`, range (`lowRange`–`highRange`), and `prospectsCount` |

If `prospects.partial === true`, show a warning banner using `prospects_warnings`.

### Run Summary

Collapsible section at the very bottom of `Client360Results`, closed by default. Label: "View run summary". Expands to show `output.run_summary` as plain text.

---

## Types

Add to `client/src/api/types.ts`:

```typescript
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

---

## Dashboard Tab Switcher

`DashboardPage.tsx` gains a tab switcher at the top (using shadcn `Tabs` or a simple controlled state with styled buttons — match the existing nav style). The existing page content renders inside the "Your Daily" tab. `<Client360Tab />` renders inside the "Client 360" tab.

Tab state is local to `DashboardPage` (`useState<'daily' | 'client360'>`). It does not need to be in a store.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| HTTP error on trigger | Set `status: 'failed'`, show error message |
| Poll timeout (30s) | Set `status: 'failed'`, message: "Request timed out" |
| Run status `failed` | Set `status: 'failed'`, show `run.error` |
| `clients` has error envelope | Show error card in clients section only; prospects section still renders |
| `prospects` has error envelope | Show error card in prospects section only; clients section still renders |
| `partial: true` | Show warning banner with `*_warnings` above the affected section |

---

## Files Changed / Created

| File | Change |
|---|---|
| `client/src/api/types.ts` | Add `Client360Output` and related interfaces |
| `client/src/api/client360-client.ts` | New — trigger + poll functions |
| `client/src/store/useClient360Store.ts` | New — Zustand store |
| `client/src/components/insights/Client360Tab.tsx` | New — tab container |
| `client/src/components/insights/Client360StepProgress.tsx` | New — step progress list |
| `client/src/components/insights/Client360Results.tsx` | New — results cards + run summary |
| `client/src/pages/DashboardPage.tsx` | Add tab switcher, render Client360Tab |

---

## Out of Scope

- Persisting Client 360 results across page reloads (session-only cache is sufficient for now)
- Historical Client 360 runs or run history UI
- Scheduled / auto-triggered runs
- Per-client 360 view (this is the advisor-level aggregate dashboard, not a per-client profile)
