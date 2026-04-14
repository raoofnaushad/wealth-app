# Opportunity Lifecycle Validation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace document-level validation with opportunity-level lifecycle stages (Pre-Screening → IC-Memo → Approved / Rejected) where the user selects documents to share with managers at each stage.

**Architecture:** Add `approvalStage` field to Opportunity (new → pre_screening → ic_memo → approved / rejected). The "Send for Validation" dialog becomes a stage-advancement dialog — user picks documents to include and managers to review. The reviewer approves/rejects at the opportunity level, advancing or blocking the stage. Documents themselves no longer carry review state.

**Tech Stack:** React 19, TypeScript 5.9, Zustand 5, shadcn/ui, MSW 2, Tiptap

---

## File Structure

### Modified Files
1. `client/src/modules/deals/types.ts` — Add `ApprovalStage` type, update `Opportunity` interface
2. `client/src/modules/deals/api.ts` — Add `submitForApproval`, `updateApproval` API functions
3. `client/src/modules/deals/store.ts` — Add workspace action to update opportunity stage
4. `client/src/modules/deals/components/workspace/ValidationDialog.tsx` — Complete rewrite: stage-based approval dialog
5. `client/src/modules/deals/components/workspace/ReviewBanner.tsx` — Rewrite: show opportunity-level review status
6. `client/src/modules/deals/components/workspace/WorkspaceHeader.tsx` — Show current stage badge, update Shield icon behavior
7. `client/src/modules/deals/pages/OpportunityWorkspacePage.tsx` — Pass stage to header, wire new dialog
8. `client/src/api/mock/data/deals.ts` — Add `approvalStage` to opportunities, update review mock data
9. `client/src/api/mock/handlers.ts` — Rewrite review handlers for opportunity-level approval

---

### Task 1: Types & API Foundation

**Files:**
- Modify: `client/src/modules/deals/types.ts`
- Modify: `client/src/modules/deals/api.ts`

- [ ] **Step 1: Add ApprovalStage type and update Opportunity**

In `client/src/modules/deals/types.ts`, after the `PipelineStatus` line (line 88), add:

```typescript
export type ApprovalStage = 'new' | 'pre_screening' | 'ic_memo' | 'approved' | 'rejected'
```

In the `Opportunity` interface (line 98-116), add after `recommendation`:

```typescript
  approvalStage: ApprovalStage
```

Update the `DocumentReview` interface (line 202-212) to become an opportunity-level approval:

Replace the entire `DocumentReview` interface with:

```typescript
export interface ApprovalRequest {
  id: string
  opportunityId: string
  stage: ApprovalStage          // which stage this approval is for
  reviewerId: string
  requestedBy: string
  status: 'pending' | 'approved' | 'changes_requested'
  rationale: string | null
  documentIds: string[]         // documents shared for this approval
  requestedAt: string
  reviewedAt: string | null
}
```

Keep `ReviewDocumentItem` and `ReviewStatus` types for backward compat but they're no longer primary. Also remove the `DocumentStatus` values related to review — change:

```typescript
export type DocumentStatus = 'draft' | 'in_review' | 'approved'
```
to:
```typescript
export type DocumentStatus = 'draft' | 'final'
```

Documents are now either `draft` (editable) or `final` (locked/done). The review lifecycle is on the opportunity, not the document.

- [ ] **Step 2: Update API functions**

In `client/src/modules/deals/api.ts`, replace the Reviews section (lines 109-121) with:

```typescript
  // Approvals (opportunity-level)
  listApprovals: (opportunityId: string) =>
    api.get<ApprovalRequest[]>(`/deals/opportunities/${opportunityId}/approvals`),
  submitForApproval: (opportunityId: string, data: {
    stage: string
    reviewerIds: string[]
    documentIds: string[]
  }) =>
    api.post<ApprovalRequest[]>(`/deals/opportunities/${opportunityId}/approvals`, data),
  updateApproval: (opportunityId: string, approvalId: string, data: {
    status: string
    rationale?: string
  }) =>
    api.put<ApprovalRequest>(`/deals/opportunities/${opportunityId}/approvals/${approvalId}`, data),
```

Also update the import of `ApprovalRequest` from types at the top of the file — add it alongside the other type imports.

- [ ] **Step 3: Commit**

```bash
git add client/src/modules/deals/types.ts client/src/modules/deals/api.ts
git commit -m "feat(deals): add opportunity-level approval stage types and API"
```

---

### Task 2: Mock Data & Handlers

**Files:**
- Modify: `client/src/api/mock/data/deals.ts`
- Modify: `client/src/api/mock/handlers.ts`

- [ ] **Step 1: Update mock opportunities with approvalStage**

