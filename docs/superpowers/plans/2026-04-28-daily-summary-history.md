# Daily Summary History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let advisors browse previous Daily Summaries on `/home/dashboard` via prev/next/today arrows, see a banner when viewing a past day, and trigger today's brief regeneration with a button.

**Architecture:** All state stays local to [`DashboardPage`](../../../client/src/pages/DashboardPage.tsx). The mock API already returns 10 days of summaries — the page just needs to expose them. A new `summariesApi.generate()` call triggers regeneration; mock responds 202 without mutating data.

**Tech Stack:** React 19, TypeScript, date-fns, lucide-react, shadcn/ui (Button, Tooltip), MSW for the mock handler. No new dependencies.

**Spec:** [`docs/superpowers/specs/2026-04-28-daily-summary-history-design.md`](../specs/2026-04-28-daily-summary-history-design.md)

**Note on testing:** This project has no test framework wired yet (per `CLAUDE.md`). Each task uses **manual verification steps in the browser** (`pnpm dev`, then check behavior on `http://localhost:5173/home/dashboard`) plus `pnpm build` for type-checking. When a test framework lands, this plan's behaviors should be backfilled with real tests.

**Working directory:** all paths are relative to `/Users/raoof/Documents/work/space/wealth-app/`. Run all commands from `client/` unless stated.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `client/src/api/endpoints.ts` | Modify | Add `summariesApi.generate()` |
| `client/src/api/mock/handlers.ts` | Modify | Add `POST /api/daily-summaries/generate` mock handler |
| `client/src/pages/DashboardPage.tsx` | Modify | Add `selectedDate` state, derived values, navigator UI, banner, generate handler |

No new files. No store changes. No router changes. No section-component prop changes.

---

## Task 1: Add `generate` to the API client

**Files:**
- Modify: `client/src/api/endpoints.ts`

- [ ] **Step 1: Add `generate` method to `summariesApi`**

Replace the current `summariesApi` block (lines 16–18) with:

```ts
export const summariesApi = {
  list: () => api.get<DailySummary[]>('/daily-summaries'),
  generate: () => api.post<{ runId: string }>('/daily-summaries/generate', {}),
}
```

- [ ] **Step 2: Type-check**

Run from `client/`:
```bash
pnpm build
```
Expected: build succeeds (`tsc -b` clean, Vite bundles).

- [ ] **Step 3: Commit**

```bash
git add client/src/api/endpoints.ts
git commit -m "feat(api): add summariesApi.generate for daily-brief regeneration"
```

---

## Task 2: Add mock handler for `POST /api/daily-summaries/generate`

**Files:**
- Modify: `client/src/api/mock/handlers.ts`

- [ ] **Step 1: Add the handler immediately after the existing `GET /api/daily-summaries` handler**

In `client/src/api/mock/handlers.ts`, find the block at lines 64–67:

```ts
http.get('/api/daily-summaries', async () => {
  await delay(300)
  return HttpResponse.json(DAILY_SUMMARIES)
}),
```

Add the new handler directly after it (before the `// ── Meeting Briefs` comment):

```ts
http.post('/api/daily-summaries/generate', async () => {
  await delay(300)
  return HttpResponse.json({ runId: `sum-${Date.now()}` }, { status: 202 })
}),
```

- [ ] **Step 2: Verify mock handler works in browser**

From `client/`:
```bash
pnpm dev
```

Open browser devtools → Network tab. Visit `http://localhost:5173/home/dashboard`. After the page loads, in the devtools console run:

```js
fetch('/api/daily-summaries/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  .then((r) => r.json().then((j) => ({ status: r.status, body: j })))
  .then(console.log)
```

Expected output: `{ status: 202, body: { runId: 'sum-<timestamp>' } }`.

Stop the dev server (Ctrl+C).

- [ ] **Step 3: Commit**

```bash
git add client/src/api/mock/handlers.ts
git commit -m "feat(mock): add POST /daily-summaries/generate handler"
```

---

## Task 3: Add date-selection state and derived values to `DashboardPage`

**Files:**
- Modify: `client/src/pages/DashboardPage.tsx`

This task lays the foundation: track `selectedDate`, derive `current`/`isToday`/boundaries, and swap the existing `today` reference to use `current`. **No UI changes yet** — the page should look identical after this task. We do this first so the rest of the work is purely additive UI.

- [ ] **Step 1: Update imports**

Replace the current import line `import { useEffect, useState } from 'react'` (line 1) with:

```tsx
import { useEffect, useMemo, useState } from 'react'
```

