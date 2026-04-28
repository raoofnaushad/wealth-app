# Daily Brief — Backend Integration Spec

**Audience:** Backend team building the Daily Brief endpoints.
**Frontend surface:** [`client/src/pages/DashboardPage.tsx`](../../client/src/pages/DashboardPage.tsx) (rendered at `/home/dashboard`).
**Status:** Frontend is complete and currently backed by MSW mocks. Auth + Copilot already hit the real backend. This doc defines the contract for **four endpoints** the backend team needs to implement:

1. `GET /daily-summaries` — list briefs (today + history)
2. `POST /daily-summaries/generate` — async-generate today's brief
3. `GET /meeting-briefs/:meetingId` — fetch a specific meeting brief
4. `POST /meeting-briefs/generate` — async-generate an ad-hoc meeting brief for a meeting not in today's summary

---

## 1. Auth Contract

All Daily Brief and Meeting Brief endpoints must accept the **same JWT scheme already used by the Copilot API**.

- **Header:** `Authorization: Bearer <access_token>`
- **Token source:** Frontend obtains JWT via `POST /platform-api/auth/login` (already integrated). Tokens are stored in `localStorage` (`access_token`, `refresh_token`) and injected by the API client.
- **401 handling:** Frontend will attempt one refresh against `POST /platform-api/auth/refresh` and retry. On second 401, the user is redirected to `/login`. Backend should return `401 Unauthorized` for missing/expired tokens.
- **Tenant scoping:** The JWT payload contains `id` (user ID) and `companyId`. Daily brief data must be scoped to the authenticated user's `id` (each advisor sees their own brief), within their `companyId` tenant.

### JWT payload shape (reference)

Source: [`client/src/api/types.ts:410-424`](../../client/src/api/types.ts)

```ts
interface JwtPayload {
  sub: string                   // username
  id: number                    // user ID — use this to scope brief data
  companyId: number             // tenant ID
  role: number
  capabilities: string[]
  exp: number                   // expiry (seconds since epoch)
  iat: number
  companyLanguage: string
  userLanguage: string
  userLanguageTag: string
  userTimezone: string          // e.g. "Asia/Dubai" — relevant for brief date interpretation
  impersonated: boolean
  isCompanyUsingOneLanguage: boolean
}
```

### API base URL

The frontend reads `VITE_API_BASE_URL` (default `/api`). In development the Vite dev server proxies `/api` → `http://localhost:8000`. The backend should expose Daily Brief endpoints at the **same origin/prefix** as the existing Copilot endpoints (`/agents/run`, `/runs/:runId`).

---

## 2. Endpoints to Implement

### 2.1 `GET /api/daily-summaries`

Returns the authenticated advisor's full Daily Brief history (today + past summaries).

| Field | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/daily-summaries` |
| **Auth** | Required |
| **Query params** | None today. (Future: `from`/`to` ISO date filtering for pagination — out of scope for v1.) |
| **Request body** | — |
| **Success response** | `200 OK`, `application/json`, body = `DailySummary[]` |
| **Empty response** | Return `[]` (frontend renders empty state gracefully). |
| **Sort order** | Any. Frontend sorts by `date` descending client-side (`b.date.localeCompare(a.date)`). |
| **Scope** | Results scoped to the authenticated user's `id` within their `companyId`. |
| **Error responses** | `401` (unauthenticated), `500` (server error) |

**Behavior notes:**
- Today's brief is the entry whose `date` matches today in the user's timezone (`userTimezone` from JWT).
- Mock currently returns 10 days of history (10 business days). Real backend should return whatever history exists; frontend bounds prev/next navigation to the array length.

---

### 2.2 `POST /api/daily-summaries/generate`

Triggers async generation (or regeneration) of **today's** Daily Brief. Returns immediately with a run ID; the frontend then re-fetches `GET /daily-summaries` to pick up fresh content.

| Field | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/daily-summaries/generate` |
| **Auth** | Required |
| **Request body** | `{}` (frontend sends empty JSON object) |
| **Success response** | `202 Accepted`, body = `{ "runId": "<string>" }` |
| **Error responses** | `401`, `429` (rate-limited; frontend will surface "Couldn't start generation. Try again."), `500` |