In `client/src/api/mock/data/deals.ts`, add `approvalStage` to each mock opportunity:

- `opp-abingworth-viii`: `approvalStage: 'pre_screening'` (actively in pre-screening)
- `opp-brep-x`: `approvalStage: 'ic_memo'` (advanced to IC memo stage)
- `opp-sequoia-growth`: `approvalStage: 'new'`
- `opp-infra-partners`: `approvalStage: 'new'`
- `opp-techbio-direct`: `approvalStage: 'rejected'`
- `opp-solar-fund`: `approvalStage: 'rejected'`

- [ ] **Step 2: Add mock approval requests**

Replace the `MOCK_REVIEWS` section with `MOCK_APPROVALS`:

```typescript
export interface MockApprovalRequest {
  id: string
  opportunityId: string
  stage: string
  reviewerId: string
  requestedBy: string
  status: 'pending' | 'approved' | 'changes_requested'
  rationale: string | null
  documentIds: string[]
  requestedAt: string
  reviewedAt: string | null
}

export const MOCK_APPROVALS: MockApprovalRequest[] = [
  {
    id: 'approval-1',
    opportunityId: 'opp-abingworth-viii',
    stage: 'pre_screening',
    reviewerId: 'user-usman',
    requestedBy: 'user-pine',
    status: 'pending',
    rationale: null,
    documentIds: ['doc-1', 'doc-2'],
    requestedAt: '2026-04-10T10:00:00Z',
    reviewedAt: null,
  },
  {
    id: 'approval-2',
    opportunityId: 'opp-brep-x',
    stage: 'pre_screening',
    reviewerId: 'user-pine',
    requestedBy: 'user-raoof',
    status: 'approved',
    rationale: 'Strong sponsor, attractive co-invest terms. Proceed to IC.',
    documentIds: [],
    requestedAt: '2026-03-20T09:00:00Z',
    reviewedAt: '2026-03-22T14:00:00Z',
  },
]
```

- [ ] **Step 3: Rewrite review MSW handlers for opportunity-level approvals**

In `client/src/api/mock/handlers.ts`, replace the reviews section (lines ~789-834) with:

```typescript
  // ── Deals: Approvals (Opportunity-Level) ─────────────────────────────

  http.get('/api/deals/opportunities/:oppId/approvals', async ({ params }) => {
    await delay(300)
    const { oppId } = params as { oppId: string }
    const result = approvals.filter(a => a.opportunityId === oppId)
    return HttpResponse.json(result)
  }),

  http.post('/api/deals/opportunities/:oppId/approvals', async ({ params, request }) => {
    await delay(400)
    const { oppId } = params as { oppId: string }
    const body = await request.json() as {
      stage: string
      reviewerIds: string[]
      documentIds: string[]
    }
    const now = new Date().toISOString()
    const created = body.reviewerIds.map(reviewerId => {
      const approval: MockApprovalRequest = {
        id: `approval-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        opportunityId: oppId as string,
        stage: body.stage,
        reviewerId,
        requestedBy: 'user-raoof',
        status: 'pending',
        rationale: null,
        documentIds: body.documentIds,
        requestedAt: now,
        reviewedAt: null,
      }
      approvals.push(approval)
      return approval
    })
    return HttpResponse.json(created, { status: 201 })
  }),

  http.put('/api/deals/opportunities/:oppId/approvals/:approvalId', async ({ params, request }) => {
    await delay(400)
    const { approvalId } = params as { approvalId: string }
    const body = await request.json() as { status: string; rationale?: string }
    const idx = approvals.findIndex(a => a.id === approvalId)
    if (idx === -1) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    const now = new Date().toISOString()
    approvals[idx] = {
      ...approvals[idx],
      status: body.status as 'approved' | 'changes_requested',
      rationale: body.rationale ?? null,
      reviewedAt: now,
    }
    // If approved, advance opportunity stage
    if (body.status === 'approved') {
      const oppIdx = opportunities.findIndex(o => o.id === approvals[idx].opportunityId)
      if (oppIdx !== -1) {
        const currentStage = (opportunities[oppIdx] as Record<string, unknown>).approvalStage as string
        if (currentStage === 'pre_screening') {
          (opportunities[oppIdx] as Record<string, unknown>).approvalStage = 'ic_memo'
        } else if (currentStage === 'ic_memo') {
          (opportunities[oppIdx] as Record<string, unknown>).approvalStage = 'approved'
        }
      }
    }
    return HttpResponse.json(approvals[idx])
  }),