- [ ] **Step 2: Add `selectedDate` state**

Inside `DashboardPage`, find this block (around lines 17–20):

```tsx
const { user } = useAuthStore()
const [summaries, setSummaries] = useState<DailySummary[]>([])
const [loading, setLoading] = useState(true)
const [actionModal, setActionModal] = useState<ActionModalContext>({ type: null })
```

Add a `selectedDate` line so it reads:

```tsx
const { user } = useAuthStore()
const [summaries, setSummaries] = useState<DailySummary[]>([])
const [loading, setLoading] = useState(true)
const [selectedDate, setSelectedDate] = useState<string | null>(null)
const [actionModal, setActionModal] = useState<ActionModalContext>({ type: null })
```

- [ ] **Step 3: Default `selectedDate` to today's summary after fetch**

Find the existing `useEffect` (lines 22–38) and replace its body so it sets `selectedDate` once data arrives:

```tsx
useEffect(() => {
  let cancelled = false
  setLoading(true)
  summariesApi
    .list()
    .then((data) => {
      if (cancelled) return
      const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date))
      setSummaries(sorted)
      setSelectedDate(sorted[0]?.date ?? null)
      setLoading(false)
    })
    .catch(() => {
      if (!cancelled) setLoading(false)
    })
  return () => {
    cancelled = true
  }
}, [])
```

- [ ] **Step 4: Add derived values, replacing `const today = summaries[0]`**

Find these two lines (around lines 44–45):

```tsx
const today = summaries[0]
if (!today) return null
```

Replace them with:

```tsx
const sortedSummaries = useMemo(
  () => [...summaries].sort((a, b) => b.date.localeCompare(a.date)),
  [summaries]
)
const currentIndex = sortedSummaries.findIndex((s) => s.date === selectedDate)
const current = currentIndex >= 0 ? sortedSummaries[currentIndex] : sortedSummaries[0]
if (!current) return null
const isToday = current.date === sortedSummaries[0]?.date
const canGoPrev = currentIndex >= 0 && currentIndex < sortedSummaries.length - 1
const canGoNext = currentIndex > 0
```

- [ ] **Step 5: Replace remaining `today` references with `current`**

In the same file, change every occurrence of `today` (the variable) to `current`. Specifically:

- Lines 54–58 (stats):
  ```tsx
  const totalAlerts = current.sections.portfolioAlerts.length
  const totalActions = current.sections.actionItems.length
  const totalNews = current.sections.newsAlerts.length
  const totalMeetings = current.sections.meetings.length
  const totalPersonal = current.sections.personal.length
  ```
- Line 118: `<RelationshipPool pool={current.relationshipPool} />`
- Lines 123–125 and 128–129: replace `today.sections.X` with `current.sections.X` in the `<PortfolioAlerts>`, `<ActionItems>`, `<PersonalTouch>`, `<NewsAlerts>`, `<Meetings>` JSX.

Use Edit's `replace_all` set to true for the literal string `today.sections` → `current.sections` and the literal string `today.relationshipPool` → `current.relationshipPool` (both replacements are safe — no other `today.` occurrences exist in this file).

- [ ] **Step 6: Verify the page still renders identically**

From `client/`:
```bash
pnpm build
```
Expected: clean build.

```bash
pnpm dev
```

Visit `http://localhost:5173/home/dashboard`. Expected: dashboard renders exactly as before — same date in header, same stats ribbon, same section content. **Nothing visible has changed yet** — this is intentional.

Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/DashboardPage.tsx
git commit -m "refactor(dashboard): switch from positional 'today' to date-keyed 'current' summary"
```

---

## Task 4: Add prev/next/today date navigator UI

**Files:**
- Modify: `client/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Add icon and Button imports**

Update the lucide-react import at line 3 to include `ChevronLeft`, `ChevronRight`, `RefreshCw`, `Loader2`, `Info`:

```tsx
import { Clock, CheckCircle2, Loader, Newspaper, Heart, ChevronLeft, ChevronRight, RefreshCw, Loader2, Info } from 'lucide-react'
```

Add Button and Tooltip imports below the existing imports (after `import type { DailySummary, ActionModalContext, ActionModalType } from '@/api/types'`):

```tsx
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { formatDistanceToNowStrict, parseISO } from 'date-fns'
```

- [ ] **Step 2: Add `generating` state and handlers**

Below the existing `setActionModal` line, add:

```tsx
const [generating, setGenerating] = useState(false)
const [generateError, setGenerateError] = useState<string | null>(null)
```

After the `function injectName` block (around line 64) and before `function openAction`, add the navigator handlers:

```tsx
function goPrev() {
  if (canGoPrev) setSelectedDate(sortedSummaries[currentIndex + 1].date)
}
function goNext() {
  if (canGoNext) setSelectedDate(sortedSummaries[currentIndex - 1].date)
}
function goToday() {
  if (sortedSummaries[0]) setSelectedDate(sortedSummaries[0].date)
}

async function handleGenerate() {
  setGenerating(true)
  setGenerateError(null)
  try {
    await summariesApi.generate()
    const data = await summariesApi.list()
    const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date))
    setSummaries(sorted)
    if (sorted[0]) setSelectedDate(sorted[0].date)
  } catch {
    setGenerateError("Couldn't start generation. Try again.")
  } finally {
    setGenerating(false)
  }
}
```

- [ ] **Step 3: Replace the static date line with the navigator**

Find this block (around lines 73–82):

```tsx
<div>
  <p className="text-sm text-muted-foreground mb-1">
    {format(addDays(new Date(), 1), "EEEE, do MMMM")}
  </p>
  <div className="flex items-center justify-between">
    <h1 className="text-2xl font-bold tracking-tight">
      {getGreeting()} {user?.name?.split(' ')[0] || 'James'},
    </h1>
  </div>
```

Replace it with:

```tsx
<div>
  <div className="flex items-center gap-2 mb-1">
    <button
      type="button"
      onClick={goPrev}
      disabled={!canGoPrev}
      aria-label="Previous day"
      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      <ChevronLeft className="h-4 w-4" />
    </button>
    <p className="text-sm text-muted-foreground tabular-nums min-w-[180px] text-center">
      {format(parseISO(current.date), "EEEE, do MMMM")}
    </p>
    <button
      type="button"
      onClick={goNext}
      disabled={!canGoNext}
      aria-label="Next day"
      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      <ChevronRight className="h-4 w-4" />
    </button>
    <Button
      type="button"
      onClick={goToday}
      disabled={isToday}
      variant="secondary"
      size="sm"
      className="ml-2 h-7"
    >
      Today
    </Button>
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={!isToday || generating}
              variant="default"
              size="sm"
              className="ml-1 h-7 gap-1.5"
            >
              {generating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {generating ? 'Generating…' : "Generate today's brief"}
            </Button>
          </span>
        </TooltipTrigger>
        {!isToday && (
          <TooltipContent side="bottom">Available on today's brief only</TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  </div>
  <div className="flex items-center justify-between">
    <h1 className="text-2xl font-bold tracking-tight">
      {getGreeting()} {user?.name?.split(' ')[0] || 'James'},
    </h1>
  </div>
  {generateError && (
    <p className="text-xs text-destructive mt-1">{generateError}</p>
  )}
```

Note: the `<span>` wrapping the disabled Button is required so the Tooltip trigger has a non-disabled element to attach to (a disabled `<button>` does not fire pointer events).

- [ ] **Step 4: Remove the now-unused `addDays` import**

The existing `import { format, addDays } from 'date-fns'` (line 2) — remove `addDays` since `format(addDays(new Date(), 1), …)` was replaced by `format(parseISO(current.date), …)`. The new line should read:

```tsx
import { format } from 'date-fns'
```

(`parseISO` and `formatDistanceToNowStrict` are imported on the new date-fns import line added in Step 1.)

- [ ] **Step 5: Build and visually verify**

```bash
pnpm build
```
Expected: clean build.

```bash
pnpm dev
```

Visit `http://localhost:5173/home/dashboard`. Verify:
- Header shows `[ ← ]  Wednesday, 28 April  [ → ]   [ Today ]   [ ⟳ Generate today's brief ]`.
- Prev arrow is enabled (10 mock days back), Next arrow is **disabled**, Today is **disabled**, Generate is **enabled** (no tooltip).
- Click Prev → date label changes to yesterday's mock date, stats ribbon numbers update, section cards update, Next becomes enabled, Today becomes enabled, Generate becomes **disabled**.
- Hover the disabled Generate button → tooltip reads "Available on today's brief only".
- Click Today → snaps back to today; Today and Next disable; Generate re-enables.
- Click Prev several more times to the oldest day → Prev disables.
- Click Generate (while on today) → button shows spinner + "Generating…", then returns to enabled state. (Mock data doesn't change, so the page content is identical after — that's expected.)

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/DashboardPage.tsx
git commit -m "feat(dashboard): add prev/next/today navigator and generate-today's-brief button"
```

---

## Task 5: Add the "viewing past day" banner

**Files:**
- Modify: `client/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Insert the banner between the stats ribbon and `RelationshipPool`**