**Behavior notes:**

- **Async by contract.** The 202 is returned immediately; generation continues server-side.
- **Frontend polling behavior today:** The current frontend does **not** poll `/runs/:runId` for the generate flow — it simply re-fetches `/daily-summaries` after the POST resolves. The `runId` is captured but not used. If generation routinely takes longer than ~5s, the frontend can adopt the same polling pattern Copilot uses (`pollCopilotRun` in [`copilot-client.ts:77-98`](../../client/src/api/copilot-client.ts)) — please return a `runId` shape compatible with `GET /runs/:runId` so we can wire that up later without contract changes.
- **Idempotency / re-run semantics:** Recommended behavior is **overwrite-in-place** — if a brief for today already exists, regenerate it. The "Generate today's brief" button is intentionally usable as a refresh.
- **Internal orchestration (recommended):** Compose the brief by calling Copilot internally with `source_module: 'insights'`. The Daily Brief content (portfolio alerts, news alerts, action items, meetings, personal touches) maps to typed output the backend can serialize into the `DailySummary` shape below. The frontend will not orchestrate Copilot for brief generation — that responsibility sits in the Daily Brief service.
- **Disabled on past days:** The frontend disables the button when viewing a past day, so this endpoint should never be called for non-today dates. No `date` parameter is needed.

---

### 2.3 `GET /api/meeting-briefs/:meetingId`

Returns the deep-dive brief for a specific meeting referenced from a `DailySummary.sections.meetings[].meetingId`, OR for a meeting whose brief was created on demand via `POST /meeting-briefs/generate` (§2.4).

| Field | Value |
|---|---|
| **Method** | `GET` |
| **Path** | `/meeting-briefs/{meetingId}` |
| **Auth** | Required |
| **Path param** | `meetingId` — string. Matches `DailySummaryMeeting.meetingId` returned by `GET /daily-summaries`, or the `meetingId` returned in the `output` of a generate run (§2.4). |
| **Success response** | `200 OK`, body = `MeetingBrief` |
| **Error responses** | `404 Not Found`, `401`, `500` |

**Behavior notes:**

- The `id` and `meetingId` fields on `DailySummaryMeeting` may differ. `id` is the brief's row ID; `meetingId` is the underlying calendar/meeting record ID and is what this endpoint accepts.
- Only meetings with `hasBrief: true` in the daily summary will trigger this fetch. If `hasBrief: false`, the frontend hides the "View brief" link entirely.
- For ad-hoc briefs created via §2.4, the frontend uses the `meetingId` returned in the run output to fetch the brief immediately after generation completes.

---

### 2.4 `POST /api/meeting-briefs/generate`

Creates a meeting brief on demand for a meeting that is **not** in today's daily summary (e.g. an upcoming meeting that wasn't surfaced, or a one-off that the advisor wants briefed before walking in). Generation is async — returns a `runId` immediately; the caller polls `/runs/:runId`, then fetches the brief by `meetingId` via §2.3.

| Field | Value |
|---|---|
| **Method** | `POST` |
| **Path** | `/meeting-briefs/generate` |
| **Auth** | Required |
| **Request body** | `MeetingBriefGenerateRequest` (see below) |
| **Success response** | `202 Accepted`, body = `{ "runId": "<string>" }` |
| **Error responses** | `400 Bad Request` (missing/invalid fields), `401`, `429`, `500` |

#### Request body shape

```ts
interface MeetingBriefGenerateRequest {
  clientName: string            // required — the client the meeting is with
  clientId?: string             // optional — backend client/account ID if known
  date: string                  // required — ISO YYYY-MM-DD
  time: string                  // required — 24-hour HH:mm
  duration?: string             // optional, e.g. "30 min", "1 hour"
  format?: 'in-person' | 'video' | 'phone'
  attendees?: string[]          // optional — supports {{ADVISOR_NAME}} placeholder
  topic?: string                // optional — agenda hint to guide composition
  context?: string              // optional — free-text additional context (e.g. "follow-up on Apollo exit")
}
```