```

Update the imports at top of handlers.ts to import `MOCK_APPROVALS` and `MockApprovalRequest` instead of `MOCK_REVIEWS`/`DocumentReview`. Create the mutable array: `const approvals = [...MOCK_APPROVALS]`.

- [ ] **Step 4: Commit**

```bash
git add client/src/api/mock/data/deals.ts client/src/api/mock/handlers.ts
git commit -m "feat(deals): opportunity-level approval mock data and handlers"
```

---

### Task 3: Store Updates

**Files:**
- Modify: `client/src/modules/deals/store.ts`

- [ ] **Step 1: Add approval state and actions to store**

In the store's workspace section, add:

```typescript
  workspaceApprovals: ApprovalRequest[]
```

Initialize to `[]` alongside other workspace state.

Update `fetchWorkspace` to also load approvals:
```typescript
const [opportunity, documents, sourceFiles, approvalsData] = await Promise.all([
  dealsApi.getOpportunity(opportunityId),
  dealsApi.listDocuments(opportunityId),
  dealsApi.listSourceFiles(opportunityId),
  dealsApi.listApprovals(opportunityId),
])
```

Add `workspaceApprovals: approvalsData` to the `set({...})` call.

Add an action to update the opportunity's approval stage locally:

```typescript
advanceApprovalStage: (newStage: ApprovalStage) => {
  const opp = get().activeOpportunity
  if (opp) {
    set({ activeOpportunity: { ...opp, approvalStage: newStage } })
  }
},
```

- [ ] **Step 2: Commit**

```bash
git add client/src/modules/deals/store.ts
git commit -m "feat(deals): add approval state and actions to workspace store"
```

---

### Task 4: Rewrite ValidationDialog as Stage Approval Dialog

**Files:**
- Modify: `client/src/modules/deals/components/workspace/ValidationDialog.tsx`

- [ ] **Step 1: Complete rewrite**

The dialog now shows:
1. **Current stage** and **next stage** it's being sent to
2. **Document picker** — select which documents to include with the approval request
3. **Manager picker** — select which managers should review (same as before, managers only)
4. Submit button says "Send for [Next Stage Name] Approval"

**Stage progression logic:**
- `new` → next is `pre_screening`, label "Pre-Screening"
- `pre_screening` → next is `ic_memo`, label "IC Memo"
- `ic_memo` → next is `approved`, label "Final Approval"
- `approved` / `rejected` → cannot send (button disabled)

**New props:**
```typescript
interface ValidationDialogProps {
  opportunityId: string
  currentStage: ApprovalStage
  documents: Document[]
  onClose: () => void
  onSubmitted: (approvals: ApprovalRequest[]) => void
}
```

**On submit:**
- Call `dealsApi.submitForApproval(opportunityId, { stage: nextStage, reviewerIds, documentIds })`
- Call `onSubmitted(result)` so the page can update store

The dialog should show a progress indicator at the top:
```
[Pre-Screening] → [IC Memo] → [Approved]
```
With the current stage highlighted and the next stage as the target.

- [ ] **Step 2: Commit**

```bash
git add client/src/modules/deals/components/workspace/ValidationDialog.tsx
git commit -m "feat(deals): rewrite validation dialog for opportunity-level stage approval"
```

---

### Task 5: Rewrite ReviewBanner for Opportunity-Level Approvals

**Files:**
- Modify: `client/src/modules/deals/components/workspace/ReviewBanner.tsx`

- [ ] **Step 1: Complete rewrite**

The banner now:
1. Fetches approvals for this opportunity from store (`workspaceApprovals`)
2. Filters to `pending` approvals where `reviewerId === currentUserId`
3. Shows: "This opportunity is pending [Stage Name] approval" with stage badge
4. Shows which documents were shared (as a comma-separated list of names)
5. Reviewer can: **Approve** (advances stage) or **Request Changes** (keeps current stage)
6. Both require rationale text

**On approve:**
- Call `dealsApi.updateApproval(oppId, approvalId, { status: 'approved', rationale })`
- If stage was `pre_screening` → opportunity advances to `ic_memo`
- If stage was `ic_memo` → opportunity advances to `approved`
- Update store via `advanceApprovalStage(nextStage)`

**On request changes:**
- Call `dealsApi.updateApproval(oppId, approvalId, { status: 'changes_requested', rationale })`
- Opportunity stays at current stage

**Props:**
```typescript
interface ReviewBannerProps {
  opportunityId: string
  approvals: ApprovalRequest[]
  currentUserId: string
  onApprovalUpdate: (approval: ApprovalRequest) => void
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/modules/deals/components/workspace/ReviewBanner.tsx
git commit -m "feat(deals): rewrite review banner for opportunity-level approvals"
```

---

### Task 6: Update WorkspaceHeader with Stage Badge

**Files:**
- Modify: `client/src/modules/deals/components/workspace/WorkspaceHeader.tsx`

- [ ] **Step 1: Add approval stage badge to header**

Add a new `approvalStage` display next to the pipeline status badge. Use a stepper-like display:

```
[Back] Abingworth VIII [Active] | [Strategy Fit: Strong] [Recommendation: Approve]
                                  [Pre-Screening ●──○ IC Memo ○──○ Approved]
```

The stage indicator is a small horizontal progress with dots:
- Completed stages: filled dot (green)
- Current stage: pulsing/active dot (blue)
- Future stages: empty dot (muted)
- Rejected: red X

This replaces the need for separate strategy fit / recommendation badges when the stage is active.

Update the `WorkspaceHeaderProps` to accept `approvalStage`:

```typescript
interface WorkspaceHeaderProps {
  opportunity: Opportunity
  activeDocument: Document | null
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onBack: () => void
  onValidate: () => void
  onShare: () => void
}
```

The `opportunity.approvalStage` is already on the Opportunity type, so no new prop needed — just read it from `opportunity.approvalStage`.

Stage colors:
- `new`: muted
- `pre_screening`: blue
- `ic_memo`: amber
- `approved`: green
- `rejected`: red

- [ ] **Step 2: Commit**

```bash
git add client/src/modules/deals/components/workspace/WorkspaceHeader.tsx
git commit -m "feat(deals): add approval stage progress indicator to workspace header"
```

---

### Task 7: Wire Everything in OpportunityWorkspacePage

**Files:**
- Modify: `client/src/modules/deals/pages/OpportunityWorkspacePage.tsx`

- [ ] **Step 1: Update page to use new approval system**

Changes:
1. Pass `currentStage` and `opportunityId` to `ValidationDialog`
2. Pass `approvals` and `onApprovalUpdate` to `ReviewBanner`
3. Handle `onSubmitted` from ValidationDialog to add approvals to store
4. The Shield icon in header should be disabled when stage is `approved` or `rejected`

```tsx
{showValidation && (
  <ValidationDialog
    opportunityId={opp.id}
    currentStage={opp.approvalStage}
    documents={store.workspaceDocuments}
    onClose={() => setShowValidation(false)}
    onSubmitted={(newApprovals) => {
      useDealsStore.setState({
        workspaceApprovals: [...store.workspaceApprovals, ...newApprovals],
      })
      setShowValidation(false)
    }}
  />
)}
```

```tsx
<ReviewBanner
  opportunityId={opp.id}
  approvals={store.workspaceApprovals}
  currentUserId="user-raoof"
  onApprovalUpdate={(updatedApproval) => {
    useDealsStore.setState({
      workspaceApprovals: store.workspaceApprovals.map(a =>
        a.id === updatedApproval.id ? updatedApproval : a
      ),
    })
    // Advance stage if approved
    if (updatedApproval.status === 'approved') {
      const nextStage = opp.approvalStage === 'pre_screening' ? 'ic_memo'
        : opp.approvalStage === 'ic_memo' ? 'approved'
        : opp.approvalStage
      store.advanceApprovalStage(nextStage)
    }
  }}
/>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/modules/deals/pages/OpportunityWorkspacePage.tsx
git commit -m "feat(deals): wire opportunity-level approval lifecycle into workspace page"
```

---

### Task 8: Cleanup & Build Verification

**Files:**
- Various

- [ ] **Step 1: Fix any remaining references to old DocumentReview/ReviewStatus**

Search for `DocumentReview` imports across the codebase and update to `ApprovalRequest` where needed. The old `DocumentReview` type should be kept temporarily as a type alias or removed if nothing uses it.

Remove `DocumentStatus: 'in_review'` references — documents are now `'draft'` or `'final'`.

Update mock document statuses: change any `status: 'in_review'` to `status: 'draft'` and `status: 'approved'` to `status: 'final'` in mock data.

- [ ] **Step 2: Run build**

```bash
cd client && pnpm build
```

Expected: Zero type errors, clean build.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "fix(deals): cleanup old document-level review references"
```

---

## Verification

1. `cd client && pnpm build` — zero type errors
2. `pnpm dev` — open any opportunity workspace:
   - Header shows approval stage progress (dots: Pre-Screening → IC Memo → Approved)
   - Click Shield icon → validation dialog shows current stage, next stage, document picker, manager picker
   - Submit sends for approval → banner appears for the reviewer
   - Reviewer approves → stage advances (Pre-Screening → IC Memo)
   - Reviewer requests changes → stage stays, rationale shown
   - Send again for IC Memo → approve → stage becomes Approved
   - Rejected opportunities show red stage indicator
