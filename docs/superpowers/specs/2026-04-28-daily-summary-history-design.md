# Daily Summary History — Design

**Date:** 2026-04-28
**Surface:** [`/home/dashboard`](../../../client/src/pages/DashboardPage.tsx)
**Scope:** Frontend only. Mock API layer extended; real backend wiring deferred.

## Goal

Let an advisor browse previous Daily Summaries from the dashboard. Today, [`DashboardPage`](../../../client/src/pages/DashboardPage.tsx) fetches all summaries via `summariesApi.list()` but renders only `summaries[0]` (today). The fix is purely a UI change to expose the rest of the array, plus a trigger to regenerate today's brief.

## User-facing behavior

1. **Date navigator** in the dashboard header: `[ ← ]  Wednesday, 28 April  [ → ]   [ Today ]   [ ⟳ Generate today's brief ]`.
2. **Prev arrow** moves to the next-older summary; **Next arrow** moves to the next-newer summary.
3. **Today button** jumps directly back to the most-recent summary; disabled when already on today.
4. **Generate today's brief** button is always rendered, but enabled only when viewing today. On past days it is disabled with a tooltip ("Available on today's brief only").
5. When viewing a past day, a **subtle info banner** appears between the stats ribbon and the Relationship Pool: `ⓘ  Viewing Tuesday, 27 April — 1 day ago.   [ Back to today ]`.
6. Action buttons inside section cards (`PortfolioAlerts`, `NewsAlerts`, etc.) **remain enabled** on past days. The banner is the only mode signal.
7. Boundaries: Prev disabled on the oldest summary; Next disabled on today.

## Non-goals

- Calendar popover / arbitrary date picking (arrows-only by user choice).
- Sharing past-day URLs (no URL persistence — local state only).
- Real backend regeneration of summaries (mock returns 202; UI re-fetches; data unchanged in mock).
- Editing or deleting past summaries.

## Architecture

All changes live in [`DashboardPage.tsx`](../../../client/src/pages/DashboardPage.tsx) plus a small extension to the API layer for the new `generate` endpoint. No new components, no new stores, no router changes.

### State

```ts
const [summaries, setSummaries] = useState<DailySummary[]>([])
const [loading, setLoading] = useState(true)
const [selectedDate, setSelectedDate] = useState<string | null>(null)
const [generating, setGenerating] = useState(false)
```

`selectedDate` holds an ISO date string (e.g. `"2026-04-28"`) — not an index — so the active day is robust to changes in array order. Initialized to `null` and set to `summaries[0].date` once the fetch resolves.

### Derived values

```ts
const sortedSummaries = useMemo(
  () => [...summaries].sort((a, b) => b.date.localeCompare(a.date)),
  [summaries]
)
const currentIndex = sortedSummaries.findIndex((s) => s.date === selectedDate)
const current = sortedSummaries[currentIndex]
const isToday = currentIndex === 0
const canGoPrev = currentIndex >= 0 && currentIndex < sortedSummaries.length - 1
const canGoNext = currentIndex > 0
```

The rest of the page (stats ribbon, `RelationshipPool`, the two-column section grid) consumes `current` instead of the existing `today` constant. No section-component prop signatures change.

### Handlers

```ts
function goPrev()  { if (canGoPrev) setSelectedDate(sortedSummaries[currentIndex + 1].date) }
function goNext()  { if (canGoNext) setSelectedDate(sortedSummaries[currentIndex - 1].date) }
function goToday() { setSelectedDate(sortedSummaries[0].date) }

async function generate() {
  setGenerating(true)
  try {
    await summariesApi.generate()
    const data = await summariesApi.list()
    setSummaries(data)
    setSelectedDate(data[0]?.date ?? null)
  } finally {
    setGenerating(false)
  }
}
```

### API extensions

In [`endpoints.ts`](../../../client/src/api/endpoints.ts):

```ts
export const summariesApi = {
  list: () => api.get<DailySummary[]>('/daily-summaries'),
  generate: () => api.post<{ runId: string }>('/daily-summaries/generate', {}),
}
```

In [`mock/handlers.ts`](../../../client/src/api/mock/handlers.ts), add:

```ts
http.post('/api/daily-summaries/generate', async () => {
  return HttpResponse.json({ runId: `sum-${Date.now()}` }, { status: 202 })
}),
```

Mock does not regenerate data — the handler exists so the UI flow can be exercised end-to-end. Real polling and content refresh wire in when the backend lands.

## UI breakdown

### Date navigator (replaces lines ~73–76 of `DashboardPage.tsx`)

Inline JSX in the header. Three button clusters separated by visual gaps:

- **Arrows + label pill:** ghost icon buttons (`ChevronLeft`, `ChevronRight` from `lucide-react`) wrapping a centered date label formatted via `format(date, "EEEE, do MMMM")` (date-fns, matches existing pattern). Each arrow uses the `disabled` attribute; styling already greys via the shadcn Button component.
- **Today button:** `<Button variant="secondary" size="sm">`. Disabled when `isToday`.
- **Generate button:** `<Button variant="default" size="sm">` with `RefreshCw` icon (or `Loader2` spinning when `generating === true`). Disabled when `!isToday || generating`. Tooltip on disabled state: "Available on today's brief only" (shadcn `Tooltip`).

### Past-day banner (new, conditional on `!isToday`)

Rendered between the stats ribbon and the `RelationshipPool` block. Single horizontal pill:

- Container: `flex items-center justify-between bg-muted/40 border border-border/60 rounded-lg px-4 py-2.5`
- Left: `Info` icon (lucide) + text `Viewing {fullDate} — {relativePhrase}.` where `relativePhrase` comes from `formatDistanceToNowStrict(parseISO(selectedDate), { addSuffix: true })`.
- Right: text-button "Back to today" calling `goToday()`.

## Data flow

```
Mount → summariesApi.list() → setSummaries(data) → setSelectedDate(data[0].date)
                                                              ↓
                                          sortedSummaries / current derived
                                                              ↓
                            Stats ribbon, banner, section cards render from `current`

Prev/Next/Today click → setSelectedDate(...) → re-derive → re-render

Generate click → setGenerating(true)
              → summariesApi.generate() (POST 202)
              → summariesApi.list()
              → setSummaries(fresh) → setSelectedDate(fresh[0].date)
              → setGenerating(false)
```

## Error handling

- **List fetch failure:** existing behavior preserved (loading=false, page renders nothing because `current` is undefined). Out of scope to improve here.
- **Generate failure:** the `try/finally` resets `generating`. We surface a small inline error message under the button ("Couldn't start generation. Try again.") that auto-clears on the next click. No toast system to integrate with currently.
- **Empty summaries array:** if `summaries.length === 0`, the page already renders nothing (existing `if (!today) return null` becomes `if (!current) return null`). Acceptable.

## Testing

Manual checks (no test framework wired yet per CLAUDE.md):

1. Land on `/home/dashboard` → today's brief renders, Prev enabled, Next disabled, Today disabled, Generate enabled.
2. Click Prev → yesterday's brief renders, banner appears with "1 day ago", Today enabled, Generate disabled, tooltip on Generate reads correctly.
3. Click Prev repeatedly until Prev disables → confirm bound at oldest summary (10th business day back from today's anchor in mock data).
4. Click Today → snaps to today, banner gone, Generate re-enabled.
5. Click Generate → spinner shows, button disables, list re-fetches; UI returns to today.
6. Section action modals (Send Email, Create Task) still open and prefill correctly when triggered from a past-day item.

## Files changed

- [`client/src/pages/DashboardPage.tsx`](../../../client/src/pages/DashboardPage.tsx) — state, derived values, navigator, banner, generate handler.
- [`client/src/api/endpoints.ts`](../../../client/src/api/endpoints.ts) — add `summariesApi.generate`.
- [`client/src/api/mock/handlers.ts`](../../../client/src/api/mock/handlers.ts) — add `POST /api/daily-summaries/generate` mock handler.

No changes to:
- Section components (`PortfolioAlerts`, `NewsAlerts`, `Meetings`, `ActionItems`, `PersonalTouch`, `RelationshipPool`).
- `useAuthStore`, `useChatStore`, or any other store.
- Mock data files (existing 10 summaries already cover the demo range).
- Routing.