#### Run output shape

When the run completes, the polled `GET /runs/:runId` response should contain — in `output` — at minimum:

```ts
interface MeetingBriefGenerateOutput {
  meetingId: string             // ID the frontend uses to fetch via GET /meeting-briefs/:meetingId
  status: 'ready'               // surface a clear ready signal so the poller knows to fetch
}
```

The full `MeetingBrief` does NOT need to be embedded in the run output — the frontend will issue a follow-up `GET /meeting-briefs/:meetingId` once the run reaches terminal `complete` status.

**Behavior notes:**

- **Async by contract.** Mirrors `POST /daily-summaries/generate` — same 202 + `runId` shape, same polling pattern.
- **Polling target.** Frontend will poll `GET /runs/:runId` (the existing Copilot-style polling endpoint) using `pollCopilotRun` semantics from [`copilot-client.ts:77-98`](../../client/src/api/copilot-client.ts) (1.5s → 5s exponential backoff, max 20 attempts).
- **Persistence.** The generated brief MUST be persisted server-side and retrievable via `GET /meeting-briefs/:meetingId`. The advisor may navigate away mid-generation and return later — the brief should still be fetchable.
- **`meetingId` generation.** Backend generates the `meetingId` (any stable string format — UUID, slug, etc.). The frontend treats it as an opaque identifier for the subsequent GET.
- **Internal orchestration.** Backend should call Copilot internally with `source_module: 'insights'` (same pattern recommended for daily-summary generation in §2.2). All `MeetingBrief` fields (capital flows, deployment, pipeline, performance, key news, etc.) are composed by the Daily Brief / Meeting Brief service.
- **Idempotency.** Each POST creates a new brief. The frontend does NOT deduplicate; if the same advisor calls it twice for the same meeting, two briefs result. (Future optimization: include a request-level idempotency key — out of scope.)

---

## 3. Type Definitions (Verbatim)

These are **the contract**. They are copied verbatim from [`client/src/api/types.ts`](../../client/src/api/types.ts). Field order, optionality, and string union values must match exactly.

### 3.1 Daily Summary

```ts
// Top-level: returned as DailySummary[] from GET /daily-summaries
interface DailySummary {
  id: string                    // unique per row, e.g. "ds-001"
  date: string                  // ISO date YYYY-MM-DD
  relationshipPool: RelationshipPool
  sections: {
    portfolioAlerts: PortfolioAlert[]
    newsAlerts: NewsAlert[]
    actionItems: DailySummaryActionItem[]
    meetings: DailySummaryMeeting[]
    personal: DailySummaryPersonalItem[]
  }
}
```

### 3.2 Relationship Pool (top-of-page summary card)

Rendered above the section grid. Drives the "Total Clients / Total Networth / Deployable Gaps" hero card.

```ts
interface RelationshipPool {
  totalClients: number
  clientsTrend: number          // net change vs prior period (e.g. +3, -1)
  segmentSplit: ClientSegmentSplit[]
  totalNetworth: string         // pre-formatted display string, e.g. "$347.2m"
  networthTrend: number         // percent change, e.g. 12.4
  deployableGaps: DeployableGap[]
  insights: string[]            // free-text bullet points
}

interface ClientSegmentSplit {
  segment: 'Affluents' | 'HNI' | 'UHNI'
  count: number
}

interface DeployableGap {
  assetClass: string            // e.g. "PE", "RE", "Public Equities", "PD"
  amount: string                // pre-formatted display string, e.g. "$63m"
  amountNumeric: number         // raw numeric value for sorting/comparison, e.g. 63
}
```

### 3.3 Portfolio Alerts (left column, top section)

```ts
type PortfolioAlertCategory = 'portfolio_drift' | 'margin_call'

interface PortfolioAlert {
  id: string
  category: PortfolioAlertCategory
  clientName: string            // may be a group label like "10 clients"
  clientEmail: string
  clientHref: string            // full URL to client record (see field-level notes)
  description: string           // plain-text, multi-line allowed via \n
  severity: 'warning' | 'critical'
}
```

