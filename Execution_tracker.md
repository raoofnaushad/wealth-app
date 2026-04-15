# Feature Execution Tracker — Deals Module Phase 2

## DONE
- Core feature skeleton (pages, routing, layout)
- Data model & schema (types.ts — Opportunity, Mandate, Document, Email, AssetManager, etc.)
- Primary API endpoints (MSW handlers for core CRUD)
- Dashboard base (PipelineSummary, PipelineFunnel, AllocationOverview, RecentNews)
- Opportunity list & workspace (TipTap editor, SnapshotPanel, SourceFileViewer, ShareDialog, ValidationDialog)
- Mandate list & detail pages
- Email Hub (ConnectGmailButton, EmailList, EmailPreview, ImportEmailDialog)
- Asset Manager list & detail
- News feed
- Settings base (InvestmentTypeList, SnapshotFieldEditor, TemplateList, PromptEditor)
- Google Drive import dialog

## IN PROGRESS
- (none)

## NOT STARTED

### ~~Phase 1 — Type & API Foundation~~ ✅ DONE
- [x] `PipelineStatus` → add `'processing'`
- [x] `SnapshotField` → replace `required: boolean` with `description: string`
- [x] `DocumentShare.permission` → `'read' | 'read_write'`
- [x] Add types: `DealEvent`, `DealTask`, `DealNotification`, `GoogleCalendarAccount`, `DocumentComment`
- [x] Add API method signatures in `api.ts` for events, tasks, notifications, comments, export

### ~~Phase 2 — MSW Mock Handlers~~ ✅ DONE
- [x] Events CRUD: `GET/POST /deals/events`, `PATCH/DELETE /deals/events/:id`
- [x] Tasks CRUD: `GET/POST /deals/tasks`, `PATCH/DELETE /deals/tasks/:id`
- [x] Notifications: `GET /deals/notifications`, `PATCH /deals/notifications/:id/read`
- [x] Calendar: `GET/POST/DELETE /deals/integrations/google-calendar`
- [x] Comments: `GET/POST /deals/opportunities/:id/comments`
- [x] Export: `POST /deals/opportunities/:id/export`
- [x] Template CRUD: `POST/PATCH/DELETE /deals/settings/templates/:id`
- [x] Unignore email: `POST /deals/emails/:id/unignore`
- [x] Team activity: `GET /deals/dashboard/team-activity`
- [x] Matched opportunities: `GET /deals/mandates/:id/matches`
- [x] Expand mock data in `deals.ts` (events, tasks, notifications, calendar accounts)

### ~~Phase 3 — Settings Updates~~ ✅ DONE
- [x] `SnapshotFieldEditor`: remove `required` toggle, add `description` text input
- [x] `TemplateList`: add Create / Edit / Delete template actions
- [x] Settings page: add Google Calendar integration card (connect / disconnect)

### ~~Phase 4 — Dashboard Enhancements~~ ✅ DONE
- [x] Flexible date range filter (7d / 30d / 90d / custom)
- [x] Team activity section (Manager + Owner only)
- [x] Pipeline funnel grouped by stage

### ~~Phase 5 — Opportunities & Pipeline Enhancements~~ ✅ DONE
- [x] Pipeline Stage column in `OpportunityTable`
- [x] Strategy fit tooltip with rationale text
- [x] `ProcessingStatusBadge` (spinner when `status === 'processing'`)
- [x] "Top Matches" section on opportunity list page

### ~~Phase 6 — Mandate Matched Opportunities Tab~~ ✅ DONE
- [x] Add "Matched Opportunities" tab to `MandateDetailPage`
- [x] Fetch from `GET /deals/mandates/:id/matches`
- [x] Ranked list with fit score + pipeline status

### ~~Phase 7 — Email Hub Fixes~~ ✅ DONE
- [x] Error toast on Gmail connect failure / processing error
- [x] Unignore action on ignored emails
- [x] Confirm dialog before re-processing an email

### ~~Phase 8 — Workspace Enhancements~~ ✅ DONE
- [x] `NotesCanvas` — freeform sticky notes (SVG-based, no extra lib)
- [x] `CopilotPanel` — chat vs. autonomous agent mode toggle
- [x] `CommentsPanel` — threaded comments sidebar (1-level, keyed to section headings)
- [x] Export button → PDF already working (skipped per user)

### ~~Phase 9 — Events & Tasks Page~~ ✅ DONE
- [x] New route `/deals/events` → `EventsTasksPage`
- [x] Events list (meeting / call / site-visit icons)
- [x] Task list (priority, due date, assignee)
- [x] Mini calendar widget
- [x] Google Calendar sync status indicator

### ~~Phase 10 — Notification Panel~~ ✅ DONE
- [x] `NotificationPanel` slide-in drawer
- [x] Notification store slice (`notifications`, `unreadCount`, `markRead`)
- [x] 10+ notification type renderers (13 types)
- [x] Bell icon with unread badge in layout header

### ~~Phase 11 — Role Switcher (Dev Only)~~ ✅ DONE
- [x] `DevRoleSwitcher` component (guard: `import.meta.env.DEV`)
- [x] Persists role to `localStorage`, patches `useAuthStore`

### ~~Phase 12 — Collaboration Enhancements~~ ✅ DONE
- [x] `ShareDialog`: permission → `Read` / `Read & Write`
- [x] Validation workflow: Copilot rationale auto-generation
- [x] `AssetManagerTable`: hide Delete for non-Owner roles

## BLOCKED / NEEDS DECISION
- (none)
