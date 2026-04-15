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

### Phase 2 — MSW Mock Handlers (~35 new endpoints, blocks Phases 3–12 testing)
- [ ] Events CRUD: `GET/POST /deals/events`, `PATCH/DELETE /deals/events/:id`
- [ ] Tasks CRUD: `GET/POST /deals/tasks`, `PATCH/DELETE /deals/tasks/:id`
- [ ] Notifications: `GET /deals/notifications`, `PATCH /deals/notifications/:id/read`
- [ ] Calendar: `GET/POST/DELETE /deals/integrations/google-calendar`
- [ ] Comments: `GET/POST /deals/opportunities/:id/comments`
- [ ] Export: `POST /deals/opportunities/:id/export`
- [ ] Template CRUD: `POST/PATCH/DELETE /deals/settings/templates/:id`
- [ ] Unignore email: `POST /deals/emails/:id/unignore`
- [ ] Team activity: `GET /deals/dashboard/team-activity`
- [ ] Matched opportunities: `GET /deals/mandates/:id/matches`
- [ ] Expand mock data in `deals.ts` (events, tasks, notifications, calendar accounts)

### Phase 3 — Settings Updates
- [ ] `SnapshotFieldEditor`: remove `required` toggle, add `description` text input
- [ ] `TemplateList`: add Create / Edit / Delete template actions
- [ ] Settings page: add Google Calendar integration card (connect / disconnect)

### Phase 4 — Dashboard Enhancements
- [ ] Flexible date range filter (7d / 30d / 90d / custom)
- [ ] Team activity section (Manager + Owner only)
- [ ] Pipeline funnel grouped by stage

### Phase 5 — Opportunities & Pipeline Enhancements
- [ ] Pipeline Stage column in `OpportunityTable`
- [ ] Strategy fit tooltip with rationale text
- [ ] `ProcessingStatusBadge` (spinner when `status === 'processing'`)
- [ ] "Top Matches" section on opportunity list page

### Phase 6 — Mandate Matched Opportunities Tab
- [ ] Add "Matched Opportunities" tab to `MandateDetailPage`
- [ ] Fetch from `GET /deals/mandates/:id/matches`
- [ ] Ranked list with fit score + pipeline status

### Phase 7 — Email Hub Fixes
- [ ] Error toast on Gmail connect failure / processing error
- [ ] Unignore action on ignored emails
- [ ] Confirm dialog before re-processing an email

### Phase 8 — Workspace Enhancements
- [ ] `NotesCanvas` — freeform sticky notes (SVG-based, no extra lib)
- [ ] `CopilotPanel` — chat vs. autonomous agent mode toggle
- [ ] `CommentsPanel` — threaded comments sidebar (1-level, keyed to section headings)
- [ ] Export button → PDF (`window.print()`) + Word (`docx` package)

### Phase 9 — Events & Tasks Page
- [ ] New route `/deals/events` → `EventsTasksPage`
- [ ] Events list (meeting / call / site-visit icons)
- [ ] Task list (priority, due date, assignee)
- [ ] Mini calendar widget
- [ ] Google Calendar sync status indicator

### Phase 10 — Notification Panel
- [ ] `NotificationPanel` slide-in drawer
- [ ] Notification store slice (`notifications`, `unreadCount`, `markRead`)
- [ ] 10+ notification type renderers
- [ ] Bell icon with unread badge in layout header

### Phase 11 — Role Switcher (Dev Only)
- [ ] `DevRoleSwitcher` component (guard: `import.meta.env.DEV`)
- [ ] Persists role to `localStorage`, patches `useAuthStore`

### Phase 12 — Collaboration Enhancements
- [ ] `ShareDialog`: permission → `Read` / `Read & Write`
- [ ] Validation workflow: Copilot rationale auto-generation
- [ ] `AssetManagerTable`: hide Delete for non-Owner roles

## BLOCKED / NEEDS DECISION
- (none)