### 3.4 News Alerts (right column, top section)

```ts
interface NewsAlert {
  id: string
  headline: string
  summary: string
  source: string                // e.g. "Bloomberg", "Argaam", "WSJ"
  sourceUrl: string             // full https URL
  affectedClients: { name: string; impact: string; email: string }[]
  clientEmailSubject: string
  clientEmailBody: string       // supports {{ADVISOR_NAME}} placeholder — see notes
  internalTaskTitle: string
  internalTaskDescription: string
}
```

### 3.5 Action Items (left column, middle section)

```ts
type ActionItemOwner = 'client' | 'internal'

interface DailySummaryActionItem {
  id: string
  title: string
  client: string                // free-text, may be "Internal", "Multiple Clients", or a client name
  source: 'task_hub' | 'email' | 'compliance' | 'crm' | 'invest_admin'
  description: string
  owner: ActionItemOwner
}
```

### 3.6 Meetings (right column, middle section)

```ts
interface DailySummaryMeeting {
  id: string                    // unique row ID, e.g. "dm-001"
  meetingId: string             // path param for GET /meeting-briefs/:meetingId
  time: string                  // 24-hour "HH:mm", e.g. "09:30"
  date: string                  // ISO YYYY-MM-DD
  clientName: string
  topic: string
  attendees: string[]           // supports {{ADVISOR_NAME}} placeholder
  hasBrief: boolean             // false → frontend hides the "View brief" link
  briefLabel?: string           // optional override label, defaults to "Meeting brief"
}
```

### 3.7 Personal Touch (left column, bottom section)

```ts
interface DailySummaryPersonalItem {
  id: string
  clientName: string
  clientEmail: string
  type: 'birthday' | 'anniversary' | 'follow_up'
  note: string
  emailSubject: string
  emailBody: string             // supports {{ADVISOR_NAME}} placeholder
  date?: string                 // optional ISO date for the milestone, e.g. birthday
}
```

### 3.8 Meeting Brief (deep-dive, fetched per-meeting)

Returned by `GET /meeting-briefs/:meetingId`.

```ts
interface MeetingBrief {
  id: string
  clientName: string
  date: string                  // ISO YYYY-MM-DD
  time: string                  // 24-hour "HH:mm"
  attendees: MeetingBriefAttendee[]
  format: 'in-person' | 'video' | 'phone'
  duration: string              // e.g. "30 min", "1 hour"
  summary: {
    goal: string
    mainTopics: string[]
    secondaryTopics: string[]
  }
  capitalFlows: {
    funded: string              // pre-formatted display string
    distributed: string
    notices: CapitalFlowNotice[]
  }
  deployment: {
    deployed: number            // percent, e.g. 78
    target: number              // percent, e.g. 85
    byAssetClass: AssetAllocation[]
  }
  pipeline: PipelineDeal[]
  performance: NavMovement[]
  keyNews: DailySummaryNewsItem[]
  pendingItems: { title: string; status?: string; href?: string }[]

  // Optional sections — frontend omits cleanly when undefined
  returnsExpectation?: {
    annualReturn: { actual: number; target: number }
    yield: { actual: number; target: number }
    standardDeviation: { actual: number; target: number }
    sharpeRatio: { actual: number; target: number }
  }
  navEvolution?: { year: number; nav: number; twr?: number }[]
  zoomLink?: string
  personalTouch?: DailySummaryPersonalItem[]
  quickLinks?: { label: string; href: string }[]
  meetingMinutes?: {
    subject: string
    date: string
    time: string
    format: string
    status: string
    attendees: { name: string; role: string }[]
    agenda: string[]
    keyDecisions: string[]
    actionItems: { item: string; owner: string; status: string }[]
    notes: string
  }
}

interface MeetingBriefAttendee {
  name: string
  role: string
}

interface CapitalFlowNotice {
  fund: string
  type: 'capital_call' | 'distribution'
  amount: string                // pre-formatted display string
  status: 'overdue' | 'to_approve' | 'upcoming' | 'received'
}

interface AssetAllocation {
  name: string                  // e.g. "PE", "RE", "Public Equities"
  percentage: number            // 0-100
}

interface PipelineDeal {
  name: string
  category: string              // e.g. "PE Co-invest", "RE Fund"
  description: string
  icMemoUrl?: string
}

interface NavMovement {
  fund: string
  navDate: string               // ISO YYYY-MM-DD
  qoqChange: number             // percent, can be negative
}

interface DailySummaryNewsItem {
  id: string
  headline: string
  summary: string
  source: string
  sourceUrl?: string
}
```

