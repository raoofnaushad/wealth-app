# Invictus AI — Deals Module: Frontend Implementation Requirements

> **Version:** 1.0  
> **Date:** 2026-04-15  
> **Parent PRD:** [2026-04-15-deals-module-prd.md](2026-04-15-deals-module-prd.md)  
> **Status:** Draft  
> **Audience:** Frontend developers  

---

## Table of Contents

- [0. Implementation Context](#0-implementation-context)
- [1. Role-Based Development Setup](#1-role-based-development-setup)
- [2. Settings & Configuration](#2-settings--configuration)
- [3. Mandates](#3-mandates)
- [4. Email Hub](#4-email-hub)
- [5. Opportunities & Pipeline](#5-opportunities--pipeline)
- [6. Workspace](#6-workspace)
- [7. Collaboration & Sharing](#7-collaboration--sharing)
- [8. Asset Managers](#8-asset-managers)
- [9. News & Intelligence](#9-news--intelligence)
- [10. Dashboard](#10-dashboard)
- [11. Events & Tasks](#11-events--tasks)
- [12. Notification Panel](#12-notification-panel)
- [13. MSW Mock Specifications](#13-msw-mock-specifications)

---

## 0. Implementation Context

### 0.1 What Already Exists

The Deals module frontend is **~85% built**. This document focuses on **what needs to change, what's missing, and what needs to be added**. It does not re-describe working features.

**Working (no changes needed):**
- Dashboard page (pipeline summary, allocation overview, funnel, recent news)
- Opportunity list page (tab filters, table, create dialog)
- Asset manager list + detail pages (CRUD, search, filter, linked opportunities)
- Email hub (account connection, email list, preview, import, ignore)
- Settings > Snapshot configuration (investment type list, field editor, section reorder)
- Settings > Integrations (Gmail + Drive connection cards)
- Workspace > Snapshot panel (field editing, citations)
- Workspace > Document panel (TipTap editor)
- Workspace > Source file viewer + upload
- Workspace > Undo/redo system
- Workspace > Share dialog
- Workspace > Validation dialog
- Workspace > Review banner
- Mandate list page (tabs, create, card view)
- News page (feed, category tabs)

**Needs modification:**
- Dashboard — add flexible date range filter, team activity breakdown
- Opportunity list — add pipeline stage column, strategy fit hover tooltip, "Processing" status, "Top Matches" section
- Mandate detail — implement Matched Opportunities tab
- Workspace — add notes canvas, copilot panel with agent mode, comments system, re-process prompt on upload
- Settings — remove `required` toggle from snapshot fields, add Google Calendar card, add template preview/reset/create/delete
- News — add "Notify team member" action, enable daily report
- Sidebar — add Notifications badge + Events & Tasks nav item
- DealsLayout — add notification panel

**Completely new:**
- Events & Tasks page (new route, new page, new components)
- Notification panel (new component, new store slice, new mock handlers)
- Copilot panel with agent mode (new components)
- Notes canvas (new component)
- Role switcher for development/testing

### 0.2 Key Architecture Decisions

| Decision | Details |
|----------|---------|
| Editor | TipTap (already integrated). No OnlyOffice. |
| Notes | Custom simple canvas component (SVG/Canvas-based). Not Excalidraw. |
| Notifications | Deals-scoped panel in sidebar. Not platform-wide. |
| Sharing | Document-level only. Not opportunity-level. |
| Copilot agent mode | Suggest-and-accept with visual diff overlay. Not direct editing. |
| Calendar | Google Calendar API via OAuth. Full integration. |
| Tasks | Simple list (title + assignee + due date + done). No Kanban. |

### 0.3 File Structure Reference

All deals code lives in `client/src/modules/deals/`. Existing structure is correct per the PRD. New files to add:

```
client/src/modules/deals/
├── pages/
│   └── EventsTasksPage.tsx          ← NEW
├── components/
│   ├── workspace/
│   │   ├── NotesCanvas.tsx           ← NEW
│   │   ├── CopilotPanel.tsx          ← NEW
│   │   ├── AgentSuggestions.tsx       ← NEW
│   │   └── CommentThread.tsx          ← NEW
│   ├── events/
│   │   ├── EventForm.tsx              ← NEW
│   │   ├── EventList.tsx              ← NEW
│   │   └── CalendarSidebar.tsx        ← NEW
│   ├── tasks/
│   │   ├── TaskList.tsx               ← NEW
│   │   └── TaskForm.tsx               ← NEW
│   └── notifications/
│       └── NotificationPanel.tsx      ← NEW
```

---

## 1. Role-Based Development Setup

### 1.1 Dev Role Switcher

**Problem:** Currently, the mock login always assigns `DEFAULT_MODULE_ROLES` regardless of which email is entered. Developers cannot test different role perspectives without modifying code.

**Solution:** Add a development-only role switcher that lets developers quickly switch between Owner, Manager, and Analyst views.

**Implementation:**

1. **Update MSW login handler** (`client/src/api/mock/handlers.ts`):

When a user logs in with a mock email, look up the user in `MOCK_ORG_USERS` and return their actual `moduleRoles` instead of the hardcoded defaults.

```
Login as usman@watar.com  → all modules: owner
Login as raoof@watar.com  → admin: owner, deals: manager, engage: manager, insights: analyst
Login as john@watar.com   → deals: analyst, engage: analyst, insights: analyst
```

2. **Add dev role switcher component** (only in development):

A floating pill/dropdown in the bottom-right corner (visible only when `import.meta.env.DEV === true`) showing:
- Current user name + current deals role
- Quick-switch buttons: Owner | Manager | Analyst
- Clicking updates `useAuthStore.moduleRoles` for the `deals` module in-place (no re-login needed)

This lets developers rapidly test RBAC without logging in/out.

3. **Add three test user personas:**

| Persona | Email | Deals Role | Purpose |
|---------|-------|------------|---------|
| Sarah Chen | sarah@watar.com | `owner` | Tests owner-only features (settings, delete, approve) |
| Raoof Naushad | raoof@watar.com | `manager` | Tests manager features (approve, team view, mandate CRUD) |
| John Smith | john@watar.com | `analyst` | Tests analyst restrictions (own data only, no approve, no settings) |

### 1.2 Role-Aware Mock Data

**Problem:** MSW handlers currently return all data regardless of who's asking. An analyst should only see their own opportunities.

**Solution:** Update MSW handlers for role-scoped endpoints to filter responses based on the logged-in user's role:

**Opportunities list handler:**
```
If role = 'analyst':
  Return only opportunities where assignedTo === currentUserId
  OR opportunities that have documents shared with currentUserId
If role = 'manager' or 'owner':
  Return all opportunities
```

**Dashboard activity handler:**
```
If role = 'analyst':
  Return only "My Tasks" section (no team breakdown)
If role = 'manager' or 'owner':
  Return full dashboard with team activity section
```

**Tasks list handler:**
```
If role = 'analyst':
  Return only tasks where assigneeId === currentUserId OR createdBy === currentUserId
If role = 'manager' or 'owner':
  Return all tasks
```

**Mandate CRUD handlers:**
```
POST/PUT/DELETE mandates:
  If role = 'analyst': return 403
  If role = 'manager' or 'owner': allow
```

### 1.3 Role-Based UI Enforcement

Add role checks throughout the UI using the existing `useAuthStore.getModuleRole('deals')` helper:

**Pattern:**
```typescript
const dealsRole = useAuthStore((s) => s.getModuleRole('deals'))
const isOwner = dealsRole === 'owner'
const isManagerOrOwner = dealsRole === 'owner' || dealsRole === 'manager'
```

**Where to apply:**

| UI Element | Visible To | Hidden From |
|-----------|-----------|------------|
| Settings nav item | Owner | Manager, Analyst |
| "Create Mandate" button | Owner, Manager | Analyst |
| Mandate edit/delete actions | Owner, Manager | Analyst |
| "Approve" / "Reject" stage buttons in workspace | Owner, Manager | Analyst |
| "Delete Opportunity" action | Owner | Manager, Analyst |
| Dashboard > Team Activity section | Owner, Manager | Analyst |
| All Tasks filter tab | Owner, Manager | Analyst |
| News > "Generate News" button | Owner, Manager | Analyst |

**Route guard** — add a `ModuleRoleGuard` component:
```typescript
// Usage: <ModuleRoleGuard module="deals" minRole="owner"><SettingsPage /></ModuleRoleGuard>
// Role hierarchy: owner > manager > analyst
// If user's role is below minRole, render AccessDenied or redirect
```

Apply to:
- `/home/deals/settings` → requires `owner`
- All other `/home/deals/*` routes → requires any deals role

---

## 2. Settings & Configuration

### 2.1 Changes to Snapshot Configuration

**Remove the `required` toggle:**

Currently, `FieldConfigRow` renders a required/optional toggle for each field. Remove this UI element. The `required` property should be dropped from the field model entirely.

**Files to modify:**
- `components/settings/FieldConfigRow.tsx` — remove required toggle
- `types.ts` — remove `required` from `SnapshotField` interface
- `store.ts` — ensure create/update actions don't send `required`
- Mock data in `data/deals.ts` — remove `required` from all snapshot field objects

**Add "description" field:**

The current `SnapshotField` has `name`, `type`, `required`, `instruction`, `options`. Replace `required` with a visible `description` text field (short helper text shown under the field in the snapshot panel).

Updated `SnapshotField` interface:
```typescript
interface SnapshotField {
  name: string
  type: SnapshotFieldType
  description: string        // NEW — replaces required
  instruction: string
  options?: string[]
}
```

### 2.2 Changes to Document Templates

**Add missing template actions:**

The current template UI only supports list and edit. Add:

1. **"Create Custom Template" button** — opens a form with: name, document type (dropdown), prompt textarea. Creates a new template for the selected investment type.

2. **"Delete" action** on custom templates (not system templates). Confirm dialog before delete.

3. **"Reset to Default" button** on system templates. Calls `POST /api/v1/deals/settings/templates/:id/reset`. Confirm dialog ("This will overwrite your changes with the system default").

4. **"Preview" button** on each template. Calls `POST /api/v1/deals/settings/templates/:id/preview`. Returns sample generated content. Display in a read-only modal.

**MSW handlers to add:**
```
POST   /api/deals/settings/templates                      → Create template (return new template)
DELETE /api/deals/settings/templates/:id                   → Delete template (return 204)
POST   /api/deals/settings/templates/:id/reset             → Reset template (return updated template with default prompt)
POST   /api/deals/settings/templates/:id/preview           → Return { content: "Sample generated document..." }
```

### 2.3 Google Calendar Integration Card

**Add a third card** in the Integrations tab (after Gmail and Google Drive):

**Google Calendar card:**
- Status: Connected / Not Connected
- Connected email address (if connected)
- "Connect Calendar" / "Disconnect" button
- Same OAuth flow pattern as Gmail and Drive

**New type:**
```typescript
interface GoogleCalendarAccount {
  id: string
  userId: string
  emailAddress: string | null
  status: 'connected' | 'disconnected'
  createdAt: string
  updatedAt: string
}
```

**Store additions:**
```typescript
googleCalendarAccounts: GoogleCalendarAccount[]
fetchGoogleCalendarAccounts: () => Promise<void>
connectGoogleCalendar: (data: { emailAddress: string }) => Promise<void>
disconnectGoogleCalendar: (id: string) => Promise<void>
```

**MSW handlers:**
```
GET    /api/deals/integrations/google-calendar             → Return array of accounts (0 or 1)
POST   /api/deals/integrations/google-calendar             → Create account, return it
DELETE /api/deals/integrations/google-calendar/:id          → Delete account, return 204
```

**Mock data:**
```typescript
const MOCK_GOOGLE_CALENDAR_ACCOUNTS: GoogleCalendarAccount[] = [
  {
    id: 'gcal-1',
    userId: 'user-raoof',
    emailAddress: 'raoof@watar.com',
    status: 'connected',
    createdAt: '2026-03-15T10:00:00Z',
    updatedAt: '2026-04-10T14:30:00Z',
  },
]
```

---

## 3. Mandates

### 3.1 Mandate Detail — Matched Opportunities Tab

**Current state:** The Opportunities tab in `MandateDetailPage.tsx` shows a placeholder message.

**Required implementation:**

Replace the placeholder with a table of opportunities matched to this mandate:

**Columns:**
| Column | Source |
|--------|--------|
| Opportunity Name | opportunity.name (linked to workspace) |
| Investment Type | opportunity.investmentTypeName |
| Strategy Fit | mandate_fit.fitScore for this mandate (Strong/Moderate/Weak badge) |
| Fit Reasoning | mandate_fit.reasoning (shown on hover or in expandable row) |
| Pipeline Status | opportunity.pipelineStatus (badge) |
| Pipeline Stage | opportunity.pipelineStage (badge) |
| Date Received | opportunity.createdAt |

**Sorted by:** Strategy fit score (Strong first, then Moderate, then Weak).

**Data source:** New API endpoint `GET /api/v1/deals/mandates/:id/opportunities`.

**Store addition:**
```typescript
mandateOpportunities: Opportunity[]
isMandateOpportunitiesLoading: boolean
fetchMandateOpportunities: (mandateId: string) => Promise<void>
```

**MSW handler:**
```
GET /api/deals/mandates/:id/opportunities → Filter MOCK_OPPORTUNITIES where mandateFits contains a fit for this mandateId. Sort by fitScore.
```

**Mock data update:** Ensure at least 3-4 mock opportunities have `mandateFits` entries referencing the two existing mock mandate IDs, with a mix of Strong/Moderate/Weak scores and reasoning text.

### 3.2 Tag Input Behavior

**Verify existing behavior matches PRD:**

The mandate form should support tag-style inputs for:
- **Target Sectors** — type text, press comma or Enter to add as a tag
- **Geographic Focus** — same behavior
- **Investment Types** — dropdown multi-select from configured investment types

Each tag should have an X button to remove it.

If the current `MandateForm` does not use this pattern, update it to use a reusable `TagInput` component. If `TagInput` doesn't exist, create one in `components/ui/` or `components/shared/`.

### 3.3 RBAC Enforcement

- "Create Mandate" button: hidden for Analyst
- Edit/delete actions on mandate detail: hidden for Analyst
- Status change (Draft → Active → Closed): hidden for Analyst
- View-only mode for Analyst (all fields non-editable)

---

## 4. Email Hub

### 4.1 Minor Fixes

**Error handling TODOs:** Replace the 3 TODO comments in `EmailHubPage.tsx` (lines ~35, 44, 55) with toast notifications using the existing toast pattern from shadcn/ui.

**Unignore action:** Add an "Unignore" button on ignored emails (currently ignore is one-way). When clicked, set import status back to `new`.

**MSW handler to add:**
```
PUT /api/deals/emails/:id/unignore → Set importStatus back to 'new', return updated email
```

### 4.2 Re-process Prompt on Import

When an email is imported as an opportunity, show a brief processing indicator. The opportunity should appear in the list with `pipelineStatus: 'processing'` initially.

After a simulated delay (3-5 seconds in MSW), update the opportunity to `pipelineStatus: 'new'`, `pipelineStage: 'new'` with populated snapshot data.

**MSW behavior:**
```
POST /api/deals/emails/:id/import
  → Create opportunity with pipelineStatus: 'processing'
  → After 3s delay, update to pipelineStatus: 'new' (simulated background job)
  → Create a notification for the user: "Opportunity X finished processing"
```

---

## 5. Opportunities & Pipeline

### 5.1 Pipeline Stage Column

**Add a new column** to the opportunity table: **Pipeline Stage**.

Shows a badge with the current stage: New | Pre-Screening | Due Diligence | IC Review | Approved | Rejected.

**Badge colors:**
| Stage | Color |
|-------|-------|
| New | gray |
| Pre-Screening | blue |
| Due Diligence | amber |
| IC Review | purple |
| Approved | green |
| Rejected | red |

### 5.2 Strategy Fit Hover Tooltip

**Current state:** The `FitScoreBadge` component shows a badge. 

**Add a hover popover** (using shadcn `HoverCard` or `Tooltip`) that shows matched mandates:

```
Matched Mandates:
• Growth Equity 2026 — Strong Fit
  "Strong sector alignment, within allocation range"
• Real Assets Fund II — Moderate Fit
  "Geographic match but allocation nearing capacity"
```

Data source: `opportunity.mandateFits[]` — already in the type definition and mock data.

### 5.3 "Processing" Status

**Add `processing` to the `PipelineStatus` type:**
```typescript
export type PipelineStatus = 'processing' | 'new' | 'active' | 'archived' | 'ignored'
```

**PipelineStatusBadge** should render "Processing" with an animated spinner icon.

Processing opportunities should NOT appear in tab counts or the default list view (they are background-processing and not yet ready for review). Optionally, show a small "Processing (2)" indicator somewhere on the page.

### 5.4 "Top Matches" Section

When viewing the "New" tab, show a highlighted section at the top:

**"Top Matches"** — the top 3 opportunities ranked by:
1. Strongest mandate fit (any `mandateFits[].fitScore === 'strong'`)
2. Data completeness (count of non-empty snapshot fields)
3. Date received (newest first)

Show as 3 horizontal cards above the main table. Each card shows: opportunity name, asset manager, investment type, best fit score + mandate name.

### 5.5 Re-Process Prompt on Source Document Upload

When uploading a new source document to an **existing** opportunity (from the workspace), show a confirmation dialog:

**Dialog:**
```
New document uploaded: "pitch-deck-v2.pdf"

Would you like to re-process this opportunity with the newly uploaded documents?

[Yes, re-process]  [No, just store]
```

- "Yes, re-process" → calls `POST /api/v1/deals/opportunities/:id/process` → shows "Re-processing..." indicator
- "No, just store" → file is stored, no re-processing

**MSW handler:**
```
POST /api/deals/opportunities/:id/process → Simulate processing (3s delay), return updated opportunity with refreshed snapshotData
```

### 5.6 Mock Data Updates

Update mock opportunities to include:
- At least 1 opportunity with `pipelineStatus: 'processing'`
- All opportunities should have `pipelineStage` populated (currently some may be missing)
- Ensure `mandateFits` arrays have meaningful reasoning text
- Add `strategyFit` and `recommendation` fields to all opportunities

---

## 6. Workspace

### 6.1 Notes Canvas (NEW)

**Replace** the "Canvas notes coming soon" placeholder with a simple canvas component.

**Component:** `NotesCanvas.tsx`

**Technology:** Use a lightweight HTML Canvas or SVG-based drawing library. Recommended options (in order of preference):
1. **tldraw** (MIT, React-native, lightweight whiteboard) — best UX, but evaluate bundle size
2. **Custom SVG canvas** — if bundle size is a concern, build a minimal canvas with:
   - SVG-based rendering
   - Mouse/touch event handlers for drawing
   - State as JSON (serializable for save/load)
3. **react-canvas-draw** — simpler but limited features

**Required capabilities:**
- Freehand drawing (pen tool) with color picker (8 preset colors) and 3 thickness levels
- Rectangle, circle, and line/arrow shapes
- Text notes (click anywhere to place text, editable)
- Sticky notes (colored rectangles with text inside, draggable)
- Image placement (paste or upload)
- Pan (click + drag on empty space) and zoom (scroll wheel)
- Eraser tool
- Select and move elements
- Undo / redo (integrate with workspace undo stack)

**Persistence:**
- Canvas state serialized as JSON
- Auto-save on changes (debounced 2 seconds)
- API: `PUT /api/v1/deals/opportunities/:id/notes` with JSON body
- Load: `GET /api/v1/deals/opportunities/:id/notes`

**Type:**
```typescript
interface OpportunityNotes {
  id: string
  opportunityId: string
  canvasData: Record<string, unknown>   // Canvas state JSON
  updatedBy: string
  updatedAt: string
}
```

**MSW handlers:**
```
GET /api/deals/opportunities/:id/notes → Return saved canvas state (or empty default)
PUT /api/deals/opportunities/:id/notes → Save canvas state, return updated
```

**Mock data:** Start with an empty canvas state `{ canvasData: {} }`.

### 6.2 Copilot Panel (NEW)

**Component:** `CopilotPanel.tsx`

A collapsible right-side panel in the workspace for AI chat and agent mode.

**Layout:**
```
+-------------------------------------------+
| Copilot                    [Agent Mode ○]  |
|  [collapse button]                         |
+-------------------------------------------+
|                                            |
|  Chat messages                             |
|  ...                                       |
|                                            |
+-------------------------------------------+
| [Type a message...]           [Send]       |
+-------------------------------------------+
```

**Standard mode (default):**
- Chat interface with message history
- User sends message → API call → AI response (streamed or complete)
- Context-aware: system prompt includes current opportunity name, snapshot data summary, document list
- Messages persist per opportunity (stored in state, not necessarily persisted to backend in v1)

**Agent mode (toggle):**
- When toggled ON, the copilot header shows "Agent Mode" with a highlighted indicator
- User can type instructions like "Add an ESG section" or "Summarize the risk factors"
- Response is NOT shown as a chat message — instead, it's shown as a **diff overlay** on the active TipTap document

**Component:** `AgentSuggestions.tsx`

Renders the suggested changes as a visual diff on the TipTap editor:
- **Insertions:** highlighted in light green background
- **Deletions:** highlighted in light red background with strikethrough
- **Action bar** at the top of the diff: "Accept All" | "Reject All"
- **Per-change actions:** each insertion/deletion block has small accept/reject buttons on hover
- Accepted changes are applied to the document and added to the undo stack
- Rejected changes are discarded

**MSW handlers:**
```
POST /api/deals/opportunities/:id/copilot/chat
  Body: { message: string, mode: 'standard' | 'agent', documentId?: string }
  Response (standard mode): { response: "The target IRR for this fund is..." }
  Response (agent mode): { suggestions: [{ type: 'insert', position: 'after:section-3', content: '...' }, { type: 'replace', from: 100, to: 200, content: '...' }] }
```

**Mock responses:** Create 3-4 canned responses for common queries:
- "What is the target IRR?" → returns a summary from snapshot data
- "Summarize the risk factors" → returns a risk summary paragraph
- Agent mode: "Add an ESG section" → returns an insertion suggestion with 2-3 paragraphs of ESG content
- Agent mode: "Improve the executive summary" → returns replacement suggestions for the first section

### 6.3 Comments System (NEW)

**Component:** `CommentThread.tsx`

Add commenting to deliverables (TipTap documents).

**Inline comments:**
1. User selects text in the TipTap editor
2. A floating "Add Comment" button appears (or use a toolbar button)
3. Clicking opens a small input field anchored to the selection
4. User types comment and submits
5. Selected text is highlighted with a colored background
6. Clicking the highlight opens the comment thread in a right sidebar panel

**General comments:**
- A "Comments" section below the document (or in a tab next to the document)
- Simple threaded list: each comment shows author avatar, name, timestamp, content
- Reply button per comment
- Resolve button (author or Manager/Owner) — collapses the thread and dims the highlight

**Types:**
```typescript
interface DocumentComment {
  id: string
  documentId: string
  parentId: string | null      // null = top-level, set = reply
  authorId: string
  authorName: string
  content: string
  textRange: { from: number; to: number } | null  // null = general comment
  resolved: boolean
  resolvedBy: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}
```

**Store additions:**
```typescript
workspaceComments: DocumentComment[]
fetchComments: (documentId: string) => Promise<void>
addComment: (documentId: string, data: { content: string; parentId?: string; textRange?: { from: number; to: number } }) => Promise<void>
resolveComment: (documentId: string, commentId: string) => Promise<void>
```

**MSW handlers:**
```
GET    /api/deals/documents/:docId/comments        → Return array of comments
POST   /api/deals/documents/:docId/comments        → Create comment, return it
PUT    /api/deals/documents/:docId/comments/:id     → Update (resolve)
DELETE /api/deals/documents/:docId/comments/:id     → Delete
```

**Mock data:** Create 3-4 sample comments on the first mock document:
- 1 inline comment (with textRange) from user-raoof
- 1 reply to that comment from user-usman
- 1 general comment from user-john
- 1 resolved comment

**Notification integration:** When a comment is added, create a notification for the document owner and all shared users (see section 12).

### 6.4 Document Export

**Add export buttons** to the workspace action bar:

- "Download as PDF" → `POST /api/v1/deals/opportunities/:id/documents/:docId/export?format=pdf`
- "Download as Word" → `POST /api/v1/deals/opportunities/:id/documents/:docId/export?format=docx`

**MSW handlers:**
```
POST /api/deals/opportunities/:oppId/documents/:docId/export
  Query: format=pdf or format=docx
  Response: Return a Blob with appropriate content-type header
  (For mock: return a simple text blob. Real implementation will use a backend conversion service.)
```

**Frontend behavior:**
- Show a loading spinner on the button while export is processing
- On success, trigger browser download with the file

### 6.5 Workspace Layout Update

**Full-screen toggle:**
The workspace already collapses the global sidebar. Verify this behavior works correctly and add:

- A **collapse/expand button** for the workspace left panel (deliverables/notes/files tree)
- When collapsed, show only icons for each section
- Remember collapse state in session (not persisted)

**Header updates:**
Add to the workspace header:
- **Pipeline Stage badge** (already exists as approval stage) — make it a dropdown for Manager/Owner to change stage
- **Strategy Fit** indicator — show best fit score with hover for details
- **Recommendation** indicator — Pass / Approve / Watch

---

## 7. Collaboration & Sharing

### 7.1 Share Permission Update

**Current state:** `DocumentShare` has `permission: 'comment' | 'view'`.

**Update to:** `permission: 'read' | 'read_write'` per the PRD.

```typescript
interface DocumentShare {
  id: string
  documentId: string
  sharedWith: string
  sharedBy: string
  permission: 'read' | 'read_write'  // Changed from 'comment' | 'view'
  createdAt: string
}
```

**Update ShareDialog:**
- Change permission labels: "View" → "Read", "Comment" → "Read/Write"
- Read: can view document + add comments, cannot edit content
- Read/Write: can view, edit, and comment

**Update MSW handlers:** Reflect new permission values in mock data and handlers.

### 7.2 Validation Workflow Enhancements

**Verify existing flow matches PRD:**
1. User clicks "Send for Validation" → selects documents + reviewer (Manager/Owner only in dropdown)
2. Reviewer receives notification
3. Reviewer opens documents in read-only mode with comment capability
4. Reviewer can: Approve or Request Changes (with rationale text)
5. On Approve: trigger rationale generation

**Add rationale generation:**

When a reviewer clicks "Approve":
1. Show a loading state: "Generating approval rationale..."
2. Call `POST /api/v1/deals/reviews/:id/generate-rationale`
3. Show generated rationale in an editable textarea
4. Reviewer can edit the rationale
5. Click "Finalize Approval" → calls `PUT /api/v1/deals/reviews/:id` with `{ status: 'approved', rationale: '...' }`

**MSW handlers:**
```
POST /api/deals/reviews/:id/generate-rationale
  Response: { rationale: "Based on the review discussion, the following key points were addressed: ..." }
```

---

## 8. Asset Managers

### 8.1 No Major Changes

The asset manager pages are feature-complete. Minor items:

- **Delete restriction:** Hide delete button for non-Owner roles
- **Auto-creation badge:** Ensure system-created managers show "Auto-created" badge vs. manually created ones

---

## 9. News & Intelligence

### 9.1 "Notify Team Member" Action

Add a **"Notify" button** on each news card.

**Flow:**
1. Click "Notify" on a news item
2. Small popover or dialog appears:
   - "Send to:" — search/select a team member
   - "Message (optional):" — text input
   - "Send" button
3. On send: `POST /api/v1/deals/news/:id/notify` with `{ sentTo: userId, message?: string }`
4. Creates a notification for the recipient (see section 12)
5. Show toast: "Notification sent to [name]"

**MSW handler:**
```
POST /api/deals/news/:id/notify
  Body: { sentTo: string, message?: string }
  Response: { success: true }
  Side effect: Add to MOCK_NOTIFICATIONS array
```

### 9.2 Enable Daily Report Button

**Current state:** `DailyReportButton` is disabled with "Coming soon" tooltip.

**Update:** Enable the button. On click:
1. Show loading: "Generating daily report..."
2. Call `POST /api/v1/deals/news/daily-report`
3. Trigger browser download of the generated report

**MSW handler:**
```
POST /api/deals/news/daily-report → Return a text blob (mock report content)
```

---

## 10. Dashboard

### 10.1 Flexible Date Range Filter

**Add a filter bar** at the top of the dashboard:

**Presets (as pills/buttons):**
- This Quarter (default, highlighted)
- Last Quarter
- Year to Date
- Last 12 Months

**Custom range:**
- "Custom" button → opens start date / end date pickers (shadcn `DatePicker`)

**Behavior:**
- Selected range is passed as `from` and `to` query params to all dashboard API calls
- All dashboard sections filter by the selected range
- Active preset is visually highlighted

**Store addition:**
```typescript
dashboardDateRange: { from: string; to: string; preset: string }
setDashboardDateRange: (range: { from: string; to: string; preset: string }) => void
```

**API update:**
```
GET /api/deals/dashboard/summary?from=2026-01-01&to=2026-03-31
GET /api/deals/dashboard/funnel?from=2026-01-01&to=2026-03-31
GET /api/deals/dashboard/activity?from=2026-01-01&to=2026-03-31
```

**MSW handlers:** Existing `GET /api/deals/dashboard/summary` handler should accept `from` and `to` params. For mock, return the same data regardless of range (filtering is a backend concern).

### 10.2 Team Activity Section

**Add a new dashboard component:** `TeamActivity.tsx`

**Visible to:** Manager and Owner only.

**Layout:**
- Section header: "Team Activity"
- Per team member row:
  - User avatar + name
  - Number of active opportunities
  - Number of documents created (in period)
  - Number of reviews completed (in period)
  - Last activity timestamp

**Data source:** New API endpoint `GET /api/v1/deals/dashboard/activity`.

**MSW handler:**
```
GET /api/deals/dashboard/activity
  Response: {
    teamMembers: [
      { userId: 'user-john', name: 'John Smith', activeOpportunities: 4, documentsCreated: 7, reviewsCompleted: 2, lastActivity: '2026-04-15T09:30:00Z' },
      { userId: 'user-raoof', name: 'Raoof Naushad', activeOpportunities: 6, documentsCreated: 12, reviewsCompleted: 5, lastActivity: '2026-04-15T10:15:00Z' },
    ]
  }
```

**RBAC:** Only render this section if `dealsRole === 'owner' || dealsRole === 'manager'`.

### 10.3 Pipeline Funnel Enhancement

**Current state:** The funnel shows pipeline by status.

**Add:** A second funnel view showing pipeline by **stage** (New → Pre-Screening → Due Diligence → IC Review → Approved). Show counts and conversion rates between stages.

**Toggle:** Two view modes on the funnel chart — "By Status" (existing) and "By Stage" (new).

**MSW handler update:**
```
GET /api/deals/dashboard/funnel
  Response: {
    byStatus: [{ status: 'new', count: 12 }, ...],
    byStage: [
      { stage: 'new', count: 12 },
      { stage: 'pre_screening', count: 8 },
      { stage: 'due_diligence', count: 5 },
      { stage: 'ic_review', count: 3 },
      { stage: 'approved', count: 2 },
      { stage: 'rejected', count: 1 },
    ]
  }
```

---

## 11. Events & Tasks (NEW)

### 11.1 New Route & Page

**Route:** `/home/deals/events`  
**Page:** `EventsTasksPage.tsx`  
**Nav item:** Add "Events & Tasks" to the deals sidebar nav (between "News" and "Settings")

### 11.2 Page Layout

```
+------------------------------------------------------------------+
| Events & Tasks                                                     |
+---------------------------+--------------------------------------+
|                           |                                      |
|  LEFT PANEL               |  RIGHT PANEL                         |
|                           |                                      |
|  Tab: Events | Tasks      |  Calendar Widget                     |
|                           |  (week or month view)                |
|  [Events list or          |                                      |
|   Tasks list based on     |  Upcoming events shown               |
|   active tab]             |  Click date to see events            |
|                           |                                      |
+---------------------------+--------------------------------------+
```

### 11.3 Events Tab

**Event list:**
- Table with columns: Title, Date/Time, Attendees (avatar stack), Linked Opportunity, Created By
- "Create Event" button
- Sort by date (upcoming first)
- Filter by: This Week | This Month | All

**Create Event form (dialog):**
| Field | Type | Required |
|-------|------|----------|
| Title | text | Yes |
| Start Date & Time | datetime picker | Yes |
| End Date & Time | datetime picker | No (defaults to start + 1 hour) |
| Description | textarea | No |
| Attendees | multi-select (team members) | No |
| Linked Opportunity | select (opportunities dropdown) | No |
| Location | text | No |

**On save:**
- Creates event in platform
- MSW simulates Google Calendar creation (if calendar connected)
- Shows toast: "Event created" (+ "and added to Google Calendar" if connected)

### 11.4 Tasks Tab

**Task list:**
- Simple list with columns: Done (checkbox), Title, Assignee (avatar + name), Due Date, Linked Opportunity
- Filter tabs: My Tasks | Assigned by Me | All Tasks (Manager/Owner only)
- Overdue tasks: due date shown in red, row has red-tinted background
- Checking "Done" toggles the task immediately (optimistic update)

**Create Task form (inline or dialog):**
| Field | Type | Required |
|-------|------|----------|
| Title | text | Yes |
| Assignee | select (team members) | Yes |
| Due Date | date picker | No |
| Linked Opportunity | select (opportunities dropdown) | No |

**On save:**
- Creates task
- Creates notification for assignee: "You have been assigned a task: [title]"

### 11.5 Calendar Sidebar Widget

**Right panel:** A calendar widget showing:
- Month view with dots on dates that have events
- Click a date to see that day's events listed below the calendar
- Upcoming events list (next 5 events)

Use shadcn's `Calendar` component as the base, with event indicators.

### 11.6 Types

```typescript
interface DealEvent {
  id: string
  title: string
  description: string | null
  startAt: string
  endAt: string | null
  location: string | null
  opportunityId: string | null
  opportunityName: string | null
  googleEventId: string | null
  attendees: EventAttendee[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

interface EventAttendee {
  id: string
  userId: string
  name: string
  email: string
  rsvpStatus: 'pending' | 'accepted' | 'declined' | 'tentative'
}

interface DealTask {
  id: string
  title: string
  assigneeId: string
  assigneeName: string
  dueDate: string | null
  done: boolean
  opportunityId: string | null
  opportunityName: string | null
  createdBy: string
  createdByName: string
  createdAt: string
  updatedAt: string
}
```

### 11.7 Store Additions

```typescript
// Add to useDealsStore
events: DealEvent[]
tasks: DealTask[]
isEventsLoading: boolean
isTasksLoading: boolean

fetchEvents: (params?: { from?: string; to?: string }) => Promise<void>
createEvent: (data: CreateEventData) => Promise<DealEvent>
updateEvent: (id: string, data: Partial<DealEvent>) => Promise<DealEvent>
deleteEvent: (id: string) => Promise<void>

fetchTasks: (params?: { assigneeId?: string; done?: boolean }) => Promise<void>
createTask: (data: CreateTaskData) => Promise<DealTask>
updateTask: (id: string, data: Partial<DealTask>) => Promise<DealTask>
deleteTask: (id: string) => Promise<void>
```

### 11.8 MSW Handlers

```
GET    /api/deals/events?from=&to=             → Return mock events
POST   /api/deals/events                       → Create event, return it
GET    /api/deals/events/:id                   → Return single event
PUT    /api/deals/events/:id                   → Update event
DELETE /api/deals/events/:id                   → Delete event

GET    /api/deals/tasks?assigneeId=&done=      → Return mock tasks (filtered)
POST   /api/deals/tasks                        → Create task, return it
PUT    /api/deals/tasks/:id                    → Update task (toggle done, reassign)
DELETE /api/deals/tasks/:id                    → Delete task
```

### 11.9 Mock Data

```typescript
const MOCK_EVENTS: DealEvent[] = [
  {
    id: 'event-1',
    title: 'IC Review — Abingworth Bioventures VIII',
    description: 'Investment Committee review of the Abingworth fund opportunity',
    startAt: '2026-04-18T14:00:00Z',
    endAt: '2026-04-18T15:30:00Z',
    location: 'Conference Room A / Google Meet',
    opportunityId: 'opp-1',
    opportunityName: 'Abingworth Bioventures VIII',
    googleEventId: 'gcal-evt-abc123',
    attendees: [
      { id: 'att-1', userId: 'user-raoof', name: 'Raoof Naushad', email: 'raoof@watar.com', rsvpStatus: 'accepted' },
      { id: 'att-2', userId: 'user-usman', name: 'Usman Khan', email: 'usman@watar.com', rsvpStatus: 'pending' },
      { id: 'att-3', userId: 'user-john', name: 'John Smith', email: 'john@watar.com', rsvpStatus: 'accepted' },
    ],
    createdBy: 'user-raoof',
    createdAt: '2026-04-10T10:00:00Z',
    updatedAt: '2026-04-10T10:00:00Z',
  },
  {
    id: 'event-2',
    title: 'Weekly Deal Pipeline Review',
    description: 'Review all active pipeline opportunities and priorities',
    startAt: '2026-04-21T10:00:00Z',
    endAt: '2026-04-21T11:00:00Z',
    location: null,
    opportunityId: null,
    opportunityName: null,
    googleEventId: null,
    attendees: [
      { id: 'att-4', userId: 'user-raoof', name: 'Raoof Naushad', email: 'raoof@watar.com', rsvpStatus: 'accepted' },
      { id: 'att-5', userId: 'user-john', name: 'John Smith', email: 'john@watar.com', rsvpStatus: 'tentative' },
    ],
    createdBy: 'user-usman',
    createdAt: '2026-04-08T09:00:00Z',
    updatedAt: '2026-04-08T09:00:00Z',
  },
  {
    id: 'event-3',
    title: 'Blackstone BREP X — Final Due Diligence Call',
    description: 'Due diligence call with Blackstone team regarding co-investment terms',
    startAt: '2026-04-22T16:00:00Z',
    endAt: '2026-04-22T17:00:00Z',
    location: 'Zoom',
    opportunityId: 'opp-2',
    opportunityName: 'Blackstone BREP X Co-Invest',
    googleEventId: 'gcal-evt-def456',
    attendees: [
      { id: 'att-6', userId: 'user-usman', name: 'Usman Khan', email: 'usman@watar.com', rsvpStatus: 'accepted' },
    ],
    createdBy: 'user-usman',
    createdAt: '2026-04-12T14:00:00Z',
    updatedAt: '2026-04-12T14:00:00Z',
  },
]

const MOCK_TASKS: DealTask[] = [
  {
    id: 'task-1',
    title: 'Complete pre-screening report for Abingworth',
    assigneeId: 'user-john',
    assigneeName: 'John Smith',
    dueDate: '2026-04-17',
    done: false,
    opportunityId: 'opp-1',
    opportunityName: 'Abingworth Bioventures VIII',
    createdBy: 'user-raoof',
    createdByName: 'Raoof Naushad',
    createdAt: '2026-04-14T09:00:00Z',
    updatedAt: '2026-04-14T09:00:00Z',
  },
  {
    id: 'task-2',
    title: 'Review GIP Infrastructure DDQ responses',
    assigneeId: 'user-raoof',
    assigneeName: 'Raoof Naushad',
    dueDate: '2026-04-20',
    done: false,
    opportunityId: 'opp-4',
    opportunityName: 'GIP Infrastructure Fund V',
    createdBy: 'user-usman',
    createdByName: 'Usman Khan',
    createdAt: '2026-04-13T11:00:00Z',
    updatedAt: '2026-04-13T11:00:00Z',
  },
  {
    id: 'task-3',
    title: 'Upload Sequoia Growth Fund term sheet',
    assigneeId: 'user-john',
    assigneeName: 'John Smith',
    dueDate: '2026-04-16',
    done: false,
    opportunityId: 'opp-3',
    opportunityName: 'Sequoia Growth Fund',
    createdBy: 'user-raoof',
    createdByName: 'Raoof Naushad',
    createdAt: '2026-04-12T08:00:00Z',
    updatedAt: '2026-04-12T08:00:00Z',
  },
  {
    id: 'task-4',
    title: 'Send mandate update to LP advisory board',
    assigneeId: 'user-usman',
    assigneeName: 'Usman Khan',
    dueDate: '2026-04-15',
    done: true,
    opportunityId: null,
    opportunityName: null,
    createdBy: 'user-usman',
    createdByName: 'Usman Khan',
    createdAt: '2026-04-10T10:00:00Z',
    updatedAt: '2026-04-15T08:30:00Z',
  },
  {
    id: 'task-5',
    title: 'Follow up with Clean Energy Fund III team on data room access',
    assigneeId: 'user-john',
    assigneeName: 'John Smith',
    dueDate: '2026-04-14',
    done: false,
    opportunityId: 'opp-6',
    opportunityName: 'Clean Energy Fund III',
    createdBy: 'user-raoof',
    createdByName: 'Raoof Naushad',
    createdAt: '2026-04-11T15:00:00Z',
    updatedAt: '2026-04-11T15:00:00Z',
  },
]
```

---

## 12. Notification Panel (NEW)

### 12.1 Component

**Component:** `NotificationPanel.tsx`

A panel that slides in from the sidebar (or opens as a dropdown from the notification bell icon).

**Sidebar nav update:** Add a "Notifications" item at the bottom of the deals sidebar with an unread badge count.

### 12.2 Layout

```
+-----------------------------------+
| Notifications              [Mark all read]
+-----------------------------------+
| TODAY                             |
|                                   |
| [avatar] John commented on        |
| "Investment Memo"                 |
| 10 minutes ago                    |
|                                   |
| [avatar] Usman approved your      |
| validation request                |
| 2 hours ago                       |
|                                   |
| YESTERDAY                         |
|                                   |
| [avatar] New task assigned:        |
| "Complete pre-screening report"   |
| Yesterday at 3:00 PM             |
|                                   |
+-----------------------------------+
```

### 12.3 Notification Types

| Type | Icon | Title Template | Link |
|------|------|---------------|------|
| `comment_added` | MessageSquare | "[Name] commented on [document]" | → workspace document |
| `comment_reply` | Reply | "[Name] replied to your comment on [document]" | → workspace document |
| `review_requested` | FileCheck | "[Name] requested your review on [documents]" | → review page |
| `review_completed` | CheckCircle | "[Name] approved/requested changes on [documents]" | → review page |
| `document_shared` | Share2 | "[Name] shared [document] with you" | → workspace document |
| `news_notification` | Newspaper | "[Name] flagged a news item: [headline]" | → news item |
| `task_assigned` | ListTodo | "New task: [title]" | → events page |
| `task_overdue` | AlertCircle | "Overdue: [title]" | → events page |
| `processing_complete` | CheckCircle2 | "Opportunity [name] finished processing" | → opportunity |
| `stage_changed` | ArrowRight | "[Opportunity] moved to [stage]" | → opportunity |

### 12.4 Types

```typescript
type NotificationType =
  | 'comment_added'
  | 'comment_reply'
  | 'review_requested'
  | 'review_completed'
  | 'document_shared'
  | 'news_notification'
  | 'task_assigned'
  | 'task_overdue'
  | 'processing_complete'
  | 'stage_changed'

interface DealNotification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string | null
  link: string                    // deep link to relevant page
  relatedId: string | null        // ID of related entity
  read: boolean
  createdAt: string
}
```

### 12.5 Store Additions

```typescript
notifications: DealNotification[]
unreadNotificationCount: number
isNotificationsLoading: boolean

fetchNotifications: (unreadOnly?: boolean) => Promise<void>
fetchUnreadCount: () => Promise<void>
markAsRead: (notificationId: string) => Promise<void>
markAllAsRead: () => Promise<void>
```

### 12.6 MSW Handlers

```
GET    /api/deals/notifications?unreadOnly=true   → Return filtered notifications
GET    /api/deals/notifications/count             → Return { count: N }
PUT    /api/deals/notifications/:id/read          → Mark as read, return 204
PUT    /api/deals/notifications/read-all          → Mark all as read, return 204
```

### 12.7 Mock Data

```typescript
const MOCK_NOTIFICATIONS: DealNotification[] = [
  {
    id: 'notif-1',
    userId: 'user-raoof',
    type: 'comment_added',
    title: 'John Smith commented on "Investment Memo"',
    message: 'Can we add more detail on the fee structure?',
    link: '/home/deals/opportunities/opp-1',
    relatedId: 'doc-1',
    read: false,
    createdAt: '2026-04-15T09:30:00Z',
  },
  {
    id: 'notif-2',
    userId: 'user-raoof',
    type: 'review_completed',
    title: 'Usman Khan approved your validation request',
    message: 'Approved with minor comments. Rationale attached.',
    link: '/home/deals/opportunities/opp-2',
    relatedId: 'review-1',
    read: false,
    createdAt: '2026-04-15T08:00:00Z',
  },
  {
    id: 'notif-3',
    userId: 'user-raoof',
    type: 'task_assigned',
    title: 'New task: Review GIP Infrastructure DDQ responses',
    message: null,
    link: '/home/deals/events',
    relatedId: 'task-2',
    read: false,
    createdAt: '2026-04-13T11:00:00Z',
  },
  {
    id: 'notif-4',
    userId: 'user-raoof',
    type: 'processing_complete',
    title: 'Opportunity "Sequoia Growth Fund" finished processing',
    message: 'Snapshot data extracted from 3 source documents.',
    link: '/home/deals/opportunities/opp-3',
    relatedId: 'opp-3',
    read: true,
    createdAt: '2026-04-12T16:00:00Z',
  },
  {
    id: 'notif-5',
    userId: 'user-raoof',
    type: 'news_notification',
    title: 'Usman Khan flagged: "Blackstone Raises $30.4B for Latest Real Estate Fund"',
    message: 'Relevant to BREP X co-investment opportunity',
    link: '/home/deals/news',
    relatedId: 'news-1',
    read: true,
    createdAt: '2026-04-11T14:00:00Z',
  },
  {
    id: 'notif-6',
    userId: 'user-raoof',
    type: 'stage_changed',
    title: 'Abingworth Bioventures VIII moved to IC Review',
    message: null,
    link: '/home/deals/opportunities/opp-1',
    relatedId: 'opp-1',
    read: true,
    createdAt: '2026-04-10T11:00:00Z',
  },
  // Notifications for John (analyst)
  {
    id: 'notif-7',
    userId: 'user-john',
    type: 'task_assigned',
    title: 'New task: Complete pre-screening report for Abingworth',
    message: null,
    link: '/home/deals/events',
    relatedId: 'task-1',
    read: false,
    createdAt: '2026-04-14T09:00:00Z',
  },
  {
    id: 'notif-8',
    userId: 'user-john',
    type: 'document_shared',
    title: 'Raoof Naushad shared "Due Diligence Report" with you',
    message: null,
    link: '/home/deals/opportunities/opp-1',
    relatedId: 'doc-2',
    read: false,
    createdAt: '2026-04-13T15:00:00Z',
  },
  {
    id: 'notif-9',
    userId: 'user-john',
    type: 'task_overdue',
    title: 'Overdue: Follow up with Clean Energy Fund III team',
    message: 'Due date was April 14',
    link: '/home/deals/events',
    relatedId: 'task-5',
    read: false,
    createdAt: '2026-04-15T00:00:00Z',
  },
]
```

**Handler behavior:** Filter notifications by `userId` matching the currently logged-in user. This makes role-switching automatically show different notification sets.

---

## 13. MSW Mock Specifications

### 13.1 Complete Handler List

Summary of **all new MSW handlers** to add (existing handlers that need no changes are not listed):

**Settings — Templates (new handlers):**
| Method | Path | Response |
|--------|------|----------|
| POST | `/api/deals/settings/templates` | Created template |
| DELETE | `/api/deals/settings/templates/:id` | 204 |
| POST | `/api/deals/settings/templates/:id/reset` | Template with default prompt |
| POST | `/api/deals/settings/templates/:id/preview` | `{ content: "Sample..." }` |

**Settings — Google Calendar (new):**
| Method | Path | Response |
|--------|------|----------|
| GET | `/api/deals/integrations/google-calendar` | Array of accounts |
| POST | `/api/deals/integrations/google-calendar` | Created account |
| DELETE | `/api/deals/integrations/google-calendar/:id` | 204 |

**Mandates (new handler):**
| Method | Path | Response |
|--------|------|----------|
| GET | `/api/deals/mandates/:id/opportunities` | Filtered + sorted opportunities |

**Emails (new handler):**
| Method | Path | Response |
|--------|------|----------|
| PUT | `/api/deals/emails/:id/unignore` | Updated email |

**Opportunities (new handler):**
| Method | Path | Response |
|--------|------|----------|
| POST | `/api/deals/opportunities/:id/process` | Updated opportunity (after delay) |

**Workspace — Notes (new):**
| Method | Path | Response |
|--------|------|----------|
| GET | `/api/deals/opportunities/:id/notes` | Notes canvas state |
| PUT | `/api/deals/opportunities/:id/notes` | Updated notes |

**Workspace — Comments (new):**
| Method | Path | Response |
|--------|------|----------|
| GET | `/api/deals/documents/:docId/comments` | Array of comments |
| POST | `/api/deals/documents/:docId/comments` | Created comment |
| PUT | `/api/deals/documents/:docId/comments/:id` | Updated comment |
| DELETE | `/api/deals/documents/:docId/comments/:id` | 204 |

**Workspace — Export (new):**
| Method | Path | Response |
|--------|------|----------|
| POST | `/api/deals/opportunities/:oppId/documents/:docId/export` | Blob |

**Workspace — Copilot (new):**
| Method | Path | Response |
|--------|------|----------|
| POST | `/api/deals/opportunities/:id/copilot/chat` | Chat response or suggestions |

**Reviews — Rationale (new):**
| Method | Path | Response |
|--------|------|----------|
| POST | `/api/deals/reviews/:id/generate-rationale` | `{ rationale: "..." }` |

**News (new handlers):**
| Method | Path | Response |
|--------|------|----------|
| POST | `/api/deals/news/:id/notify` | `{ success: true }` |
| POST | `/api/deals/news/daily-report` | Blob (text report) |

**Dashboard (new/updated handlers):**
| Method | Path | Response |
|--------|------|----------|
| GET | `/api/deals/dashboard/funnel` | `{ byStatus: [...], byStage: [...] }` |
| GET | `/api/deals/dashboard/activity` | `{ teamMembers: [...] }` |
| GET | `/api/deals/dashboard/tasks` | Array of pending tasks for current user |

**Events (all new):**
| Method | Path | Response |
|--------|------|----------|
| GET | `/api/deals/events` | Array of events |
| POST | `/api/deals/events` | Created event |
| GET | `/api/deals/events/:id` | Single event |
| PUT | `/api/deals/events/:id` | Updated event |
| DELETE | `/api/deals/events/:id` | 204 |

**Tasks (all new):**
| Method | Path | Response |
|--------|------|----------|
| GET | `/api/deals/tasks` | Array of tasks (filtered by role) |
| POST | `/api/deals/tasks` | Created task |
| PUT | `/api/deals/tasks/:id` | Updated task |
| DELETE | `/api/deals/tasks/:id` | 204 |

**Notifications (all new):**
| Method | Path | Response |
|--------|------|----------|
| GET | `/api/deals/notifications` | Array of notifications (filtered by userId) |
| GET | `/api/deals/notifications/count` | `{ count: N }` |
| PUT | `/api/deals/notifications/:id/read` | 204 |
| PUT | `/api/deals/notifications/read-all` | 204 |

**Total new handlers: ~35 endpoints**

### 13.2 Mock Response Format

Continue using the existing pattern — **direct JSON response** (not wrapped in an envelope):

```typescript
// Correct (existing pattern)
return HttpResponse.json(data)

// For 204 responses
return new HttpResponse(null, { status: 204 })

// For errors
return HttpResponse.json({ error: 'Not found' }, { status: 404 })
```

### 13.3 Role-Scoped Handler Pattern

For handlers that need role-based filtering, use this pattern:

```typescript
http.get('/api/deals/opportunities', async ({ request }) => {
  await delay(400)
  
  // Get current user from mock state
  const currentUser = getCurrentMockUser()  // helper to get logged-in user
  const dealsRole = currentUser.moduleRoles.find(r => r.moduleSlug === 'deals')?.role
  
  let filtered = [...opportunities]
  
  // Role-based filtering
  if (dealsRole === 'analyst') {
    filtered = filtered.filter(opp => 
      opp.assignedTo === currentUser.id ||
      documentShares.some(s => s.sharedWith === currentUser.id && 
        documents.some(d => d.id === s.documentId && d.opportunityId === opp.id))
    )
  }
  
  // Apply query filters
  const url = new URL(request.url)
  const status = url.searchParams.get('pipelineStatus')
  if (status) filtered = filtered.filter(o => o.pipelineStatus === status)
  
  return HttpResponse.json(filtered)
})
```

**Helper needed:** A `getCurrentMockUser()` function that reads the current logged-in user's ID from a shared mock state variable (set during the mock login handler).

### 13.4 Simulated Background Processing

For operations that would be background jobs in production (email import, re-processing), simulate async behavior:

```typescript
http.post('/api/deals/emails/:id/import', async ({ params, request }) => {
  await delay(500)
  const { id } = params as { id: string }
  const body = await request.json()
  
  // Create opportunity immediately with 'processing' status
  const newOpp = {
    id: `opp-${Date.now()}`,
    name: email.subject || 'Imported Opportunity',
    pipelineStatus: 'processing',
    pipelineStage: null,
    // ... other fields
  }
  opportunities.push(newOpp)
  
  // Simulate background processing completing after 3 seconds
  setTimeout(() => {
    const idx = opportunities.findIndex(o => o.id === newOpp.id)
    if (idx !== -1) {
      opportunities[idx].pipelineStatus = 'new'
      opportunities[idx].pipelineStage = 'new'
      opportunities[idx].snapshotData = { /* mock extracted data */ }
      opportunities[idx].mandateFits = [ /* mock fits */ ]
      
      // Add notification
      notifications.push({
        id: `notif-${Date.now()}`,
        userId: getCurrentMockUser().id,
        type: 'processing_complete',
        title: `Opportunity "${newOpp.name}" finished processing`,
        message: 'Snapshot data extracted from source documents.',
        link: `/home/deals/opportunities/${newOpp.id}`,
        relatedId: newOpp.id,
        read: false,
        createdAt: new Date().toISOString(),
      })
    }
  }, 3000)
  
  // Update email status
  const emailIdx = syncedEmails.findIndex(e => e.id === id)
  if (emailIdx !== -1) {
    syncedEmails[emailIdx].importStatus = 'imported'
    syncedEmails[emailIdx].opportunityId = newOpp.id
  }
  
  return HttpResponse.json(newOpp)
})
```

---

## Implementation Priority

Recommended order for building the new/modified features:

### Phase 1: Foundation (do first)
1. **Role switcher** — enables testing everything else
2. **Role-based UI enforcement** — apply `getModuleRole` checks across all pages
3. **Type updates** — remove `required` from SnapshotField, add `processing` to PipelineStatus, update share permissions

### Phase 2: Core Changes
4. **Opportunity list updates** — pipeline stage column, strategy fit tooltip, processing status, top matches
5. **Dashboard updates** — date range filter, team activity section, funnel by stage
6. **Mandate detail** — matched opportunities tab
7. **Settings updates** — template CRUD, preview, reset, calendar card, remove required toggle

### Phase 3: New Features
8. **Notification panel** — component, store, handlers, mock data
9. **Workspace comments** — inline + general comments, threads, resolve
10. **Copilot panel** — standard mode chat, agent mode with suggestions
11. **Notes canvas** — drawing component with persistence
12. **Events & Tasks** — full new page with both tabs

### Phase 4: Polish
13. **Document export** — PDF and Word download
14. **News enhancements** — notify team, daily report
15. **Email hub fixes** — error toasts, unignore
16. **Re-process prompt** — confirmation dialog on source doc upload

---

## Testing Checklist

For each feature, verify across all three roles:

### As Owner (sarah@watar.com):
- [ ] Can access Settings page
- [ ] Can configure snapshot fields, templates, integrations
- [ ] Can create/edit/delete mandates
- [ ] Can see all opportunities (including other users')
- [ ] Can approve/reject opportunities (set stage)
- [ ] Can see team activity on dashboard
- [ ] Can see all tasks
- [ ] Can delete opportunities

### As Manager (raoof@watar.com):
- [ ] Cannot access Settings page (nav item hidden or grayed)
- [ ] Can create/edit mandates (not delete)
- [ ] Can see all opportunities
- [ ] Can approve/reject opportunities
- [ ] Can see team activity on dashboard
- [ ] Can see all tasks
- [ ] Cannot delete opportunities

### As Analyst (john@watar.com):
- [ ] Cannot access Settings page
- [ ] Can view mandates but not edit/create
- [ ] Can only see own opportunities + shared documents
- [ ] Cannot approve/reject (stage buttons hidden)
- [ ] Cannot see team activity on dashboard
- [ ] Can only see own tasks + tasks assigned to them
- [ ] Can create opportunities and edit own
- [ ] Can share documents and send for validation
- [ ] Cannot delete opportunities
