# Invictus AI — Deals Module PRD

> **Version:** 1.0  
> **Date:** 2026-04-15  
> **Author:** Raoof Naushad  
> **Status:** Draft  
> **Audience:** Development team  

---

## Table of Contents

- [0. Introduction & Foundations](#0-introduction--foundations)
- [1. Settings & Configuration](#1-settings--configuration)
- [2. Mandates](#2-mandates)
- [3. Email Hub](#3-email-hub)
- [4. Opportunities & Pipeline](#4-opportunities--pipeline)
- [5. Workspace](#5-workspace)
- [6. Collaboration & Sharing](#6-collaboration--sharing)
- [7. Asset Managers](#7-asset-managers)
- [8. News & Intelligence](#8-news--intelligence)
- [9. Dashboard](#9-dashboard)
- [10. Events & Tasks](#10-events--tasks)
- [11. Cross-Cutting Concerns](#11-cross-cutting-concerns)

---

## 0. Introduction & Foundations

### 0.1 Purpose

The Deals module is the deal sourcing, evaluation, and pipeline management engine of the Invictus AI platform. Investment teams use it to source opportunities (via email, document upload, or Google Drive), evaluate them against firm mandates, generate investment documents, collaborate on analysis, and move deals through an approval pipeline.

This PRD defines the complete Deals module — every feature, data model, API endpoint, RBAC rule, and background process — in enough detail for developers to implement without ambiguity.

### 0.2 Scope

This PRD covers:
- All Deals module pages and features (Settings, Mandates, Email Hub, Opportunities, Workspace, Asset Managers, News, Dashboard, Events & Tasks)
- Backend services (FastAPI + PostgreSQL + Redis + Celery)
- Frontend application (React + TypeScript + TipTap + Zustand)
- Google integrations (Gmail, Drive, Calendar)
- AI integration (document generation, snapshot extraction, mandate matching, copilot)
- Notification system (deals-scoped)

Out of scope:
- Cross-module integrations with Engage, Plan, Tools, Insights (deferred to v2)
- Outlook / Microsoft 365 email integration
- Mobile-responsive layout
- Gmail Workspace Add-on (plugin)

### 0.3 Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 19, TypeScript 5.9, Vite 8 | Existing stack |
| State | Zustand 5 | Per-module store |
| UI Components | shadcn/ui (base-nova), Tailwind CSS 4.2 | Existing |
| Document Editor | **TipTap** (replaces OnlyOffice) | Rich text editing with export to PDF/Word |
| Notes Canvas | **Simple Canvas** (custom) | Basic drawing, shapes, text notes, images |
| Charts | Recharts | Existing |
| Icons | Lucide React | Existing |
| API Mocking | MSW 2 | Dev environment |
| Backend | Python 3.12, FastAPI | Layered architecture |
| Database | PostgreSQL 16 | Multi-tenant with RLS |
| Cache | Redis | Session + data caching |
| Task Queue | Celery + Redis broker | Background processing |
| AI | External AI service (backend proxy) | No direct LLM calls from frontend |
| Email | Gmail API (OAuth 2.0) | Read-only sync + send via connected account |
| Storage | Google Drive API (OAuth 2.0) | Browse + import |
| Calendar | Google Calendar API (OAuth 2.0) | Create events + sync |
| File Storage | Cloud storage (S3-compatible) | Source files, exports |
| Vector DB | External vector store | Document embeddings for RAG |
| Package Manager | pnpm 10.15 | Existing |

### 0.4 Two-Dimension Status Model

Every opportunity has **two independent status dimensions**:

**Dimension 1: Pipeline Status (lifecycle)**

| Status | Description |
|--------|-------------|
| `processing` | System is processing source materials (vectorizing, extracting, matching). Not yet visible to users in the main list. |
| `new` | Processing complete. Ready for analyst review. |
| `active` | Analyst has opened and is actively working on this opportunity. |
| `archived` | Completed or no longer relevant. Kept for historical reference. |
| `ignored` | Explicitly passed on after review. |

**Dimension 2: Pipeline Stage (deal progression)**

| Stage | Description | Who Can Set |
|-------|-------------|-------------|
| `new` | Initial stage, no evaluation started | System (auto) |
| `pre_screening` | Analyst performing initial screening | Analyst, Manager, Owner |
| `due_diligence` | Deep-dive analysis underway | Analyst, Manager, Owner |
| `ic_review` | Submitted for Investment Committee review | Manager, Owner |
| `approved` | Deal approved | Manager, Owner only |
| `rejected` | Deal rejected | Manager, Owner only |

**Rules:**
- Pipeline status and stage are independent — an `active` opportunity can be at any stage.
- Only Manager/Owner can set stage to `approved` or `rejected`.
- When an opportunity is `archived` or `ignored`, the stage is frozen at its current value.
- `processing` status has no stage (stage is null until processing completes).
- When processing completes, status becomes `new` and stage becomes `new`.

### 0.5 RBAC Matrix

Uses the Administration module's 3-role model applied to the `deals` module: **Owner**, **Manager**, **Analyst**.

| Feature / Action | Owner | Manager | Analyst |
|-----------------|-------|---------|---------|
| **Settings** — configure snapshot fields, templates, integrations | Yes | No | No |
| **Mandates** — create, edit, delete | Yes | Yes | No |
| **Mandates** — change status (Draft/Active/Closed) | Yes | Yes | No |
| **Mandates** — view all | Yes | Yes | Yes |
| **Opportunities** — view all | Yes | Yes | Own only (unless shared) |
| **Opportunities** — create, edit | Yes | Yes | Yes (own) |
| **Opportunities** — delete | Yes | No | No |
| **Opportunities** — set pipeline stage to approved/rejected | Yes | Yes | No |
| **Opportunities** — validate/approve documents | Yes | Yes | No |
| **Workspace** — edit deliverables, notes, snapshot | Yes | Yes | Yes (own opportunities) |
| **Documents** — share with team | Yes | Yes | Yes |
| **Documents** — send for validation | Yes | Yes | Yes |
| **Asset Managers** — CRUD | Yes | Yes | Yes |
| **Email Hub** — connect own email account | Yes | Yes | Yes |
| **Email Hub** — import email as opportunity | Yes | Yes | Yes |
| **News** — view all | Yes | Yes | Yes |
| **News** — notify team members | Yes | Yes | Yes |
| **Dashboard** — view own data | Yes | Yes | Yes |
| **Dashboard** — view team breakdown | Yes | Yes | No |
| **Events** — create, manage | Yes | Yes | Yes |
| **Tasks** — create, assign to others | Yes | Yes | Yes |
| **Tasks** — view all team tasks | Yes | Yes | Own only |

**Analyst visibility rule:** An analyst can only see their own opportunities unless another user has explicitly shared specific documents with them (read or read/write access). Managers and Owners can see all opportunities across the team.

### 0.6 Glossary

| Term | Definition |
|------|-----------|
| **Opportunity** | A potential investment deal being evaluated |
| **Mandate** | A set of investment criteria defining what the firm is looking to invest in |
| **Snapshot** | Structured data fields for an opportunity, configured per investment type |
| **Investment Type** | Category of investment (Fund, Direct, Co-Investment, or custom) |
| **Deliverable** | A document created in the workspace using the TipTap editor |
| **Source Document** | Original files (PDFs, pitch decks, emails) uploaded or imported for an opportunity |
| **Pipeline Status** | Lifecycle state of an opportunity (processing/new/active/archived/ignored) |
| **Pipeline Stage** | Evaluation progression (new/pre_screening/due_diligence/ic_review/approved/rejected) |
| **Strategy Fit** | How well an opportunity matches a mandate's investment criteria |
| **Copilot** | AI assistant available in the workspace for chat and document assistance |
| **Agent Mode** | Copilot mode where AI can suggest edits to document content |

### 0.7 Routes

```
/home/deals/                                → Dashboard
/home/deals/mandates                        → Mandate list
/home/deals/mandates/:id                    → Mandate detail
/home/deals/opportunities                   → Opportunity list
/home/deals/opportunities/:id               → Opportunity workspace (full-screen)
/home/deals/email                           → Email Hub
/home/deals/asset-managers                  → Asset Manager list
/home/deals/asset-managers/:id              → Asset Manager detail
/home/deals/news                            → News feed
/home/deals/settings                        → Settings (Owner only)
/home/deals/events                          → Events & Tasks
```

### 0.8 Sidebar Navigation

```
+------------------------+
| ← Back to Home         |
+------------------------+
| DEALS                  |
| Dashboard              |
| Mandates               |
| Opportunities          |
| Email Hub              |
| Asset Managers         |
| News                   |
| Events & Tasks         |
| Settings        [lock] |  ← Owner only
+------------------------+
| Notifications    [3]   |  ← Badge count
+------------------------+
```

The sidebar is hidden when the user enters the Opportunity Workspace (full-screen mode). A collapse/expand toggle is available.

---

## 1. Settings & Configuration

**Route:** `/home/deals/settings`  
**Access:** Owner only  

The Settings page is where the organization configures how the Deals module works. This is typically set up during onboarding and refined over time.

### 1.1 Snapshot Configuration

Each investment type has a snapshot configuration — a set of sections and fields that define what data is collected for opportunities of that type.

**System defaults:** Three investment types are pre-configured (Fund, Direct, Co-Investment). These cannot be deleted but can be edited. Users can also add custom investment types.

#### 1.1.1 Investment Type List

- Shows all configured investment types as cards or a list
- Each card shows: name, number of sections, number of fields, system/custom badge
- "Add Investment Type" button to create a new custom type
- System types show a lock icon (cannot delete, but can edit)
- Click a type to open its snapshot configuration editor

#### 1.1.2 Snapshot Configuration Editor

When an investment type is selected, the editor shows:

**Sections** — Vertically ordered, drag-to-reorder. Each section has:
- Section Name (editable inline)
- Collapse/expand toggle
- Delete button (with confirmation)
- "Add Field" button at the bottom of the section
- Drag handle for reordering

**Fields within a section** — Each field has:

| Property | Type | Description |
|----------|------|-------------|
| Field Name | text | Display name of the field |
| Data Type | select | One of: `text`, `textarea`, `number`, `currency`, `percentage`, `date`, `select`, `multi-select`, `boolean` |
| Description | text | Short description shown as helper text |
| Instruction | textarea | AI extraction prompt — tells the LLM how to extract this field from source documents |
| Options | text (comma-separated) | Only for `select` and `multi-select` types |

**Note:** There is NO required/optional toggle. All fields are optional.

Fields are drag-to-reorder within their section. Fields can be dragged between sections.

"Add Section" button at the bottom of the editor.

"Reset to Defaults" button restores the system default configuration for system types.

#### 1.1.3 Adding a Custom Investment Type

1. Click "Add Investment Type"
2. Enter name (e.g., "Infrastructure", "Real Assets")
3. System creates the type with an empty snapshot config (no pre-configured sections)
4. User adds sections and fields manually
5. System also creates default document templates for this new type (using generic prompts)

#### 1.1.4 Data Model

```sql
deals.investment_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  name            VARCHAR(100) NOT NULL,
  slug            VARCHAR(50) NOT NULL,
  is_system       BOOLEAN DEFAULT false,
  sort_order      INTEGER DEFAULT 0,
  snapshot_config JSONB NOT NULL DEFAULT '{"sections": []}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, slug)
)
```

**snapshot_config JSONB structure:**

```json
{
  "sections": [
    {
      "name": "Deal Overview",
      "sortOrder": 0,
      "fields": [
        {
          "name": "Fund Name",
          "type": "text",
          "description": "Official name of the fund",
          "instruction": "Extract the full legal name of the fund from the document header or cover page",
          "options": []
        }
      ]
    }
  ]
}
```

#### 1.1.5 API Endpoints

```
GET    /api/v1/deals/settings/investment-types              — List all types
POST   /api/v1/deals/settings/investment-types              — Create custom type
GET    /api/v1/deals/settings/investment-types/:id          — Get type with config
PUT    /api/v1/deals/settings/investment-types/:id          — Update type (name, config)
DELETE /api/v1/deals/settings/investment-types/:id          — Delete custom type (not system)
POST   /api/v1/deals/settings/investment-types/:id/reset    — Reset to defaults (system only)
```

**RBAC:** All endpoints require `deals: owner`.

#### 1.1.6 Acceptance Criteria

- [ ] Owner can view list of all investment types
- [ ] Owner can edit snapshot configuration for any type (system or custom)
- [ ] Owner can add new sections with a name
- [ ] Owner can add fields to any section with name, type, description, instruction
- [ ] Owner can reorder sections via drag-and-drop
- [ ] Owner can reorder fields within a section via drag-and-drop
- [ ] Owner can drag fields between sections
- [ ] Owner can delete sections (with confirmation dialog)
- [ ] Owner can delete fields
- [ ] Owner can create new custom investment types
- [ ] Owner can delete custom investment types (not system types)
- [ ] Owner can reset system types to default configuration
- [ ] `select` and `multi-select` fields show an options editor
- [ ] Changes auto-save or save on explicit action (decide during implementation)
- [ ] Non-owner roles see Settings grayed out / inaccessible in nav

---

### 1.2 Document Templates

Per investment type, configure AI prompt templates for document generation.

#### 1.2.1 Template List

For each investment type, a list of document templates is shown:
- System defaults: Investment Memo, Pre-Screening Report, DDQ, Market Analysis, News/Insights
- Custom templates can be added
- Each shows: name, system/custom badge, last modified date

#### 1.2.2 Prompt Editor

Clicking a template opens the prompt editor:

- **Prompt textarea** — large text area for writing the AI prompt
- **Snapshot field variables** — sidebar or dropdown showing available variables from the investment type's snapshot config (e.g., `{{Fund Name}}`, `{{Target IRR}}`)
- Clicking a variable inserts it at cursor position in the prompt
- Variables are syntax-highlighted in the prompt text
- "Reset to Default" restores the system prompt for system templates
- "Preview" button generates a sample document using test data

**Key behavior:** When a user creates a new investment type, the system auto-generates generic document templates with basic prompts. The user can then customize these prompts.

#### 1.2.3 Data Model

```sql
deals.document_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  investment_type_id UUID NOT NULL REFERENCES deals.investment_types(id),
  name              VARCHAR(100) NOT NULL,
  slug              VARCHAR(50) NOT NULL,
  prompt_template   TEXT NOT NULL,
  is_system         BOOLEAN DEFAULT false,
  sort_order        INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, investment_type_id, slug)
)
```

#### 1.2.4 API Endpoints

```
GET    /api/v1/deals/settings/templates?investmentTypeId=:id  — List templates for type
GET    /api/v1/deals/settings/templates/:id                   — Get template with prompt
PUT    /api/v1/deals/settings/templates/:id                   — Update template prompt
POST   /api/v1/deals/settings/templates                       — Create custom template
DELETE /api/v1/deals/settings/templates/:id                   — Delete custom template
POST   /api/v1/deals/settings/templates/:id/reset             — Reset to default prompt
POST   /api/v1/deals/settings/templates/:id/preview           — Generate preview output
```

**RBAC:** All endpoints require `deals: owner`.

#### 1.2.5 Acceptance Criteria

- [ ] Templates listed per investment type
- [ ] Prompt editor with syntax-highlighted variable placeholders
- [ ] Variable picker showing all snapshot fields for the investment type
- [ ] Click variable to insert at cursor position
- [ ] Preview generates sample output using test/mock data
- [ ] Reset to default restores system prompt
- [ ] Custom templates can be created and deleted
- [ ] Auto-generated templates appear when a new investment type is created

---

### 1.3 Integrations

Integration settings for Gmail, Google Drive, and Google Calendar. Each user can connect **one** account per service.

#### 1.3.1 UI

Three cards, one per integration:

**Gmail:**
- Status: Connected / Not Connected
- Connected email address
- Last synced timestamp
- "Connect Gmail" / "Disconnect" button
- Sync settings: labels to watch (multi-select of Gmail labels)

**Google Drive:**
- Status: Connected / Not Connected
- Connected email address
- "Connect Drive" / "Disconnect" button

**Google Calendar:**
- Status: Connected / Not Connected
- Connected email address
- "Connect Calendar" / "Disconnect" button

All connections use OAuth 2.0. One account per user per service (enforced in backend).

#### 1.3.2 Acceptance Criteria

- [ ] Each integration card shows current connection status
- [ ] OAuth flow initiates on "Connect" click
- [ ] Successful OAuth stores tokens and shows connected state
- [ ] "Disconnect" removes tokens and shows disconnected state
- [ ] One account per user per service enforced
- [ ] Gmail sync labels configurable after connection

---

## 2. Mandates

**Route:** `/home/deals/mandates` (list), `/home/deals/mandates/:id` (detail)  
**Access:** All roles can view. Owner and Manager can create/edit/change status.

Mandates define the firm's investment criteria. Each mandate describes what the firm is looking to invest in — sector focus, geographic targets, allocation goals, return expectations. When new opportunities arrive, the system evaluates them against all active mandates to produce a strategy fit score.

### 2.1 Mandate List Page

**Layout:**
- Tab filters: All | Active | Draft | Closed (with counts)
- Search bar (by mandate name)
- "Create Mandate" button (Owner/Manager only)
- Card or table view showing:
  - Mandate name
  - Status badge (Draft / Active / Closed)
  - Investment types (as tags)
  - Target allocation (currency)
  - Number of matched opportunities
  - Last updated date

### 2.2 Create / Edit Mandate

A form dialog or full page with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| Name | text | Mandate name (e.g., "Growth Equity 2026") |
| Status | select | Draft / Active / Closed |
| Target Allocation | currency | Target investment amount |
| Expected Return | text | E.g., "18-22% Net IRR" |
| Time Horizon | text | E.g., "3-10 years" |
| Investment Types | multi-select dropdown | From configured investment types in Settings |
| Asset Allocation | table | Per asset class: class name, allocation %, target return % |
| Target Sectors | tag input | Type sector name, press comma/enter to add as tag |
| Geographic Focus | tag input | Same comma/enter behavior |
| Investment Criteria | textarea | Free text describing what the mandate looks for |
| Investment Constraints | textarea | Free text describing restrictions |
| Investment Strategy | textarea | Free text strategy description |

**Tag input behavior:** User types text and presses comma or Enter to create a new tag. Tags are removable with an X button. This applies to Target Sectors, Geographic Focus, and Investment Types.

### 2.3 Mandate Detail Page

Two tabs:

**Tab 1: Strategy Overview**

Displays all mandate fields in a structured read/edit layout:

- **Header metrics row:** Target Allocation, Expected Return, Time Horizon (as stat cards)
- **Allocation Progress:** Current allocated vs target (progress bar)
- **Investment Summary:** Total / Pipeline / Approved opportunity counts
- **Investment Types:** Tags
- **Asset Allocation & Target Returns:** Editable table with rows per asset class
- **Target Sectors:** Tag display (editable)
- **Geographic Focus:** Tag display (editable)
- **Investment Criteria:** Editable text block
- **Investment Constraints:** Editable text block
- **Investment Strategy:** Editable text block

**Tab 2: Matched Opportunities**

- List of all opportunities matched to this mandate
- Columns: Opportunity Name, Investment Type, Strategy Fit Score (Strong/Moderate/Weak), Pipeline Status, Pipeline Stage, Date Received
- **Sorted by strategy fit score** (Strong first, then Moderate, then Weak)
- Click row to open opportunity workspace

### 2.4 Mandate-to-Opportunity Matching

When a new opportunity is processed (or re-processed), the system evaluates it against all **active** mandates:

- Matching criteria: sector alignment, geographic overlap, investment type match, allocation capacity, return profile alignment
- Produces a qualitative fit indicator per mandate: **Strong** / **Moderate** / **Weak**
- Includes a text reasoning explaining the fit assessment
- Opportunities can match multiple mandates
- Matching runs as a background job after snapshot extraction

### 2.5 Data Model

```sql
deals.mandates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL,
  name                  VARCHAR(255) NOT NULL,
  status                VARCHAR(20) DEFAULT 'draft',    -- 'draft', 'active', 'closed'
  target_allocation     DECIMAL(20, 2),
  expected_return       VARCHAR(100),
  time_horizon          VARCHAR(100),
  investment_types      TEXT[],                          -- slugs from investment_types table
  asset_allocation      JSONB DEFAULT '[]',              -- [{ assetClass, allocationPct, targetReturn }]
  target_sectors        TEXT[],
  geographic_focus      TEXT[],
  investment_criteria   TEXT,
  investment_constraints TEXT,
  investment_strategy   TEXT,
  created_by            UUID NOT NULL,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
)

-- Tracks actual allocations against mandates
deals.mandate_allocations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  mandate_id      UUID NOT NULL REFERENCES deals.mandates(id),
  opportunity_id  UUID NOT NULL REFERENCES deals.opportunities(id),
  amount          DECIMAL(20, 2),
  status          VARCHAR(20),                           -- 'proposed', 'committed', 'funded'
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)
```

### 2.6 API Endpoints

```
GET    /api/v1/deals/mandates                        — List mandates (?status=active)
POST   /api/v1/deals/mandates                        — Create mandate
GET    /api/v1/deals/mandates/:id                    — Get mandate detail
PUT    /api/v1/deals/mandates/:id                    — Update mandate
DELETE /api/v1/deals/mandates/:id                    — Delete mandate (Owner only)
GET    /api/v1/deals/mandates/:id/opportunities      — List matched opportunities (sorted by fit)
```

**RBAC:**
- `GET` — all roles
- `POST`, `PUT`, `DELETE` — Owner and Manager only

### 2.7 Acceptance Criteria

- [ ] Mandate list with tab filters (All/Active/Draft/Closed)
- [ ] Create mandate form with all fields
- [ ] Tag input for sectors and geographic focus (comma/enter to add)
- [ ] Investment Types dropdown populated from configured types in Settings
- [ ] Asset allocation table with add/remove rows
- [ ] Mandate detail page with Strategy Overview and Matched Opportunities tabs
- [ ] Matched opportunities sorted by strategy fit score
- [ ] Status change (Draft → Active → Closed) available to Owner/Manager
- [ ] Analyst can view but not edit mandates
- [ ] Mandate changes trigger re-matching of all active opportunities (background job)

---

## 3. Email Hub

**Route:** `/home/deals/email`  
**Access:** All roles

The Email Hub is where users connect their Gmail account, browse synced emails, and convert emails into opportunities.

### 3.1 Layout

**Header section:**
- Connected email account card:
  - Email address
  - Status indicator (Connected / Syncing / Error)
  - Last synced timestamp
  - "Sync Now" button (manual trigger)
- "Connect Gmail" button (if no account connected)

**Email list:**
- Table with columns: From (name + email), Subject, Date Received, Attachments (count icon), Import Status (New / Imported / Ignored)
- Filters: date range, has attachments, status (New only / All)
- Search by sender, subject, content
- Each row has quick actions: "Add as Opportunity" | "Ignore"

**Email preview panel:**
- Clicking an email opens a right-side panel showing:
  - Full email body (HTML rendered)
  - Attachment list with file names, types, sizes
  - "Add as Opportunity" button
  - "Ignore" button

### 3.2 Email → Opportunity Flow

1. User clicks "Add as Opportunity" on an email
2. A dialog appears asking:
   - Investment type (dropdown from configured types)
   - Opportunity name (pre-filled from email subject)
   - Assign to (optional, defaults to self)
3. User confirms
4. System sets opportunity pipeline status to `processing`
5. **Background processing pipeline:**
   - Extract email body text
   - Download and store all attachments as source files
   - Vectorize all content (email body + attachments)
   - Run LLM extraction using the investment type's snapshot field config + instructions
   - Populate snapshot fields with citations pointing to source documents
   - Auto-create or link asset manager (from sender domain/name)
   - Match against all active mandates
   - Set pipeline status to `new`, stage to `new`
6. Email import status changes to `imported` with link to the opportunity
7. User receives notification when processing is complete

### 3.3 Ignore Flow

- User clicks "Ignore" on an email
- Email status changes to `ignored`
- Ignored emails can be filtered out of the default view
- Ignore is reversible — user can change back to `new`

### 3.4 Data Model

```sql
deals.email_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  user_id         UUID NOT NULL,
  provider        VARCHAR(20) DEFAULT 'gmail',
  email_address   VARCHAR(255) NOT NULL,
  access_token    TEXT,                          -- encrypted at rest
  refresh_token   TEXT,                          -- encrypted at rest
  token_expires_at TIMESTAMPTZ,
  sync_labels     TEXT[],                        -- Gmail labels to sync
  last_synced_at  TIMESTAMPTZ,
  status          VARCHAR(20) DEFAULT 'connected',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id, provider)           -- one account per user per provider
)

deals.emails (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  email_account_id UUID NOT NULL REFERENCES deals.email_accounts(id),
  gmail_message_id VARCHAR(255),
  from_address    VARCHAR(255),
  from_name       VARCHAR(255),
  subject         VARCHAR(1000),
  body_text       TEXT,
  body_html       TEXT,
  received_at     TIMESTAMPTZ,
  attachment_count INTEGER DEFAULT 0,
  import_status   VARCHAR(20) DEFAULT 'new',     -- 'new', 'imported', 'ignored'
  opportunity_id  UUID,                           -- set when imported
  created_at      TIMESTAMPTZ DEFAULT now()
)

deals.email_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id        UUID NOT NULL REFERENCES deals.emails(id),
  file_name       VARCHAR(500),
  file_url        TEXT,
  file_type       VARCHAR(50),
  file_size       BIGINT,
  created_at      TIMESTAMPTZ DEFAULT now()
)
```

### 3.5 API Endpoints

```
GET    /api/v1/deals/email/accounts                      — List connected email accounts
POST   /api/v1/deals/email/accounts                      — Connect Gmail (initiate OAuth)
DELETE /api/v1/deals/email/accounts/:id                  — Disconnect account
PUT    /api/v1/deals/email/accounts/:id/settings         — Update sync labels
POST   /api/v1/deals/email/accounts/:id/sync             — Trigger manual sync

GET    /api/v1/deals/emails?accountId=&importStatus=&q=  — List synced emails (paginated)
GET    /api/v1/deals/emails/:id                          — Get email detail + attachments
POST   /api/v1/deals/emails/:id/import                   — Convert to opportunity
PUT    /api/v1/deals/emails/:id/ignore                   — Mark as ignored
PUT    /api/v1/deals/emails/:id/unignore                 — Revert ignore
```

**RBAC:** All roles can access their own connected accounts and emails.

### 3.6 Background Jobs

| Job | Queue | Trigger | Description |
|-----|-------|---------|-------------|
| `sync_gmail_account` | `email` | Manual "Sync Now" + periodic (configurable) | Fetches new emails from Gmail API, stores in DB |
| `import_email_as_opportunity` | `deals` | User clicks "Add as Opportunity" | Full processing pipeline (vectorize, extract, match) |

### 3.7 Acceptance Criteria

- [ ] User can connect Gmail via OAuth
- [ ] Connected account shows email address, status, last sync time
- [ ] "Sync Now" triggers manual email sync
- [ ] Email list with From, Subject, Date, Attachments, Import Status columns
- [ ] Search by sender, subject, content
- [ ] Filter by date range, attachment presence, status
- [ ] Click email to preview in side panel with full body + attachments
- [ ] "Add as Opportunity" opens dialog with investment type selector
- [ ] Importing triggers background processing and shows `processing` status
- [ ] Notification when processing is complete
- [ ] "Ignore" marks email, reversible
- [ ] One Gmail account per user enforced

---

## 4. Opportunities & Pipeline

**Route:** `/home/deals/opportunities`  
**Access:** Owner/Manager see all. Analyst sees own only (unless shared).

### 4.1 Opportunity List Page

**Layout:**

- **Pipeline status tabs:** All | New | Active | Archived | Ignored (with counts per tab)
- **Search bar:** Search by name, asset manager, sector
- **"Add Opportunity" button** — opens creation dialog (manual entry or file upload)
- **Table columns:**

| Column | Description |
|--------|-------------|
| Name | Opportunity name (linked to workspace) |
| Asset Manager | Name of the asset manager |
| Investment Type | Tag (Fund / Direct / Co-Investment / custom) |
| Pipeline Status | Badge (New / Active / Archived / Ignored) |
| Pipeline Stage | Badge (Pre-Screening / Due Diligence / IC Review / Approved / Rejected) |
| Strategy Fit | Fit indicator — on hover, shows tooltip listing matched mandates with scores |
| Recommendation | Pass / Approve / Watch / — |
| Assigned To | User avatar + name |
| Date Received | Creation date |

**Strategy Fit hover tooltip:**
When hovering over the Fit column, a popover shows:
```
Matched Mandates:
• Growth Equity 2026 — Strong Fit
  "Strong sector alignment, within allocation range"
• Real Assets Fund II — Moderate Fit
  "Geographic match but allocation nearing capacity"
```

### 4.2 Opportunity Creation

**Two creation paths** (no Google Drive upload in creation dialog):

**Path 1: Manual Entry**
1. Click "Add Opportunity" → "Manual Entry"
2. Form fields:
   - Name (required)
   - Investment Type (dropdown from configured types)
   - Asset Manager (dropdown from existing + "Create New" option)
   - Assign To (dropdown of team members, defaults to self)
3. Creates opportunity with status `new`, stage `new`
4. Opens workspace for manual snapshot entry

**Path 2: File Upload**
1. Click "Add Opportunity" → "Upload Documents"
2. Fields:
   - Name (required)
   - Investment Type (dropdown)
   - Files (multi-file upload: PDF, DOCX, XLSX, PPTX)
3. Creates opportunity with status `processing`
4. Background job: vectorize files, extract snapshot, match mandates
5. When complete: status → `new`, stage → `new`

**Note:** Google Drive import is accessed from the Settings > Integrations page, not from the opportunity creation dialog.

### 4.3 Re-Processing on Document Upload

When a user uploads a new source document to an **existing** opportunity (from the workspace's Source Documents section):

1. Upload completes
2. System shows a confirmation dialog: **"Would you like to re-process this opportunity with the newly uploaded documents?"**
   - "Yes, re-process" → triggers background re-extraction of snapshot data using all source documents (existing + new). Snapshot fields are updated (not overwritten — new data merged with existing, AI resolves conflicts).
   - "No, just store" → file is stored as a source document but no re-processing occurs
3. If re-processing, the opportunity briefly shows a "Re-processing" indicator

### 4.4 Auto-Sorting for New Opportunities

When viewing the "New" pipeline status tab, opportunities are ranked by:
1. **Mandate fit** — strongest fit first (across all active mandates)
2. **Data completeness** — more snapshot fields populated ranks higher
3. **Date received** — newer first as tiebreaker

Top opportunities are visually highlighted in a "Top Matches" section at the top of the list.

### 4.5 Data Model

```sql
deals.opportunities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  name              VARCHAR(255) NOT NULL,
  investment_type_id UUID REFERENCES deals.investment_types(id),
  pipeline_status   VARCHAR(20) DEFAULT 'new',       -- 'processing', 'new', 'active', 'archived', 'ignored'
  pipeline_stage    VARCHAR(20) DEFAULT 'new',       -- 'new', 'pre_screening', 'due_diligence', 'ic_review', 'approved', 'rejected'
  asset_manager_id  UUID REFERENCES deals.asset_managers(id),
  assigned_to       UUID,
  snapshot_data     JSONB NOT NULL DEFAULT '{}',
  snapshot_citations JSONB DEFAULT '{}',             -- { fieldName: { sourceFileId, location, confidence } }
  source_type       VARCHAR(20) NOT NULL,            -- 'email', 'upload', 'manual', 'google_drive'
  source_email_id   UUID,
  mandate_fits      JSONB DEFAULT '[]',              -- [{ mandateId, fitScore, reasoning }]
  strategy_fit      VARCHAR(20),                     -- 'strong', 'moderate', 'limited', null (best fit across mandates)
  recommendation    VARCHAR(20),                     -- 'pass', 'approve', 'watch', null
  created_by        UUID NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
)

deals.source_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  opportunity_id  UUID NOT NULL REFERENCES deals.opportunities(id),
  file_name       VARCHAR(500) NOT NULL,
  file_url        TEXT NOT NULL,
  file_type       VARCHAR(50),
  file_size       BIGINT,
  vector_store_id VARCHAR(255),                      -- reference to vector DB
  processed       BOOLEAN DEFAULT false,
  source_origin   VARCHAR(20),                       -- 'email_attachment', 'upload', 'google_drive'
  created_at      TIMESTAMPTZ DEFAULT now()
)
```

### 4.6 API Endpoints

```
GET    /api/v1/deals/opportunities                           — List (filter: pipelineStatus, pipelineStage, assignedTo, q)
POST   /api/v1/deals/opportunities                           — Create (manual)
POST   /api/v1/deals/opportunities/upload                    — Create from file upload
GET    /api/v1/deals/opportunities/:id                       — Get detail
PUT    /api/v1/deals/opportunities/:id                       — Update (snapshot, status, stage, assignment)
DELETE /api/v1/deals/opportunities/:id                       — Delete (Owner only)
GET    /api/v1/deals/opportunities/:id/files                 — List source files
POST   /api/v1/deals/opportunities/:id/files                 — Upload source file
POST   /api/v1/deals/opportunities/:id/process               — Re-process (re-extract snapshot from all source files)
```

**RBAC:**
- `GET` list — Owner/Manager see all, Analyst sees own + shared
- `POST`, `PUT` — all roles (own opportunities)
- `DELETE` — Owner only
- Stage change to `approved`/`rejected` — Owner/Manager only

### 4.7 Background Jobs

| Job | Queue | Trigger | Description |
|-----|-------|---------|-------------|
| `process_opportunity` | `deals` | On creation from upload/email/drive | Orchestrates: vectorize → extract → match |
| `vectorize_files` | `deals` | On new source files | Vectorize file content into vector store |
| `extract_snapshot` | `deals` | After vectorization | LLM extracts snapshot fields using type config + instructions |
| `match_mandates` | `deals` | After extraction | Evaluate opportunity against all active mandates |
| `reprocess_opportunity` | `deals` | User triggers re-process | Re-runs extract + match with all source files |

### 4.8 Acceptance Criteria

- [ ] Opportunity list with pipeline status tab filters (with counts)
- [ ] Table with all specified columns
- [ ] Strategy Fit hover tooltip showing matched mandates with scores and reasoning
- [ ] Pipeline Stage badges with visual progression indicator
- [ ] "Add Opportunity" with Manual Entry and Upload Document paths
- [ ] File upload triggers background processing with `processing` status
- [ ] Processing completion transitions to `new` status
- [ ] Re-process confirmation dialog when uploading to existing opportunity
- [ ] Auto-sorting for New tab (fit → completeness → date)
- [ ] "Top Matches" visual highlight for top-ranked new opportunities
- [ ] Search by name, asset manager, sector
- [ ] Analyst sees only own opportunities (unless shared)
- [ ] Owner/Manager can set stage to approved/rejected
- [ ] Pipeline stage changes are tracked (audit log)

---

## 5. Workspace

**Route:** `/home/deals/opportunities/:id`  
**Access:** Owner/Manager can access any. Analyst can access own + shared.

The workspace is the core working area for an opportunity. It opens in **full-screen mode** — the left sidebar is hidden, replaced by a workspace-specific navigation panel.

### 5.1 Layout

```
+------------------------------------------------------------------+
| ← Back to Opportunities    [Opportunity Name]    [Status] [Stage] |
|  Strategy Fit: Strong  |  Recommendation: Approve  |  Assigned: JD |
+------------------+-----------------------------------------------+
|                  |                                                 |
|  LEFT PANEL      |   MAIN CONTENT AREA                            |
|                  |                                                 |
|  Deliverables    |   (TipTap Editor / Snapshot / Notes / Files)   |
|  ├ Investment Memo|                                                |
|  ├ Pre-Screening |   Copilot panel (collapsible right side)       |
|  └ + New         |                                                 |
|                  |                                                 |
|  Notes           |                                                 |
|                  |                                                 |
|  Source Documents|                                                 |
|  ├ pitch.pdf     |                                                 |
|  ├ terms.docx    |                                                 |
|  └ + Upload      |                                                 |
|                  |                                                 |
|  Snapshot        |                                                 |
|                  |                                                 |
+------------------+-----------------------------------------------+
| Undo | Redo | Save | Share | Send for Validation | Download        |
+------------------------------------------------------------------+
```

**Header bar:**
- Back button (returns to opportunity list)
- Opportunity name (editable inline)
- Pipeline Status badge
- Pipeline Stage badge (clickable to advance — Manager/Owner only for approve/reject)
- Strategy Fit indicator
- Recommendation indicator
- Assigned user

**Left panel (collapsible):**
- **Deliverables** — list of created documents (TipTap-based)
  - Click to open in main content area
  - "+ New" to create a new deliverable
- **Notes** — click to open the simple canvas
- **Source Documents** — list of uploaded/imported files
  - Click to preview (read-only)
  - "+ Upload" to add new source documents (triggers re-process prompt)
- **Snapshot** — click to view/edit the structured snapshot data

**Main content area:**
- Renders the selected item (deliverable editor, snapshot form, notes canvas, file preview)
- Full width of remaining space

**Bottom action bar:**
- Undo / Redo buttons (keyboard: Cmd+Z / Cmd+Shift+Z)
- Save button
- Share button
- "Send for Validation" button
- Download (PDF / Word)

### 5.2 Deliverables (TipTap Editor)

Deliverables are documents created within the workspace using a rich text editor.

**Creating a deliverable:**
1. Click "+ New" under Deliverables in the left panel
2. Select document type: Investment Memo, Pre-Screening Report, DDQ, News/Insights, Market Analysis, Custom
3. Enter document name
4. System generates initial content using:
   - The configured prompt template for this investment type + document type
   - Snapshot data (field values)
   - Vectorized source documents (RAG)
5. Generated content opens in TipTap editor for review and editing

**TipTap Editor capabilities:**
- Full rich text editing (headings, bold, italic, underline, strikethrough)
- Bullet lists, numbered lists, checklists
- Tables
- Images (upload, paste, drag-and-drop)
- Logos and branding elements
- Code blocks
- Blockquotes
- Horizontal rules
- Links
- Font size and color
- Text alignment
- Undo / redo (integrated with workspace undo stack)

**Export:**
- **PDF export** — renders the TipTap content to a high-fidelity PDF. Must preserve formatting, images, tables, and branding.
- **Word (.docx) export** — converts to a Word document that can be further edited in Microsoft Word or Google Docs. Must maintain structure and formatting.
- Both exports should be professional-quality — suitable for sending to external parties (asset managers, investment committees).

**Document status:** Each deliverable has a status: `draft` | `in_review` | `approved`

### 5.3 Notes (Simple Canvas)

A lightweight drawing and note-taking space for brainstorming.

**Capabilities:**
- Freehand drawing (pen tool with color/thickness)
- Basic shapes (rectangle, circle, line, arrow)
- Text notes (click to add text anywhere on the canvas)
- Sticky notes (colored note blocks)
- Image placement (upload or paste)
- Pan and zoom (infinite canvas)
- Eraser tool
- Select and move elements
- Undo / redo (integrated with workspace undo stack)

**Not included:** Connectors, flowchart tools, collaboration cursors, templates. Keep it simple.

**Persistence:** Canvas state is saved as JSON to the backend. Auto-save on changes (debounced).

### 5.4 Snapshot Panel

Displays all fields defined for this opportunity's investment type.

- Organized by sections (from the investment type's snapshot config)
- Each field shows:
  - Field name and description
  - Current value (editable inline)
  - Citation indicator (if AI-extracted): shows source file name + location on hover
  - Empty fields are visually indicated for manual completion
- Edit any field inline
- Changes are part of the undo/redo stack

### 5.5 Source Documents

- List of all files associated with this opportunity (from email import, upload, or Drive)
- Click to preview (PDF viewer for PDFs, rendered for supported types)
- "+ Upload" to add new files
  - On upload, show re-process confirmation dialog (see section 4.3)
- File metadata: name, type, size, processed status, source origin

### 5.6 Comments

Each deliverable (document) supports comments:

- **Inline comments:** Select text in the TipTap editor → "Add Comment" → comment appears as a highlight with a sidebar thread
- **General comments:** Comment thread at the bottom of the document (not tied to specific text)
- Each comment shows: author, timestamp, content
- Reply to comments (threaded)
- Resolve comments (collapses the thread)
- Comments create notifications in the deals notification panel

**Data Model:**
```sql
deals.document_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  document_id     UUID NOT NULL REFERENCES deals.documents(id),
  parent_id       UUID REFERENCES deals.document_comments(id),  -- for replies
  author_id       UUID NOT NULL,
  content         TEXT NOT NULL,
  text_range      JSONB,                            -- { from, to } for inline comments, null for general
  resolved        BOOLEAN DEFAULT false,
  resolved_by     UUID,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)
```

### 5.7 Undo / Redo

The workspace maintains a unified undo/redo stack across:
- Snapshot field edits
- Deliverable content changes (TipTap)
- Notes canvas changes

**Behavior:**
- Cmd+Z / Ctrl+Z to undo
- Cmd+Shift+Z / Ctrl+Shift+Z to redo
- Undo/Redo buttons in the bottom action bar
- Stack is per-session (cleared on page navigation)
- Each action in the stack records: action type, target (snapshot/document/notes), before/after state

### 5.8 Copilot

The workspace includes the platform's copilot panel (collapsible on the right side).

**Standard mode (default):**
- Chat interface for asking questions about the opportunity
- Context-aware: knows the current opportunity, snapshot data, source documents, deliverables
- Can answer questions like "What is the target IRR?" or "Summarize the risk factors from the source documents"

**Agent mode (toggle):**
- Activated via a toggle switch in the copilot panel header
- When in agent mode, the copilot can **suggest edits** to the active deliverable
- Workflow:
  1. User types instruction: "Add a section about ESG considerations based on the source documents"
  2. Copilot generates suggested changes as a diff
  3. User sees a visual diff overlay on the document (insertions highlighted green, deletions in red)
  4. User can: Accept All | Reject All | Accept/Reject individual changes
  5. Accepted changes are applied to the document and added to the undo stack
- Agent mode only works when a deliverable (TipTap document) is active in the main content area
- Agent has read access to: snapshot data, all source documents, all other deliverables, notes

### 5.9 Data Model (Documents)

```sql
deals.documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  opportunity_id  UUID NOT NULL REFERENCES deals.opportunities(id),
  template_id     UUID REFERENCES deals.document_templates(id),
  name            VARCHAR(500) NOT NULL,
  document_type   VARCHAR(50) NOT NULL,              -- 'investment_memo', 'pre_screening', 'ddq', 'news', 'market_analysis', 'custom', 'note'
  content         TEXT,                               -- TipTap JSON content
  status          VARCHAR(20) DEFAULT 'draft',        -- 'draft', 'in_review', 'approved'
  version         INTEGER DEFAULT 1,
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)

-- Notes canvas state (one per opportunity)
deals.opportunity_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  opportunity_id  UUID NOT NULL REFERENCES deals.opportunities(id),
  canvas_data     JSONB NOT NULL DEFAULT '{}',        -- Canvas state as JSON
  updated_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, opportunity_id)
)
```

### 5.10 API Endpoints

```
-- Workspace data
GET    /api/v1/deals/opportunities/:id/workspace             — Get full workspace state (snapshot, documents, files, notes)

-- Documents (deliverables)
GET    /api/v1/deals/opportunities/:id/documents              — List documents
POST   /api/v1/deals/opportunities/:id/documents              — Create document (triggers AI generation)
GET    /api/v1/deals/opportunities/:id/documents/:docId       — Get document content
PUT    /api/v1/deals/opportunities/:id/documents/:docId       — Update document content
DELETE /api/v1/deals/opportunities/:id/documents/:docId       — Delete document

-- Document export
POST   /api/v1/deals/opportunities/:id/documents/:docId/export  — Export as PDF or Word (?format=pdf|docx)

-- Comments
GET    /api/v1/deals/documents/:docId/comments                — List comments for document
POST   /api/v1/deals/documents/:docId/comments                — Add comment
PUT    /api/v1/deals/documents/:docId/comments/:commentId     — Edit / resolve comment
DELETE /api/v1/deals/documents/:docId/comments/:commentId     — Delete comment

-- Notes canvas
GET    /api/v1/deals/opportunities/:id/notes                  — Get notes canvas state
PUT    /api/v1/deals/opportunities/:id/notes                  — Save notes canvas state

-- Source files
GET    /api/v1/deals/opportunities/:id/files                  — List source files
POST   /api/v1/deals/opportunities/:id/files                  — Upload source file
DELETE /api/v1/deals/opportunities/:id/files/:fileId          — Delete source file

-- AI / Copilot
POST   /api/v1/deals/opportunities/:id/copilot/chat           — Send message to copilot (standard mode)
POST   /api/v1/deals/opportunities/:id/copilot/suggest        — Request agent mode suggestion for active document
```

### 5.11 Background Jobs

| Job | Queue | Trigger | Description |
|-----|-------|---------|-------------|
| `generate_document` | `deals` | User creates new deliverable | AI generates document from template + snapshot + source files |
| `export_document` | `deals` | User requests PDF/Word export | Convert TipTap content to PDF or DOCX |

### 5.12 Acceptance Criteria

- [ ] Workspace opens in full-screen mode (sidebar hidden)
- [ ] Left panel shows Deliverables, Notes, Source Documents, Snapshot sections
- [ ] Click deliverable to open in TipTap editor
- [ ] TipTap supports all specified formatting (headings, lists, tables, images, etc.)
- [ ] Create new deliverable with type selection and AI generation
- [ ] AI-generated content is editable immediately
- [ ] PDF export produces professional-quality output preserving formatting
- [ ] Word export produces editable .docx preserving structure
- [ ] Notes canvas supports freehand drawing, shapes, text, sticky notes, images
- [ ] Snapshot panel shows all fields organized by section
- [ ] Snapshot fields editable inline with citation indicators
- [ ] Source document upload with re-process confirmation dialog
- [ ] Inline and general comments on deliverables
- [ ] Comment threads with replies and resolve functionality
- [ ] Undo/Redo works across snapshot, documents, and notes (Cmd+Z / Cmd+Shift+Z)
- [ ] Copilot chat panel with standard mode (Q&A)
- [ ] Agent mode toggle with suggest-and-accept workflow
- [ ] Agent suggestions shown as visual diff on document
- [ ] Accept/Reject individual or all changes from agent suggestions
- [ ] Header shows opportunity status, stage, fit, recommendation
- [ ] Bottom action bar with Undo, Redo, Save, Share, Validate, Download

---

## 6. Collaboration & Sharing

### 6.1 Document-Level Sharing

Users can share individual deliverables (documents) with other team members. Sharing is at the **document level**, not the opportunity level.

**Share dialog:**
1. Click "Share" button in workspace (or right-click a deliverable)
2. Dialog shows:
   - Document name being shared
   - "Add people" field — search/select team members
   - Access level per person: **Read** | **Read/Write**
   - List of current shares (with ability to change access or remove)
3. Shared users receive a notification
4. Shared users can access the document from their notifications panel or via direct link

**Access rules:**
- **Read:** Can view the document, cannot edit. Can add comments.
- **Read/Write:** Can view and edit the document. Can add comments.
- An analyst who has been shared a document can see it within the opportunity workspace (they get read access to the opportunity metadata — name, status, stage — but not to other unshared documents in that opportunity).

### 6.2 Validation Workflow

"Send for Validation" allows any user to request a Manager or Owner to review and approve deliverables.

**Flow:**
1. User clicks "Send for Validation" in workspace
2. Dialog:
   - Select which deliverables to include in the review
   - Select reviewer (dropdown of Managers and Owners)
   - Optional message
3. Creates a review request
4. Reviewer receives notification
5. Reviewer opens the documents — they see the TipTap editor in read-only mode with ability to:
   - Add inline comments
   - Add general comments
   - Approve the document(s)
   - Request changes (with rationale)
6. On approval:
   - System auto-generates a rationale summarizing all comments, discussions, and resolutions
   - Reviewer can edit the generated rationale before finalizing
   - Document status changes to `approved`
   - Rationale stored as permanent audit trail
7. On "Request Changes":
   - Document status stays `in_review`
   - Analyst sees comments and addresses them
   - Analyst can re-submit for validation

**Who can validate:** Only Manager and Owner roles can approve or request changes. Analysts cannot.

### 6.3 Data Model

```sql
deals.document_shares (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  document_id     UUID NOT NULL REFERENCES deals.documents(id),
  shared_with     UUID NOT NULL,                     -- user receiving access
  shared_by       UUID NOT NULL,                     -- user granting access
  permission      VARCHAR(20) DEFAULT 'read',        -- 'read', 'read_write'
  created_at      TIMESTAMPTZ DEFAULT now()
)

deals.document_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  reviewer_id     UUID NOT NULL,
  requested_by    UUID NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending',     -- 'pending', 'in_review', 'approved', 'changes_requested'
  rationale       TEXT,                               -- AI-generated + reviewer-edited rationale
  rationale_generated BOOLEAN DEFAULT false,
  message         TEXT,                               -- optional message from requester
  requested_at    TIMESTAMPTZ DEFAULT now(),
  reviewed_at     TIMESTAMPTZ
)

deals.document_review_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id       UUID NOT NULL REFERENCES deals.document_reviews(id),
  document_id     UUID NOT NULL REFERENCES deals.documents(id),
  UNIQUE(review_id, document_id)
)
```

### 6.4 API Endpoints

```
-- Sharing
POST   /api/v1/deals/documents/:docId/share              — Share document with users
GET    /api/v1/deals/documents/:docId/shares              — List shares for document
PUT    /api/v1/deals/documents/:docId/shares/:shareId     — Update permission
DELETE /api/v1/deals/documents/:docId/shares/:shareId     — Remove share

-- Reviews / Validation
POST   /api/v1/deals/reviews                              — Create review request
GET    /api/v1/deals/reviews                              — List reviews (filter: myRequests, assignedToMe, status)
GET    /api/v1/deals/reviews/:id                          — Get review detail
PUT    /api/v1/deals/reviews/:id                          — Approve / request changes (with rationale)
POST   /api/v1/deals/reviews/:id/generate-rationale       — AI-generate rationale from comments
```

**RBAC:**
- All roles can create shares and review requests
- Only Manager/Owner can approve or request changes on reviews

### 6.5 Acceptance Criteria

- [ ] Share dialog with user search, access level selection (Read / Read/Write)
- [ ] Shared users listed with ability to change access or remove
- [ ] Shared user receives notification
- [ ] Analyst can see shared documents within opportunity workspace
- [ ] Read access allows viewing + commenting, not editing
- [ ] Read/Write allows full editing
- [ ] "Send for Validation" dialog with document selection and reviewer selection
- [ ] Reviewer sees documents in read-only mode with comment ability
- [ ] Reviewer can approve or request changes
- [ ] Auto-generated rationale on approval (editable before finalizing)
- [ ] Document status transitions: draft → in_review → approved / changes_requested
- [ ] Re-submission after changes requested
- [ ] Only Manager/Owner can approve

---

## 7. Asset Managers

**Route:** `/home/deals/asset-managers` (list), `/home/deals/asset-managers/:id` (detail)  
**Access:** All roles (CRUD for all)

### 7.1 Asset Manager List Page

- **Search:** By name, type, location
- **Filter:** By type (Venture Capital, Private Equity, Real Estate, Hedge Fund, Infrastructure, etc.)
- **"Add Asset Manager" button** — manual creation
- **Table columns:** Name, Type, Location, Firm AUM, Total Opportunities, Last Activity Date
- Click row to open detail page

### 7.2 Asset Manager Detail Page

Structured profile:

**Basic Information:**
- Name, Type, Location, Description

**Fund Information:**
- Fund Size, Vintage Year, Fund Raised Till Date, Fund Closing Timeline

**Firm Information:**
- Firm AUM, Years in Business, Number of Previous Funds, Investment Team Size

**Strategy & Positioning:**
- Fund Strategy, USP & Differentiator, Key Person Risk

**Characteristics:**
- Flexible key-value fields (additional metadata)

**Metadata (system-managed):**
- Created Date, Created By (System / user name), Last Modified, Total Opportunities

**Linked Opportunities:**
- List of all opportunities sourced from this asset manager
- Shows: opportunity name, investment type, pipeline status, stage, date

### 7.3 Auto-Creation & Enrichment

| Trigger | Behavior |
|---------|----------|
| New opportunity from email | Check if sender domain/name matches existing manager. If not, auto-create with `createdByType: 'system'`. Populate fields from available data via LLM extraction. |
| Subsequent opportunities from same manager | Enrich existing record with new data from source materials |
| Manual creation | User clicks "Add Asset Manager", fills fields manually. `createdByType: 'manual'` |

### 7.4 Data Model

```sql
deals.asset_managers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  name            VARCHAR(255) NOT NULL,
  type            VARCHAR(100),
  location        VARCHAR(255),
  description     TEXT,
  fund_info       JSONB DEFAULT '{}',
  firm_info       JSONB DEFAULT '{}',
  strategy        JSONB DEFAULT '{}',
  characteristics JSONB DEFAULT '{}',
  created_by_type VARCHAR(50) DEFAULT 'manual',      -- 'system' or 'manual'
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)
```

### 7.5 API Endpoints

```
GET    /api/v1/deals/asset-managers                        — List (filter: type, q)
POST   /api/v1/deals/asset-managers                        — Create (manual)
GET    /api/v1/deals/asset-managers/:id                    — Get detail
PUT    /api/v1/deals/asset-managers/:id                    — Update
DELETE /api/v1/deals/asset-managers/:id                    — Delete (Owner only)
GET    /api/v1/deals/asset-managers/:id/opportunities      — Linked opportunities
```

### 7.6 Acceptance Criteria

- [ ] Asset manager list with search and type filter
- [ ] Create new asset manager with all profile fields
- [ ] Detail page with all sections (Basic, Fund, Firm, Strategy, Characteristics)
- [ ] Linked opportunities list on detail page
- [ ] Auto-creation from email imports with system badge
- [ ] Enrichment of existing records when new data arrives
- [ ] All roles can CRUD asset managers
- [ ] Delete restricted to Owner

---

## 8. News & Intelligence

**Route:** `/home/deals/news`  
**Access:** All roles

### 8.1 News Feed

AI-generated news feed relevant to the firm's active opportunities and mandates.

**Layout:**
- Chronologically sorted feed
- Each item shows: headline, summary (2-3 sentences), category tag, timestamp, linked opportunities
- **Category filters:** Market | Sector | Asset Manager | Regulatory
- Date range filter
- Search by keyword

**News sources (AI-generated based on):**
- Active opportunities (sectors, geographies, asset managers)
- Active mandates (target sectors, strategies)
- General market/deals landscape

### 8.2 News Actions

| Action | Description |
|--------|-------------|
| **Click headline** | Opens full news content or navigates to source URL |
| **View linked opportunities** | Shows which opportunities this news relates to |
| **Notify team member** | Opens a small dialog to select a team member and send them a notification about this news item with an optional message |

### 8.3 Data Model

```sql
deals.news_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  headline        VARCHAR(500) NOT NULL,
  summary         TEXT,
  full_content    TEXT,
  category        VARCHAR(50),                       -- 'market', 'sector', 'asset_manager', 'regulatory'
  source_url      TEXT,
  generated_at    TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
)

deals.news_opportunity_links (
  news_item_id    UUID NOT NULL REFERENCES deals.news_items(id),
  opportunity_id  UUID NOT NULL REFERENCES deals.opportunities(id),
  PRIMARY KEY (news_item_id, opportunity_id)
)

deals.news_notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  news_item_id    UUID NOT NULL REFERENCES deals.news_items(id),
  sent_by         UUID NOT NULL,
  sent_to         UUID NOT NULL,
  message         TEXT,                              -- optional note from sender
  read            BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
)
```

### 8.4 API Endpoints

```
GET    /api/v1/deals/news                                  — List news (filter: category, q, dateRange)
GET    /api/v1/deals/news/:id                              — Get full news item
POST   /api/v1/deals/news/generate                         — Trigger news generation (background)
POST   /api/v1/deals/news/:id/notify                       — Notify team member about news item
```

### 8.5 Background Jobs

| Job | Queue | Trigger | Description |
|-----|-------|---------|-------------|
| `generate_news` | `deals` | Periodic (daily) + manual trigger | AI generates news based on active opportunities and mandates |

### 8.6 Acceptance Criteria

- [ ] News feed with chronological sort
- [ ] Category filter tabs (Market/Sector/Asset Manager/Regulatory)
- [ ] Search and date range filtering
- [ ] Click headline to view full content or open source URL
- [ ] Linked opportunities shown per news item
- [ ] "Notify" action to send news to a team member with optional message
- [ ] Notifications appear in the deals notification panel for the recipient
- [ ] News generation runs daily (background) and can be triggered manually

---

## 9. Dashboard

**Route:** `/home/deals/`  
**Access:** All roles. Team breakdown visible to Manager/Owner only.

### 9.1 Time Filter

A flexible date range filter at the top of the dashboard:
- **Presets:** This Quarter (default), Last Quarter, Year to Date, Last 12 Months, Custom
- **Custom:** Start date / End date pickers
- All dashboard sections filter by the selected time range

### 9.2 Dashboard Sections

**1. Pipeline Summary**
- Card row showing opportunity counts by pipeline status (New, Active, Archived, Ignored)
- Total deal value per status
- Clickable cards to navigate to the filtered Opportunities list

**2. Pipeline Funnel**
- Visual chart showing opportunities flowing through pipeline stages
- New → Pre-Screening → Due Diligence → IC Review → Approved
- Shows counts and conversion rates between stages
- Time-range filtered

**3. My Tasks**
- Action items for the current user:
  - Documents pending review
  - Opportunities needing attention (e.g., snapshot incomplete)
  - Validation requests awaiting response
  - Tasks assigned to me
- Each item links to the relevant workspace or document

**4. Allocation Overview**
- Per active mandate: target allocation vs. current allocated
- Shown as progress bars
- Links to mandate detail page

**5. Team Activity (Manager/Owner only)**
- Who is working on what:
  - User name, opportunity name, last activity timestamp, pipeline status/stage
- Breakdown per team member: number of opportunities, documents created, reviews completed

**6. Recent News**
- Top 5 news items from the feed
- "View all" link to News page

### 9.3 API Endpoints

```
GET    /api/v1/deals/dashboard/summary?from=&to=         — Pipeline stats, allocation, task counts
GET    /api/v1/deals/dashboard/funnel?from=&to=          — Pipeline funnel data
GET    /api/v1/deals/dashboard/activity?from=&to=        — Team activity (Manager/Owner)
GET    /api/v1/deals/dashboard/tasks                     — Current user's pending tasks
```

### 9.4 Acceptance Criteria

- [ ] Flexible date range filter with presets (default: current quarter)
- [ ] Pipeline summary cards with counts and values per status
- [ ] Pipeline funnel chart with stage progression and conversion rates
- [ ] My Tasks section with linked action items
- [ ] Allocation overview per mandate with progress bars
- [ ] Team activity section (Manager/Owner only) showing per-user breakdown
- [ ] Recent news widget with "View all" link
- [ ] All sections respect the selected time range
- [ ] Cards clickable to navigate to filtered views

---

## 10. Events & Tasks

**Route:** `/home/deals/events`  
**Access:** All roles

### 10.1 Events (Google Calendar Integration)

Users can create events that sync with Google Calendar.

**Creating an event:**
1. Click "Create Event"
2. Form fields:
   - Title (required)
   - Date and time (start / end)
   - Description
   - Attendees (search/select from team members — their email addresses)
   - Linked opportunity (optional dropdown)
   - Location (optional)
3. On save:
   - Creates event in the platform
   - If user has Google Calendar connected: creates the event in Google Calendar with attendees
   - Attendees receive calendar invitations via Google Calendar

**Calendar sidebar:**
- Right side of the Events & Tasks page shows a calendar widget
- Displays upcoming events (week or month view)
- Events synced from Google Calendar (bi-directional: events created in Google Calendar also appear)
- Click an event to view/edit details

**Google Calendar sync:**
- Uses OAuth 2.0 (same consent as Settings > Integrations)
- Bi-directional: platform events → Google Calendar, Google Calendar events → platform (filtered by relevant calendars)
- Sync runs periodically + on event creation

### 10.2 Tasks (Simple Task List)

A lightweight task management feature for team coordination.

**Task properties:**

| Field | Type | Description |
|-------|------|-------------|
| Title | text | What needs to be done (required) |
| Assignee | user select | Who should do it (required) |
| Due Date | date | When it's due (optional) |
| Done | boolean | Is it completed? |
| Linked Opportunity | select | Optional link to an opportunity |
| Created By | auto | User who created the task |

**Task list UI:**
- Simple list/table view
- Filter: My Tasks | All Tasks (Manager/Owner) | Assigned by Me
- Sort: by due date, by creation date
- Check/uncheck to mark done
- Overdue tasks highlighted in red
- Click to expand/edit inline

**Assignment:**
- Any role can create tasks and assign to any team member in the same organization
- Assignee receives a notification
- Task creator can see task status

### 10.3 Data Model

```sql
deals.events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ,
  location        VARCHAR(255),
  opportunity_id  UUID REFERENCES deals.opportunities(id),
  google_event_id VARCHAR(255),                      -- Google Calendar event ID for sync
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)

deals.event_attendees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES deals.events(id),
  user_id         UUID NOT NULL,
  email           VARCHAR(255) NOT NULL,
  rsvp_status     VARCHAR(20) DEFAULT 'pending',     -- 'pending', 'accepted', 'declined', 'tentative'
  created_at      TIMESTAMPTZ DEFAULT now()
)

deals.tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  title           VARCHAR(255) NOT NULL,
  assignee_id     UUID NOT NULL,
  due_date        DATE,
  done            BOOLEAN DEFAULT false,
  opportunity_id  UUID REFERENCES deals.opportunities(id),
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)
```

### 10.4 Google Calendar Integration Details

**OAuth scopes required:**
- `https://www.googleapis.com/auth/calendar.events` — create and manage events
- `https://www.googleapis.com/auth/calendar.readonly` — read calendar events for sync

**Token storage:** Reuses `deals.google_calendar_accounts` table (follows same pattern as email/drive accounts):

```sql
deals.google_calendar_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  user_id         UUID NOT NULL,
  email_address   VARCHAR(255),
  access_token    TEXT,                              -- encrypted
  refresh_token   TEXT,                              -- encrypted
  token_expires_at TIMESTAMPTZ,
  status          VARCHAR(20) DEFAULT 'connected',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id)
)
```

### 10.5 API Endpoints

```
-- Events
GET    /api/v1/deals/events?from=&to=                    — List events in date range
POST   /api/v1/deals/events                              — Create event (+ Google Calendar sync)
GET    /api/v1/deals/events/:id                          — Get event detail
PUT    /api/v1/deals/events/:id                          — Update event
DELETE /api/v1/deals/events/:id                          — Delete event
POST   /api/v1/deals/events/sync                         — Trigger calendar sync

-- Tasks
GET    /api/v1/deals/tasks?assigneeId=&done=             — List tasks
POST   /api/v1/deals/tasks                               — Create task
PUT    /api/v1/deals/tasks/:id                           — Update task (mark done, reassign)
DELETE /api/v1/deals/tasks/:id                           — Delete task

-- Google Calendar accounts
GET    /api/v1/deals/integrations/google-calendar        — Get calendar account
POST   /api/v1/deals/integrations/google-calendar        — Connect (OAuth)
DELETE /api/v1/deals/integrations/google-calendar/:id    — Disconnect
```

### 10.6 Background Jobs

| Job | Queue | Trigger | Description |
|-----|-------|---------|-------------|
| `sync_google_calendar` | `integrations` | Periodic (every 15 min) + manual | Bi-directional sync of calendar events |
| `create_google_calendar_event` | `integrations` | On event creation | Creates event in Google Calendar with attendees |

### 10.7 Acceptance Criteria

- [ ] Create event with title, date/time, description, attendees, linked opportunity
- [ ] Event creates Google Calendar event if calendar connected
- [ ] Attendees receive Google Calendar invitations
- [ ] Calendar sidebar shows upcoming events (week/month view)
- [ ] Bi-directional sync: Google Calendar events appear in platform
- [ ] Create task with title, assignee, due date, optional linked opportunity
- [ ] Task list with filters (My Tasks / All Tasks / Assigned by Me)
- [ ] Check/uncheck to toggle done status
- [ ] Overdue tasks highlighted
- [ ] Assignee receives notification on task assignment
- [ ] Tasks visible to: assignee always, creator always, Manager/Owner see all
- [ ] Analyst can only see own tasks

---

## 11. Cross-Cutting Concerns

### 11.1 Deals Notification Panel

A notification panel **within the Deals module** (not platform-wide). Accessible from the sidebar notification icon with a badge count.

**Notification types:**

| Type | Trigger | Recipient |
|------|---------|-----------|
| `comment_added` | New comment on a shared/own document | Document owner + shared users |
| `comment_reply` | Reply to a comment | Comment author |
| `review_requested` | Validation request created | Reviewer |
| `review_completed` | Review approved or changes requested | Request creator |
| `document_shared` | Document shared with user | Shared user |
| `news_notification` | Team member notified about news | Notified user |
| `task_assigned` | Task assigned to user | Assignee |
| `task_overdue` | Task past due date | Assignee |
| `processing_complete` | Opportunity finished processing | Creator |
| `opportunity_stage_changed` | Pipeline stage changed | Assigned user |

**UI:**
- Panel slides in from the sidebar or opens as a dropdown
- Notifications grouped by date (Today, Yesterday, Earlier)
- Each notification: icon, description, timestamp, link to relevant item
- Mark as read (individual or all)
- Unread count shown as badge in sidebar

**Data Model:**

```sql
deals.notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  user_id         UUID NOT NULL,                     -- recipient
  type            VARCHAR(50) NOT NULL,
  title           VARCHAR(255) NOT NULL,
  message         TEXT,
  link            TEXT,                               -- deep link to relevant page/item
  related_id      UUID,                               -- ID of related entity (document, review, task, etc.)
  read            BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
)
```

**API:**

```
GET    /api/v1/deals/notifications?unreadOnly=true       — List notifications
PUT    /api/v1/deals/notifications/:id/read              — Mark as read
PUT    /api/v1/deals/notifications/read-all              — Mark all as read
GET    /api/v1/deals/notifications/count                 — Get unread count
```

### 11.2 Background Processing Architecture

All heavy processing runs via Celery background tasks:

```
server/app/tasks/
├── deals_processing.py          # process_opportunity, extract_snapshot, vectorize_files, match_mandates, reprocess_opportunity
├── deals_email_sync.py          # sync_gmail_account, import_email_as_opportunity
├── deals_gdrive.py              # import_google_drive_folder
├── deals_news.py                # generate_news
├── deals_documents.py           # generate_document, export_document
├── deals_calendar.py            # sync_google_calendar, create_google_calendar_event
├── deals_notifications.py       # create_notification (reusable)
```

**Processing pipeline flow:**

```
Source (email/upload/drive)
  → vectorize_files (store in vector DB)
  → extract_snapshot (LLM uses investment type config + instructions)
  → match_mandates (evaluate against all active mandates)
  → create_notification (notify creator that processing is complete)
```

**Retry policy:**
- Most tasks: 3 retries with exponential backoff
- Google Drive import: no retry (tracks progress in DB, can be re-triggered manually)
- Calendar sync: 3 retries

### 11.3 Google OAuth Management

Three Google integrations share a similar OAuth pattern:

| Integration | Scopes | Token Table |
|------------|--------|-------------|
| Gmail | `gmail.readonly`, `gmail.send` | `deals.email_accounts` |
| Google Drive | `drive.readonly` | `deals.google_drive_accounts` |
| Google Calendar | `calendar.events`, `calendar.readonly` | `deals.google_calendar_accounts` |

**Shared behavior:**
- OAuth 2.0 authorization code flow
- Tokens encrypted at rest in the database
- Automatic token refresh before expiry
- One account per user per service
- Status tracking: `connected` / `disconnected` / `error`
- Error state when refresh fails (user must re-authenticate)

### 11.4 AI Integration Points

| Feature | AI Involvement | Input | Output |
|---------|---------------|-------|--------|
| Snapshot extraction | Automatic on opportunity processing | Source documents + investment type field config + instructions | Populated snapshot fields with citations |
| Mandate matching | Automatic after extraction | Snapshot data + all active mandates | Fit scores (Strong/Moderate/Weak) + reasoning per mandate |
| Document generation | On deliverable creation | Prompt template + snapshot data + source documents (RAG) | Generated document content |
| Copilot chat | On user message | User message + opportunity context (snapshot, docs, files) | Chat response |
| Agent suggestions | On user request in agent mode | User instruction + current document + opportunity context | Suggested document edits (diff) |
| Review rationale | On approval | All comments and discussions from review | Summary rationale text |
| Asset manager enrichment | On opportunity processing | Source documents | Asset manager fields |
| News generation | Periodic + manual | Active opportunities + mandates + market data | News items with headlines, summaries, linked opportunities |

All AI calls are proxied through the backend — the frontend never calls LLM providers directly.

### 11.5 Audit Logging

All significant actions emit audit logs via `tasks.audit.write_audit_log`:

- Opportunity CRUD and status/stage changes
- Mandate CRUD and status changes
- Document creation, editing, status changes
- Review requests and approvals (with rationale)
- Sharing actions
- Asset manager changes
- Email imports and ignore actions
- Google Drive imports
- Settings changes (investment types, templates)
- Task creation and completion
- Event creation

### 11.6 Indexes

```sql
CREATE INDEX idx_opportunities_tenant_status ON deals.opportunities(tenant_id, pipeline_status);
CREATE INDEX idx_opportunities_tenant_stage ON deals.opportunities(tenant_id, pipeline_stage);
CREATE INDEX idx_opportunities_tenant_assigned ON deals.opportunities(tenant_id, assigned_to);
CREATE INDEX idx_opportunities_asset_manager ON deals.opportunities(asset_manager_id);
CREATE INDEX idx_documents_opportunity ON deals.documents(opportunity_id);
CREATE INDEX idx_document_comments_document ON deals.document_comments(document_id);
CREATE INDEX idx_document_reviews_reviewer ON deals.document_reviews(reviewer_id, status);
CREATE INDEX idx_document_shares_shared_with ON deals.document_shares(shared_with);
CREATE INDEX idx_emails_tenant_account ON deals.emails(tenant_id, email_account_id);
CREATE INDEX idx_emails_import_status ON deals.emails(tenant_id, import_status);
CREATE INDEX idx_mandates_tenant_status ON deals.mandates(tenant_id, status);
CREATE INDEX idx_asset_managers_tenant ON deals.asset_managers(tenant_id);
CREATE INDEX idx_source_files_opportunity ON deals.source_files(opportunity_id);
CREATE INDEX idx_news_items_tenant ON deals.news_items(tenant_id);
CREATE INDEX idx_notifications_user_read ON deals.notifications(user_id, read);
CREATE INDEX idx_tasks_tenant_assignee ON deals.tasks(tenant_id, assignee_id);
CREATE INDEX idx_events_tenant_date ON deals.events(tenant_id, start_at);
```

### 11.7 RLS Policies

All tenant-scoped tables have Row Level Security enabled:
```sql
ALTER TABLE deals.<table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON deals.<table>
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

The backend middleware sets `app.current_tenant` per request based on the JWT token's `tenant_id` claim.

---

## Appendix A: Default Snapshot Field Sets

See the existing design spec ([2026-04-11-deals-module-design.md](2026-04-11-deals-module-design.md), Appendix A) for the complete default snapshot configurations. Summary:

| Type | Sections | Fields | Notes |
|------|----------|--------|-------|
| Fund | 6 | ~50 | Deal Overview, Fund Terms, Target Economics, GP Assessment, Allocation & Fit, Risk Factors |
| Direct | 6 | ~50 | Deal Overview, Company Fundamentals, Financial Overview, Transaction Terms, Investment Thesis, Risk Factors |
| Co-Investment | 6 | ~50 | Deal Overview, Company Fundamentals, Financial Overview, Transaction Terms, GP Assessment, Investment Thesis |
| Other | 3 | ~20 | Deal Overview, Financial Terms, Risk & Assessment |

**Change from original spec:** The `required` field property has been removed. All fields are optional. The `instruction` field (AI extraction prompt) remains.

## Appendix B: Default Document Templates

See the existing design spec ([2026-04-11-deals-module-design.md](2026-04-11-deals-module-design.md), Appendix B) for the complete default prompt templates.

| Document Type | Available For |
|--------------|---------------|
| Investment Memo | All investment types |
| Pre-Screening Report | All investment types |
| DDQ (Due Diligence Questionnaire) | All investment types |
| Market Analysis | All investment types |
| News/Insights | All investment types |

Templates use `{{variable}}` syntax to reference snapshot fields. Each template includes role framing, section definitions, tone, and length specifications for the AI.

## Appendix C: Frontend File Structure

```
client/src/modules/deals/
├── pages/
│   ├── DealsLayout.tsx
│   ├── DashboardPage.tsx
│   ├── MandateListPage.tsx
│   ├── MandateDetailPage.tsx
│   ├── OpportunityListPage.tsx
│   ├── OpportunityWorkspacePage.tsx
│   ├── EmailHubPage.tsx
│   ├── AssetManagerListPage.tsx
│   ├── AssetManagerDetailPage.tsx
│   ├── NewsPage.tsx
│   ├── SettingsPage.tsx
│   └── EventsTasksPage.tsx
├── components/
│   ├── dashboard/
│   ├── mandates/
│   ├── opportunities/
│   ├── workspace/
│   │   ├── WorkspaceLayout.tsx
│   │   ├── SnapshotPanel.tsx
│   │   ├── DeliverableEditor.tsx          # TipTap editor wrapper
│   │   ├── NotesCanvas.tsx                # Simple canvas
│   │   ├── SourceDocuments.tsx
│   │   ├── CopilotPanel.tsx
│   │   ├── AgentSuggestions.tsx            # Diff overlay for agent mode
│   │   ├── CommentThread.tsx
│   │   ├── ShareDialog.tsx
│   │   ├── ValidationDialog.tsx
│   │   └── UndoRedoManager.tsx
│   ├── email/
│   ├── asset-managers/
│   ├── news/
│   ├── settings/
│   ├── events/
│   ├── tasks/
│   └── notifications/
│       └── NotificationPanel.tsx
├── store/
│   └── useDealsStore.ts
├── api/
│   ├── dealsApi.ts
│   └── mock/
├── types/
│   └── deals.types.ts
├── routes.tsx
└── index.ts
```

## Appendix D: API Endpoint Summary

| Method | Endpoint | RBAC | Section |
|--------|----------|------|---------|
| GET | `/deals/settings/investment-types` | Owner | 1 |
| POST | `/deals/settings/investment-types` | Owner | 1 |
| GET | `/deals/settings/investment-types/:id` | Owner | 1 |
| PUT | `/deals/settings/investment-types/:id` | Owner | 1 |
| DELETE | `/deals/settings/investment-types/:id` | Owner | 1 |
| POST | `/deals/settings/investment-types/:id/reset` | Owner | 1 |
| GET | `/deals/settings/templates` | Owner | 1 |
| POST | `/deals/settings/templates` | Owner | 1 |
| GET | `/deals/settings/templates/:id` | Owner | 1 |
| PUT | `/deals/settings/templates/:id` | Owner | 1 |
| DELETE | `/deals/settings/templates/:id` | Owner | 1 |
| POST | `/deals/settings/templates/:id/reset` | Owner | 1 |
| POST | `/deals/settings/templates/:id/preview` | Owner | 1 |
| GET | `/deals/mandates` | All | 2 |
| POST | `/deals/mandates` | Owner, Manager | 2 |
| GET | `/deals/mandates/:id` | All | 2 |
| PUT | `/deals/mandates/:id` | Owner, Manager | 2 |
| DELETE | `/deals/mandates/:id` | Owner | 2 |
| GET | `/deals/mandates/:id/opportunities` | All | 2 |
| GET | `/deals/email/accounts` | All (own) | 3 |
| POST | `/deals/email/accounts` | All | 3 |
| DELETE | `/deals/email/accounts/:id` | All (own) | 3 |
| PUT | `/deals/email/accounts/:id/settings` | All (own) | 3 |
| POST | `/deals/email/accounts/:id/sync` | All (own) | 3 |
| GET | `/deals/emails` | All (own account) | 3 |
| GET | `/deals/emails/:id` | All (own account) | 3 |
| POST | `/deals/emails/:id/import` | All | 3 |
| PUT | `/deals/emails/:id/ignore` | All | 3 |
| PUT | `/deals/emails/:id/unignore` | All | 3 |
| GET | `/deals/opportunities` | All (scoped) | 4 |
| POST | `/deals/opportunities` | All | 4 |
| POST | `/deals/opportunities/upload` | All | 4 |
| GET | `/deals/opportunities/:id` | All (scoped) | 4 |
| PUT | `/deals/opportunities/:id` | All (own) | 4 |
| DELETE | `/deals/opportunities/:id` | Owner | 4 |
| GET | `/deals/opportunities/:id/files` | All (scoped) | 4 |
| POST | `/deals/opportunities/:id/files` | All (own) | 4 |
| POST | `/deals/opportunities/:id/process` | All (own) | 4 |
| GET | `/deals/opportunities/:id/workspace` | All (scoped) | 5 |
| GET | `/deals/opportunities/:id/documents` | All (scoped) | 5 |
| POST | `/deals/opportunities/:id/documents` | All (own) | 5 |
| GET | `/deals/opportunities/:id/documents/:docId` | All (scoped) | 5 |
| PUT | `/deals/opportunities/:id/documents/:docId` | All (own/shared rw) | 5 |
| DELETE | `/deals/opportunities/:id/documents/:docId` | All (own) | 5 |
| POST | `/deals/opportunities/:id/documents/:docId/export` | All (scoped) | 5 |
| GET | `/deals/documents/:docId/comments` | All (scoped) | 5 |
| POST | `/deals/documents/:docId/comments` | All (scoped) | 5 |
| PUT | `/deals/documents/:docId/comments/:commentId` | All (own) | 5 |
| DELETE | `/deals/documents/:docId/comments/:commentId` | All (own) | 5 |
| GET | `/deals/opportunities/:id/notes` | All (scoped) | 5 |
| PUT | `/deals/opportunities/:id/notes` | All (own) | 5 |
| POST | `/deals/opportunities/:id/copilot/chat` | All (scoped) | 5 |
| POST | `/deals/opportunities/:id/copilot/suggest` | All (scoped) | 5 |
| POST | `/deals/documents/:docId/share` | All | 6 |
| GET | `/deals/documents/:docId/shares` | All | 6 |
| PUT | `/deals/documents/:docId/shares/:shareId` | All (own share) | 6 |
| DELETE | `/deals/documents/:docId/shares/:shareId` | All (own share) | 6 |
| POST | `/deals/reviews` | All | 6 |
| GET | `/deals/reviews` | All | 6 |
| GET | `/deals/reviews/:id` | All (involved) | 6 |
| PUT | `/deals/reviews/:id` | Owner, Manager | 6 |
| POST | `/deals/reviews/:id/generate-rationale` | Owner, Manager | 6 |
| GET | `/deals/asset-managers` | All | 7 |
| POST | `/deals/asset-managers` | All | 7 |
| GET | `/deals/asset-managers/:id` | All | 7 |
| PUT | `/deals/asset-managers/:id` | All | 7 |
| DELETE | `/deals/asset-managers/:id` | Owner | 7 |
| GET | `/deals/asset-managers/:id/opportunities` | All | 7 |
| GET | `/deals/news` | All | 8 |
| GET | `/deals/news/:id` | All | 8 |
| POST | `/deals/news/generate` | Owner, Manager | 8 |
| POST | `/deals/news/:id/notify` | All | 8 |
| GET | `/deals/dashboard/summary` | All | 9 |
| GET | `/deals/dashboard/funnel` | All | 9 |
| GET | `/deals/dashboard/activity` | Owner, Manager | 9 |
| GET | `/deals/dashboard/tasks` | All | 9 |
| GET | `/deals/events` | All | 10 |
| POST | `/deals/events` | All | 10 |
| GET | `/deals/events/:id` | All | 10 |
| PUT | `/deals/events/:id` | All (own) | 10 |
| DELETE | `/deals/events/:id` | All (own) | 10 |
| POST | `/deals/events/sync` | All | 10 |
| GET | `/deals/tasks` | All (scoped) | 10 |
| POST | `/deals/tasks` | All | 10 |
| PUT | `/deals/tasks/:id` | All (own/assigned) | 10 |
| DELETE | `/deals/tasks/:id` | All (own) | 10 |
| GET | `/deals/integrations/google-calendar` | All | 10 |
| POST | `/deals/integrations/google-calendar` | All | 10 |
| DELETE | `/deals/integrations/google-calendar/:id` | All (own) | 10 |
| GET | `/deals/notifications` | All (own) | 11 |
| PUT | `/deals/notifications/:id/read` | All (own) | 11 |
| PUT | `/deals/notifications/read-all` | All (own) | 11 |
| GET | `/deals/notifications/count` | All (own) | 11 |
| GET | `/deals/team-members` | All | Shared |

All endpoints prefixed with `/api/v1/`. All require valid JWT + deals module access.