---

## 4. Field-Level Notes

These are the non-obvious contract details — please read.

- **`DailySummary.date`** — ISO `YYYY-MM-DD`. Used as the stable identity key for date navigation in the UI; sorting is client-side via `localeCompare` descending. Date should be the calendar date in the advisor's `userTimezone`.
- **`DailySummary.id`** — Required and expected unique. Frontend doesn't deduplicate by it but treats duplicates as a data error.
- **`DailySummaryMeeting.meetingId`** — Must be the value accepted by `GET /meeting-briefs/:meetingId`. May differ from `id` (e.g. `id` = `"dm-001"`, `meetingId` = `"mb-001"` or the underlying calendar event ID).
- **`DailySummaryMeeting.hasBrief`** — When `false`, frontend hides the "View brief" link. Use this to suppress the link rather than returning a stub brief.
- **`PortfolioAlert.clientHref`** — Currently a full URL (e.g. `https://staging.asbitech.ai/engage/clients?...`). The backend should produce environment-appropriate URLs. **Recommendation:** consider returning a relative path that the frontend resolves, or making the base URL configurable, so prod/staging links don't get hardcoded into stored briefs.
- **`{{ADVISOR_NAME}}` placeholder** — Several fields contain the literal string `{{ADVISOR_NAME}}` which the frontend substitutes at render time with the authenticated user's name. Affected fields: `NewsAlert.clientEmailBody`, `DailySummaryMeeting.attendees[]`, `DailySummaryPersonalItem.emailBody`. **Backend must NOT escape, expand, or substitute this placeholder** — return it verbatim so the frontend can interpolate from the JWT user.
- **`RelationshipPool.totalNetworth` / `DeployableGap.amount`** — Pre-formatted display strings (`"$347.2m"`, `"$63m"`). For `DeployableGap`, the backend must also return `amountNumeric` (raw number) so the frontend can sort/compare without parsing the formatted string.
- **All multi-line text fields** (`description`, `emailBody`, `note`, `internalTaskDescription`, `summary`) — **Plain text, NOT markdown.** Newlines via `\n`. Frontend renders with `white-space: pre-wrap` (or equivalent). Do not include HTML or markdown formatting.
- **String unions** (`severity`, `category`, `source`, `owner`, `type`, `format`, `status`) — Backend must emit exactly these values (case-sensitive). Adding a new value requires a coordinated frontend change.

---

## 5. Copilot Reference (already integrated)

The Copilot API is already wired end-to-end on the frontend ([`copilot-client.ts`](../../client/src/api/copilot-client.ts), [`useChatStore.ts`](../../client/src/store/useChatStore.ts)). The dashboard chat panel calls Copilot directly. **The Daily Brief generation endpoint is expected to call Copilot server-side; the frontend will not orchestrate Copilot for brief generation.**

This section exists so the backend team has the existing Copilot contract on hand when designing the internal composition layer.

### Copilot endpoints (already live)

| Endpoint | Method | Purpose |
|---|---|---|
| `/agents/run` | POST | Trigger run, returns `{ run_id, status, workflow? }` |
| `/runs/:runId` | GET | Poll for completion (1.5s → 5s exponential backoff, max 20 attempts) |
| `/runs/:runId/feedback` | POST | Thumbs-up/down on completed run |
| `/agents/llm-providers` | GET | LLM provider catalog |
| `/agents/tools` | GET | Available agent tools |

### CopilotRequest shape

Source: [`client/src/api/types.ts:428-435`](../../client/src/api/types.ts)