Find the closing of the stats ribbon block — the `</div>` that ends the `<div className="flex items-center gap-6 mt-4 py-3 px-5 …">` (currently around line 114), followed immediately by the closing `</div>` of the outer header `<div>`, followed by `{/* Relationship Pool */}` and `<RelationshipPool …>`.

Between the closing `</div>` of the outer header block and the `{/* Relationship Pool */}` comment, insert:

```tsx
{!isToday && (
  <div className="flex items-center justify-between bg-muted/40 border border-border/60 rounded-lg px-4 py-2.5">
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Info className="h-4 w-4" />
      <span>
        Viewing {format(parseISO(current.date), "EEEE, do MMMM")} —{' '}
        {formatDistanceToNowStrict(parseISO(current.date), { addSuffix: true })}.
      </span>
    </div>
    <button
      type="button"
      onClick={goToday}
      className="text-sm font-medium text-primary hover:underline"
    >
      Back to today
    </button>
  </div>
)}
```

- [ ] **Step 2: Build and visually verify**

```bash
pnpm build
```
Expected: clean build.

```bash
pnpm dev
```

Visit `http://localhost:5173/home/dashboard`. Verify:
- On today: **no banner**.
- Click Prev → banner appears below the stats ribbon, above the Relationship Pool, with text like `ⓘ  Viewing Tuesday, 27 April — 1 day ago.   [ Back to today ]`.
- Click "Back to today" inside the banner → snaps to today, banner disappears.
- Click Prev several days → relative phrase updates ("3 days ago", "5 days ago", etc.).

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/DashboardPage.tsx
git commit -m "feat(dashboard): add past-day info banner with back-to-today action"
```

---

## Task 6: End-to-end manual smoke test

**Files:** none modified.

- [ ] **Step 1: Run the full flow in the browser**

```bash
pnpm dev
```

Walk through each item from the spec's testing section:

1. Land on `/home/dashboard` → today's brief renders, Prev enabled, Next disabled, Today disabled, Generate enabled, **no banner**.
2. Click Prev → yesterday's brief renders, banner appears with "1 day ago" (or appropriate phrase), Today enabled, Generate disabled, hover Generate → tooltip "Available on today's brief only".
3. Click Prev repeatedly until Prev disables → confirm bound at oldest summary (10 business days back from today's mock anchor).
4. Click Today → snaps to today; banner gone; Generate re-enabled.
5. Click Generate → spinner + "Generating…", button disables; after the mock 202 + list refetch returns, button returns to "Generate today's brief".
6. From a past day, open a `Send Email` action on a `NewsAlert` (or `PersonalTouch` item) → modal opens and prefills correctly; close it. (Confirms action buttons remain functional on past days.)

If any step fails, capture the discrepancy, stop, and fix in a follow-up task before proceeding.

- [ ] **Step 2: Final lint and build pass**

```bash
pnpm lint
pnpm build
```
Expected: both clean.

- [ ] **Step 3: No commit needed — verification only**

If everything passed, the feature is done. If `pnpm lint` or `pnpm build` surface issues, fix them inline and commit with message `chore: address lint/typecheck after daily-summary history feature`.

---

## Self-review checklist

(For the plan author — already run.)

- **Spec coverage:**
  - Date navigator → Task 4. ✅
  - Past-day banner with relative phrase → Task 5. ✅
  - Generate today's brief button + tooltip → Task 4. ✅
  - Prev/Next bounds + Today shortcut → Task 4 (handlers + disable rules). ✅
  - Action buttons stay enabled on past days → no change needed (default behavior preserved); verified in Task 6 step 6. ✅
  - API extension `summariesApi.generate` → Task 1. ✅
  - Mock handler `POST /api/daily-summaries/generate` → Task 2. ✅
  - "viewing past day" banner does not gate anything → Task 5 visual-only. ✅
- **Placeholder scan:** no TBDs, no "appropriate error handling", no "similar to Task N" — every code block is full and inline.
- **Type consistency:** `summariesApi.generate()` defined in Task 1 returns `Promise<{ runId: string }>`; consumed in Task 4's `handleGenerate` as a fire-and-forget (the promise is awaited, the value is discarded — fine). `selectedDate` is `string | null` throughout. `current` is non-null below the `if (!current) return null` guard. `formatDistanceToNowStrict(parseISO(current.date), { addSuffix: true })` matches date-fns v3 API.
- **Scope:** focused on a single page; one plan, one feature.