```ts
interface CopilotRequest {
  message: string
  workflow?: string
  conversation_id?: string
  source_module?: 'engage' | 'deals' | 'plan' | 'insights' | 'portal'
  context?: Record<string, unknown>
  llm_config?: LLMConfig
}

interface LLMConfig {
  provider: 'anthropic' | 'azure_openai' | 'openrouter'
  model: string
  temperature?: number
  max_tokens?: number
}
```

For Daily Brief composition, use `source_module: 'insights'`.

### CopilotRunResponse shape

Source: [`client/src/api/types.ts:472-488`](../../client/src/api/types.ts)

```ts
interface CopilotRunResponse {
  id: string
  tenant_id: string
  user_id: string
  workflow: string
  status: RunStatus              // "queued" | "running" | "complete" | "failed" | "cancelled" (etc.)
  input: Record<string, unknown> | null
  output: CopilotOutput | null
  steps: RunStep[]
  llm_config: LLMConfig | null
  error: string | null
  triggered_by: string | null
  created_at: string | null
  started_at: string | null
  completed_at: string | null
  duration_ms: number | null
}

interface CopilotOutput {
  answer: string
  sources: CopilotSource[]
  tools_called: CopilotToolCall[]
  iteration_count: number
}
```

---

## 6. Out of Scope / Future Asks

Calling these out so the backend team isn't surprised when they land later.

### 6.1 Action Modal endpoints (not yet wired)

The dashboard exposes three action modals — Schedule Meeting, Create Task, Send Email — triggered from buttons inside Portfolio Alerts, News Alerts, Action Items, and Personal Touch cards. **Today the modals are pure UI** ([`ActionModal.tsx:48-54`](../../client/src/components/insights/ActionModal.tsx)): submit shows a 1.2s success checkmark, no POST. Nothing persists.

When we wire these up, the frontend will need:

| Endpoint | Form fields the modal collects |
|---|---|
| `POST /api/actions/schedule-meeting` | `clientName`, `attendees[]`, `date`, `time`, `duration`, `agenda` |
| `POST /api/actions/create-task` | `assignee`, `title`, `description`, `priority`, `dueDate` |
| `POST /api/actions/send-email` | `to`, `subject`, `body` |

These will get their own follow-up integration doc with full request/response shapes when prioritized.

### 6.2 Date-range filtering on `GET /daily-summaries`

Today the frontend pulls full history. Once history grows, we'll want `?from=YYYY-MM-DD&to=YYYY-MM-DD` parameters. Not blocking for v1.

### 6.3 Run-status polling on `/daily-summaries/generate`

Frontend currently re-fetches the list rather than polling `runId`. If generation routinely exceeds ~5s, we'll switch to the same polling pattern Copilot uses against `GET /runs/:runId`. The 202 response shape (`{ runId }`) is intentionally compatible with that pattern.

---

## 7. Appendix — Example Payloads

### 7.1 Example `DailySummary` (today)

This is real mock data the frontend uses today — copied from [`client/src/api/mock/data/dailySummaries.ts`](../../client/src/api/mock/data/dailySummaries.ts) (`day1`). Use it as a reference for realistic field lengths, the placeholder template, severity values, and structural conventions.

```json
{
  "id": "ds-001",
  "date": "2026-04-28",
  "relationshipPool": {
    "totalClients": 24,
    "clientsTrend": 3,
    "segmentSplit": [
      { "segment": "Affluents", "count": 18 },
      { "segment": "HNI", "count": 4 },
      { "segment": "UHNI", "count": 2 }
    ],
    "totalNetworth": "$347.2m",
    "networthTrend": 12.4,
    "deployableGaps": [
      { "assetClass": "PE", "amount": "$63m", "amountNumeric": 63 },
      { "assetClass": "RE", "amount": "$34m", "amountNumeric": 34 },
      { "assetClass": "Public Equities", "amount": "$20m", "amountNumeric": 20 },
      { "assetClass": "PD", "amount": "$25m", "amountNumeric": 25 }
    ],
    "insights": [
      "20 clients are looking for PE deals. Talk to deals to prioritize PE.",
      "3 clients have upcoming KYC renewals this month — prioritize outreach."
    ]
  },
  "sections": {
    "portfolioAlerts": [
      {
        "id": "pa-001",
        "category": "portfolio_drift",
        "clientName": "Al Rashidi Family",
        "clientEmail": "ahmed@alrashidi-fo.com",
        "clientHref": "https://staging.asbitech.ai/engage/clients?taskStatus=2&page=0&size=20&sort=createdDate%2Casc",
        "description": "Falling behind allocation execution in PE — prioritize discussion in next meeting",
        "severity": "warning"
      },
      {
        "id": "pa-004",
        "category": "margin_call",
        "clientName": "Noor Holdings",
        "clientEmail": "khalid.noor@noorholdings.com",
        "clientHref": "https://staging.asbitech.ai/engage/clients?taskStatus=2&page=0&size=20&sort=createdDate%2Casc",
        "description": "Margin call triggered on leveraged RE position — exposure at 112%, requires immediate action",
        "severity": "critical"
      }
    ],
    "newsAlerts": [
      {
        "id": "na-001",
        "headline": "Change in Fed Rates",
        "summary": "The Fed rate decision means your fixed income allocation is now 3 percentage points over target. We recommend trimming $2M from short-duration bonds.",
        "source": "Bloomberg",
        "sourceUrl": "https://www.bloomberg.com/news/articles/fed-rate-decision-impact",
        "affectedClients": [
          { "name": "Al-Rashidi Family", "impact": "Fixed income portfolio overweight — needs rebalancing", "email": "ahmed@alrashidi-fo.com" },
          { "name": "Saqib & Family", "impact": "Bond duration exposure requires review", "email": "saqib@familyoffice.ae" }
        ],
        "clientEmailSubject": "Important: Fed Rate Decision — Impact on Your Portfolio",
        "clientEmailBody": "Dear Client,\n\nI wanted to bring to your attention the recent Federal Reserve rate decision and its implications for your portfolio.\n\nThe Fed rate decision means your fixed income allocation is now 3 percentage points over target. We recommend trimming $2M from short-duration bonds to realign with your target allocation.\n\nI would like to schedule a brief call to discuss the recommended adjustments and ensure we are aligned on the next steps.\n\nPlease let me know your availability.\n\nBest regards,\n{{ADVISOR_NAME}}\nInvictus AI Wealth Management",
        "internalTaskTitle": "Review fixed income allocation across affected clients post Fed decision",
        "internalTaskDescription": "The Fed rate decision impacts multiple client portfolios. Action required:\n\n1. Review Al-Rashidi Family fixed income allocation — currently 3pp over target\n2. Review Saqib & Family bond duration exposure\n3. Prepare rebalancing recommendations for both clients\n4. Coordinate with trading desk for execution timeline\n\nPriority: High\nDeadline: End of week"
      }
    ],
    "actionItems": [
      {
        "id": "ai-001",
        "title": "Al Rashidi Family — KYC Renewal",
        "client": "Al Rashidi Family",
        "source": "crm",
        "description": "Awaiting updated KYC documents — renewal overdue",
        "owner": "client"
      },
      {
        "id": "ai-003",
        "title": "GCC RE Fund III — Pending Distribution Transfer to Client",
        "client": "GCC RE Fund III",
        "source": "invest_admin",
        "description": "Fund distribution approved — awaiting transfer to client account",
        "owner": "internal"
      }
    ],
    "meetings": [
      {
        "id": "dm-001",
        "meetingId": "mb-001",
        "time": "09:30",
        "date": "2026-04-28",
        "clientName": "Al-Rashidi Family",
        "topic": "Quarterly update with pending KYC discussion",
        "attendees": ["{{ADVISOR_NAME}}", "Ahmed Al-Rashidi", "Sarah Chen"],
        "hasBrief": true,
        "briefLabel": "Meeting brief"
      }
    ],
    "personal": [
      {
        "id": "pp-001",
        "clientName": "Ahmed Al-Rashidi",
        "clientEmail": "ahmed@alrashidi-fo.com",
        "type": "birthday",
        "note": "Birthday tomorrow — opportunity for personal outreach",
        "emailSubject": "Happy Birthday, Ahmed!",
        "emailBody": "Dear Ahmed,\n\nWishing you a very happy birthday! I hope you have a wonderful day celebrating with your loved ones.\n\nIt has been a pleasure working with you and the Al-Rashidi Family. Here's to another great year ahead.\n\nWarm regards,\n{{ADVISOR_NAME}}"
      }
    ]
  }
}
```

### 7.2 Example `MeetingBrief`

See [`client/src/api/mock/data/meetingBriefs.ts`](../../client/src/api/mock/data/meetingBriefs.ts) for full reference examples — they cover all optional fields (`returnsExpectation`, `navEvolution`, `meetingMinutes`, etc.) so the backend can match the exact field shapes.

### 7.3 Example `POST /daily-summaries/generate` response

```json
HTTP/1.1 202 Accepted
Content-Type: application/json

{ "runId": "sum-1714305600000" }
```

### 7.4 Example `POST /meeting-briefs/generate` request and response

Request:

```json
POST /api/meeting-briefs/generate
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "clientName": "Al-Rashidi Family",
  "date": "2026-05-02",
  "time": "14:00",
  "duration": "45 min",
  "format": "video",
  "attendees": ["{{ADVISOR_NAME}}", "Ahmed Al-Rashidi"],
  "topic": "Follow-up on Apollo Secondaries IX commitment",
  "context": "Client expressed interest last week. Bring updated commitment letter."
}
```

Response:

```json
HTTP/1.1 202 Accepted
Content-Type: application/json

{ "runId": "mb-gen-1714305600000" }
```

Then the frontend polls `GET /runs/mb-gen-1714305600000` until `status === "complete"`. The completed run's `output` contains:

```json
{
  "meetingId": "mb-2026-05-02-alrashidi-apollo",
  "status": "ready"
}
```

After which the frontend issues `GET /api/meeting-briefs/mb-2026-05-02-alrashidi-apollo` to retrieve the full `MeetingBrief`.

---

## 8. Reference Files (Frontend)

If you need to verify any shape or behavior described above, these are the source-of-truth files in the frontend repo:

- [`client/src/api/types.ts`](../../client/src/api/types.ts) — All type definitions (Daily Brief: lines 118–329; Copilot: lines 426–517; JWT: lines 410–424)
- [`client/src/api/endpoints.ts`](../../client/src/api/endpoints.ts) — Endpoint surface (`summariesApi`, `meetingBriefsApi`)
- [`client/src/api/client.ts`](../../client/src/api/client.ts) — Auth header injection, 401 refresh handling
- [`client/src/api/copilot-client.ts`](../../client/src/api/copilot-client.ts) — Copilot polling pattern (reference for matching `runId` polling shape)
- [`client/src/api/platform-api.ts`](../../client/src/api/platform-api.ts) — JWT acquisition + storage
- [`client/src/api/mock/handlers.ts`](../../client/src/api/mock/handlers.ts) — Current MSW mock contract (status codes, delays)
- [`client/src/api/mock/data/dailySummaries.ts`](../../client/src/api/mock/data/dailySummaries.ts) — Reference payloads for 10 days
- [`client/src/api/mock/data/meetingBriefs.ts`](../../client/src/api/mock/data/meetingBriefs.ts) — Reference payloads for meeting briefs
- [`client/src/pages/DashboardPage.tsx`](../../client/src/pages/DashboardPage.tsx) — Page-level consumer (orchestrates fetching, navigation, generate trigger)
- [`client/src/components/insights/`](../../client/src/components/insights/) — Section components (`PortfolioAlerts`, `NewsAlerts`, `ActionItems`, `Meetings`, `PersonalTouch`, `RelationshipPool`, `ActionModal`)
- [`client/vite.config.ts`](../../client/vite.config.ts) — Dev proxy config (`/api` → `localhost:8000`, `/platform-api` → staging)
