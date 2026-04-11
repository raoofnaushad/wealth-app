# Invictus Deals Module — Design Spec

## Context

Invictus AI is a modular wealth management platform. The Deals module handles **deal sourcing, evaluation, pipeline management, and document generation** for investment firms. Analysts receive opportunities via email, evaluate them against firm mandates, generate investment documents (memos, DDQs, pre-screening reports), and collaborate with managers for approval.

This spec defines the complete Deals module — pages, data model, APIs, frontend architecture, and integration points. It builds on the existing architecture docs and the Administration module spec (contextual sidebar, 3-role RBAC, auth system).

**Key dependencies:**
- **OnlyOffice Document Server** — self-hosted, embedded Word-like editor for document creation and collaboration
- **Gmail API** — OAuth integration for email import
- **Google Drive API** — OAuth integration for bulk document import
- **Vector database** — for storing vectorized source documents (email attachments, uploads)
- **External AI service** — LLM extraction, document generation, news generation, mandate matching
- **Backend infrastructure** — FastAPI + PostgreSQL + Redis + Celery as defined in the backend infrastructure spec
- **Administration module** — auth system (JWT access + httpOnly refresh cookie), RBAC (`require_role` dependency), tenant context middleware, audit logging via Celery task

---

## 1. Module Overview

### Pages

The Deals module has **7 pages** accessible from the contextual sidebar:

```
+------------------------+
| <- Back to Home        |
+------------------------+
| DEALS                  |
| Dashboard              |  <- Overview: tasks, pipeline stats, allocations, news
| Mandates               |  <- Firm-wide investment criteria documents
| Opportunities          |  <- All opportunities with pipeline statuses
| Email Hub              |  <- Gmail-connected email list, convert to opportunities
| Asset Managers         |  <- Registry of external firms/GPs
| News                   |  <- Aggregated news across all active opportunities
| Settings               |  <- Snapshot configs, document templates, prompts per investment type
+------------------------+
| Your Daily             |  <- Pinned global item
+------------------------+
```

### Routes

```
/home/deals/                                -> Dashboard
/home/deals/mandates                        -> Mandate list
/home/deals/mandates/:id                    -> Mandate detail (Strategy Overview + Opportunities tabs)
/home/deals/opportunities                   -> Opportunity list (filterable by pipeline status)
/home/deals/opportunities/:id               -> Opportunity workspace (multi-panel)
/home/deals/email                           -> Email Hub (Gmail integration)
/home/deals/asset-managers                  -> Asset Manager list
/home/deals/asset-managers/:id              -> Asset Manager detail
/home/deals/news                            -> Aggregated news feed
/home/deals/settings                        -> Settings (snapshot fields, templates, prompts)
```

### RBAC

Uses the Administration module's 3-role model (Owner / Manager / Analyst) applied to the Deals module:

| Action | Owner | Manager | Analyst |
|--------|-------|---------|---------|
| View dashboard, pipeline, opportunities | Yes | Yes | Yes |
| Create/edit opportunities | Yes | Yes | Yes (own) |
| View all mandates | Yes | Yes | Yes |
| Create/edit mandates | Yes | Yes | Yes (own) |
| Approve/review documents | Yes | Yes | No |
| View/edit asset managers | Yes | Yes | Yes |
| Configure settings (snapshots, templates) | Yes | No | No |
| Connect email integrations | Yes | Yes | Yes (own account) |
| Send documents for validation | Yes | Yes | Yes |
| Share documents with team | Yes | Yes | Yes |
| Send documents via email | Yes | Yes | Yes |

---

## 2. Dashboard

**Route:** `/home/deals/`

The dashboard gives a high-level picture for the logged-in user (and team overview for Managers/Owners).

### Sections

1. **Pipeline Summary** — Card row showing opportunity counts by status (New, Active, Archived, Ignored) with total deal value per status. Clickable to filter the Opportunities page.

2. **My Tasks** — List of action items for the current user: documents pending review, opportunities needing snapshots, validation requests awaiting response. Each links to the relevant workspace or document.

3. **Team Activity** (Manager/Owner only) — Who is working on what: analyst name, opportunity name, last activity, status. Provides the "who is doing what" visibility.

4. **Allocation Overview** — Per active mandate: target allocation vs. current committed/funded, shown as progress bars. Links to the mandate detail page.

5. **Recent News** — Top 5 aggregated news items related to active opportunities. "View all" links to the News page.

6. **Pipeline Funnel** — Visual chart showing opportunities flowing through stages (New -> Active -> Committed -> Closed), with conversion rates.

---

## 3. Mandates

### Mandate List Page

**Route:** `/home/deals/mandates`

- Table/card view of all mandates with: name, status (Active/Draft/Closed), investment types (tags), target allocation, current allocation %, number of linked opportunities
- "Create Mandate" button (Owner/Manager/Analyst)
- Filter by status, search by name
- Multiple active mandates can exist simultaneously (e.g., "Fund I - Growth Equity" and "Fund II - Real Assets")

### Mandate Detail Page

**Route:** `/home/deals/mandates/:id`

Two tabs:

**Tab 1: Strategy Overview**

- **Header metrics row**: Target Allocation (currency), Expected Average Return (e.g., "10%+ IRR / 6%+ yield"), Time Horizon (e.g., "3-10 years")
- **Allocation Progress**: Current vs Remaining (progress bar with percentage)
- **Investment Summary**: Total / Pipeline / Approved opportunity counts
- **Investment Strategy**: Free text (editable via OnlyOffice, copilot-assisted)
- **Investment Type**: Tags (Fund, Co-investment, Direct, etc.)
- **Asset Allocation & Target Returns**: Per asset class — each with allocation % and target return %. Asset classes include: Private Equity, Venture Capital, Real Estate, Private Debt, Liquid Alternatives, Structured Products, GP Stakes (configurable)
- **Target Sectors**: Tags/free text
- **Geographic Focus**: Tags/free text
- **Investment Criteria**: Free text
- **Investment Constraints**: Free text

Structured fields (allocation, returns, asset classes) are form-based with inline editing. Free text sections use OnlyOffice for rich document editing with copilot assistance.

**Tab 2: Opportunities**

- List of all opportunities matched to this mandate
- Shows fit score (qualitative: Strong Fit / Moderate Fit / Weak Fit), opportunity name, investment type, status, date received
- Sorted by fit score by default
- Click to open the opportunity workspace

### Mandate-to-Opportunity Matching

- When a new opportunity is processed, the system evaluates it against all active mandates
- Matching is **qualitative** — based on sector alignment, geographic overlap, investment type match, allocation capacity, return profile alignment
- Produces a fit indicator per mandate (Strong / Moderate / Weak) rather than a numeric score
- Opportunities can match multiple mandates

---

## 4. Opportunities & Pipeline

### Opportunities List Page

**Route:** `/home/deals/opportunities`

- Table view with columns: Name, Asset Manager, Investment Type, Pipeline Status, Fit Score, Date Received, Assigned To
- **Pipeline status filters** as tabs: New, Active, Archived, Ignored (with counts)
- Sort by: fit score (default for New), date received, name
- Bulk actions: archive, ignore, assign to analyst
- Search by name, asset manager, sector
- "Add Opportunity" button (manual creation or file upload)

### Pipeline Statuses

| Status | Description |
|--------|-------------|
| **New** | Just imported, snapshot auto-generated, not yet reviewed by analyst |
| **Active** | Analyst has opened and is working on this opportunity |
| **Archived** | Completed or no longer relevant, kept for historical reference |
| **Ignored** | Explicitly passed on, analyst reviewed and decided not to pursue |

### Auto-Sorting for New Opportunities

When viewing the New pipeline, opportunities are ranked by:
1. Mandate fit (strongest fit first, across all active mandates)
2. Data completeness (snapshot fields populated vs empty)
3. Date received (newer first as tiebreaker)

Top opportunities are visually highlighted ("Top Matches" section).

### Opportunity Creation Paths

There are **four ways** to create an opportunity:

1. **From Email** — imported via Email Hub or Gmail plugin. System processes email body + attachments, vectorizes and stores in DB, LLM extracts snapshot fields with citations back to source files.

2. **From Document Upload** — analyst uploads files (PDFs, pitch decks, term sheets) directly. Same processing pipeline: vectorize, store, LLM extract with citations.

3. **Manual Entry** — analyst creates a blank opportunity, selects investment type, fills in the snapshot fields by hand.

4. **From Google Drive** — analyst connects Google Drive (OAuth), browses folders, selects one or more folders. System crawls all files, AI identifies distinct deals/opportunities, categorizes investment type, extracts snapshot fields, stores and vectorizes all documents, creates opportunities with citations. This enables bulk import of an entire pipeline.

### Opportunity Lifecycle

```
Source (email / upload / manual / Google Drive)
  -> System processes source materials
  -> Vectorize and store in DB
  -> LLM extracts snapshot fields with citations
  -> Auto-creates/links asset manager (if from email/docs)
  -> Matches against active mandates
  -> Status: New

Analyst opens opportunity -> Status: Active
  -> Enters workspace
  -> Creates documents (memo, DDQ, pre-screening, news)
  -> Sends for validation -> Manager reviews/approves
  -> Sends documents to external parties via email

Analyst decides to pass -> Status: Ignored
Opportunity completed or no longer relevant -> Status: Archived
```

---

## 5. Opportunity Workspace

The workspace is the core working area. It opens when clicking an opportunity from the list.

**Route:** `/home/deals/opportunities/:id`

### Layout: Multi-Panel Split View

```
+------------------------------------------------------------------+
|  <- Back to Opportunities    Opportunity Name    Status: Active    |
|  Asset Manager: XYZ Capital  |  Type: Fund  |  Fit: Strong       |
+--------------------------+-----------------------------------+
|                          |                                   |
|   Panel 1                |   Panel 2                         |
|   (selectable)           |   (selectable)                    |
|                          |                                   |
|   e.g., Snapshot         |   e.g., Investment Memo           |
|                          |   (OnlyOffice editor)             |
|                          |                                   |
+--------------------------+-----------------------------------+
|  Tabs: Snapshot | Memo | DDQ | Pre-Screening | News |        |
|  Market Analysis | + New Document                             |
+------------------------------------------------------------------+
```

### How It Works

- **Tab bar** lists all items in the workspace: Snapshot (always present) + any documents created
- **Two resizable panels** — user drags any tab into either panel to arrange their view
- **Panel content types:**
  - **Snapshot** — structured form view showing all extracted fields for this opportunity's investment type, editable inline. AI-extracted fields show citation indicators pointing to source files.
  - **Documents** — each opens in an embedded OnlyOffice editor
- User can view content in full-width (single panel) or side-by-side

### Document Creation Flow

1. Analyst clicks "+ New Document" in the tab bar
2. Selects document type: Investment Memo, Pre-Screening Report, DDQ, News/Insights, Market Analysis, Custom
3. System generates the document using the configured prompt template for this investment type + snapshot data + vectorized source documents
4. Document opens in OnlyOffice editor for review and editing
5. Copilot available via the global chat panel (context-aware of the current opportunity)

### Document Actions

| Action | Description |
|--------|-------------|
| **Send for Validation** | Select documents, choose a Manager. Manager receives review request with only the selected documents visible. |
| **Share with Team** | Select documents, choose team members. They get read/comment access. |
| **Send via Email** | Select documents, exported as .docx, compose email form, sent via analyst's connected Gmail. |
| **Download** | Export as .docx |

### Validation Workflow

1. Analyst selects documents -> "Send for Validation" -> picks a Manager
2. Manager sees a review view with only the selected documents
3. Manager adds comments within the document (OnlyOffice native comments)
4. Analyst sees comments, addresses them, resolves them
5. Manager approves the document(s)
6. On approval, system **auto-generates a rationale** summarizing all comments, discussions, and resolutions from the review
7. Manager can review/edit the generated rationale before finalizing
8. Rationale is stored with the approval record as permanent audit trail
9. Document status: Draft -> In Review -> Approved

### Snapshot View

- Displays all fields defined for this investment type (from Settings)
- Fields pre-populated by AI extraction from source materials
- Analyst can edit any field inline
- AI-extracted fields show citation indicators (source file + location)
- Empty/missing fields highlighted for manual completion

---

## 6. Email Hub

**Route:** `/home/deals/email`

### Purpose

Connect to Gmail (and potentially other providers later), browse emails in read-only mode, and convert selected emails into opportunities.

### Layout

- **Connected Accounts header** — linked email accounts with status (Connected/Syncing/Error), "Connect Gmail Account" button (OAuth flow)
- **Email List** — read-only inbox view from connected accounts
  - Columns: From, Subject, Date, Attachments (count), Status (New / Already Imported / Ignored)
  - Filters: by connected account, date range, has attachments, unprocessed only
  - Search by sender, subject, content
- **Email Preview** — clicking an email shows full body and attachment list in a side panel (read-only)
- **"Add as Opportunity"** — from preview or as bulk action:
  1. Select investment type (Fund / Direct / Co-investment / Other)
  2. Confirm -> system processes email + attachments (vectorize, extract, create snapshot)
  3. Opportunity appears in pipeline as "New"
  4. Email status changes to "Already Imported" with link to the opportunity

### Gmail Plugin (Google Workspace Add-on)

Separate from the web app — installs in Gmail sidebar:
- When viewing an email, analyst clicks "Add to Invictus"
- Selects investment type
- Plugin calls Invictus API -> same processing pipeline
- Confirmation shown in Gmail with link to open opportunity in Invictus

### Processing Pipeline

```
Gmail API (OAuth) -> Sync email metadata + bodies + attachments
  -> Store in platform DB (raw email data)
  -> Display in Email Hub (read-only)

On "Add as Opportunity":
  -> Extract email body text
  -> Download and store attachments
  -> Vectorize all content (email + attachments) -> store in vector DB
  -> LLM processes against investment type's snapshot field config
  -> Populates snapshot fields with citations to source documents
  -> Auto-creates/links asset manager if new
  -> Matches against active mandates
  -> Opportunity created with status "New"
```

---

## 7. Google Drive Bulk Import

### Purpose

Allow firms to bulk-import opportunities from existing Google Drive folders — a powerful onboarding feature for firms migrating to Invictus.

### UI Access

Google Drive import is accessible from two places:
- **Opportunities List Page** — "Add Opportunity" dropdown includes "Import from Google Drive" option
- **Settings > Integrations** — manage Google Drive connection

### Flow

1. Analyst connects Google Drive via OAuth (from Settings > Integrations, or prompted on first use)
2. Browses folder structure, selects one or more folders
3. Clicks "Import" -> system processes all files in selected folders
4. AI identifies distinct deals/opportunities from the files
5. For each identified opportunity:
   - Categorizes investment type
   - Extracts snapshot fields with citations
   - Stores and vectorizes all related documents
   - Auto-creates/links asset managers
   - Matches against active mandates
   - Creates opportunity with status "New"
6. Import runs as a background job with progress tracking

### API

```
POST   /api/v1/deals/integrations/google-drive           -- Connect Google Drive (OAuth)
GET    /api/v1/deals/integrations/google-drive/browse     -- Browse folders/files
POST   /api/v1/deals/integrations/google-drive/import     -- Import selected folders
GET    /api/v1/deals/integrations/google-drive/import/:jobId -- Track import job progress
```

---

## 8. Asset Managers

### Asset Manager List Page

**Route:** `/home/deals/asset-managers`

- Table view with columns: Name, Type, Location, Firm AUM, Total Opportunities, Last Activity Date
- Search by name, type, location
- Filter by type (Venture Capital, Private Equity, Real Estate, etc.)
- "Add Asset Manager" button (manual creation)
- Click row to open detail page

### Asset Manager Detail Page

**Route:** `/home/deals/asset-managers/:id`

Structured profile with sections:

**Basic Information**: Name, Type (Venture Capital, Private Equity, Real Estate, Hedge Fund, etc.), Location, Description (rich text)

**Fund Information**: Fund Size, Vintage Year, Fund Raised Till Date, Fund Closing Timeline

**Firm Information**: Firm AUM, Years in Business, Number of Previous Funds, Investment Team Size

**Strategy & Positioning**: Fund Strategy, USP & Differentiator, Key Person Risk (with N/A flag indicator)

**Manager Characteristics**: Flexible additional fields

**Metadata** (system-managed): Created Date, Created By (System or user name), Last Modified, Total Opportunities

**Linked Opportunities**: List of all opportunities sourced from this asset manager, with status and date

### Auto-Creation & Enrichment

| Trigger | Action |
|---------|--------|
| New opportunity imported | System checks if sender/manager exists. If not, auto-creates with `Created By: System`, populates fields from available data via LLM extraction. |
| Subsequent opportunities from same manager | System enriches existing record with new data found in source materials. |
| Manual creation | User creates from "Add Asset Manager" button, fills fields manually. |
| Manual edit | Any user (Owner/Manager/Analyst) can edit fields. |

---

## 9. News

### News Page

**Route:** `/home/deals/news`

### Purpose

Aggregated, AI-generated news feed relevant to all active opportunities — market developments, sector trends, asset manager updates, regulatory changes.

### Layout

- **News feed** — chronologically sorted, each item showing: headline, summary (2-3 sentences), category tags (Market, Sector, Asset Manager, Regulatory), timestamp, linked opportunities
- **Filters**: by linked opportunity, by category, by date range
- **"Generate Daily Report" button** — compiles today's relevant news into a downloadable .docx document

### News Sources

Auto-generated by the AI service based on:
- Active opportunities in the pipeline (sectors, geographies, asset managers)
- Active mandates (target sectors, strategies)
- General market/deals landscape

### Connection to Workspace

- Per-opportunity news is also a **document type** within the workspace (via "+ New Document" -> "News/Insights")
- The News page aggregates across all opportunities
- News items link back to the relevant opportunity workspace

---

## 10. Settings

**Route:** `/home/deals/settings` — Owner only

Three sub-sections:

### 10.1 Snapshot Configuration

Per investment type (Fund, Direct, Co-Investment, Other, + custom types):

- **Investment type list** — all configured types, "Add Investment Type" button
- **Click a type** -> field configuration editor:
  - **Sections** (e.g., "Deal Overview", "Fund Terms", "Risk Factors") — reorderable
  - **Fields within each section** — each with:
    - Field Name
    - Field Type (text, number, currency, percentage, date, select, multi-select, textarea)
    - Required / Optional toggle
    - AI Extraction Instruction (guidance for the LLM on how to extract this field from source documents)
    - Select/multi-select options (if applicable)
  - Add/remove/reorder fields and sections
  - "Reset to Defaults" button to restore base field set

Each investment type ships with a pre-configured base set. Firms customize from there. See Appendix A for the complete default field sets.

### 10.2 Document Templates

Per investment type, configure prompt templates for AI document generation:

- **Template list per type**: Investment Memo, Pre-Screening Report, DDQ, Market Analysis, News/Insights
- Click a template -> prompt editor (textarea with `{{variable}}` placeholder highlighting)
- Available variables shown (pulled from that investment type's snapshot fields)
- "Reset to Default" to restore base prompt
- "Add Custom Template" for new document types beyond defaults
- **Preview** button — generates sample output using test data for validation

See Appendix B for the complete default prompt templates.

### 10.3 Integrations

- **Gmail accounts** — connected accounts, connect/disconnect, sync settings (frequency, labels to watch)
- **Google Drive** — connected accounts, connect/disconnect

---

## 11. Data Model

All tables in the `deals` schema with `tenant_id` for RLS.

```sql
-- Investment type configurations (snapshot fields + templates)
deals.investment_types (
  id              UUID PRIMARY KEY,
  tenant_id       UUID,
  name            VARCHAR(100) NOT NULL,
  slug            VARCHAR(50) NOT NULL,
  is_system       BOOLEAN DEFAULT false,
  sort_order      INTEGER DEFAULT 0,
  snapshot_config JSONB NOT NULL,               -- { sections: [{ name, sort, fields: [{ name, type, required, instruction, options }] }] }
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, slug)
)

-- Document generation prompt templates
deals.document_templates (
  id              UUID PRIMARY KEY,
  tenant_id       UUID,
  investment_type_id UUID REFERENCES deals.investment_types(id),
  name            VARCHAR(100) NOT NULL,
  slug            VARCHAR(50) NOT NULL,
  prompt_template TEXT NOT NULL,
  is_system       BOOLEAN DEFAULT false,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, investment_type_id, slug)
)

-- Mandates
deals.mandates (
  id              UUID PRIMARY KEY,
  tenant_id       UUID,
  name            VARCHAR(255) NOT NULL,
  status          VARCHAR(20) DEFAULT 'draft',  -- 'draft', 'active', 'closed'
  target_allocation DECIMAL(20, 2),
  expected_return VARCHAR(100),
  time_horizon    VARCHAR(100),
  investment_types TEXT[],
  asset_allocation JSONB,                       -- [{ asset_class, allocation_pct, target_return }]
  target_sectors  TEXT[],
  geographic_focus TEXT[],
  investment_criteria TEXT,
  investment_constraints TEXT,
  investment_strategy TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)

-- Mandate allocation tracking
deals.mandate_allocations (
  id              UUID PRIMARY KEY,
  tenant_id       UUID,
  mandate_id      UUID REFERENCES deals.mandates(id),
  opportunity_id  UUID REFERENCES deals.opportunities(id),
  amount          DECIMAL(20, 2),
  status          VARCHAR(20),                  -- 'proposed', 'committed', 'funded'
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)

-- Asset Managers
deals.asset_managers (
  id              UUID PRIMARY KEY,
  tenant_id       UUID,
  name            VARCHAR(255) NOT NULL,
  type            VARCHAR(100),
  location        VARCHAR(255),
  description     TEXT,
  fund_info       JSONB DEFAULT '{}',
  firm_info       JSONB DEFAULT '{}',
  strategy        JSONB DEFAULT '{}',
  characteristics JSONB DEFAULT '{}',
  created_by      VARCHAR(50) DEFAULT 'system',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)

-- Opportunities
deals.opportunities (
  id              UUID PRIMARY KEY,
  tenant_id       UUID,
  name            VARCHAR(255) NOT NULL,
  investment_type_id UUID REFERENCES deals.investment_types(id),
  pipeline_status VARCHAR(20) DEFAULT 'new',    -- 'new', 'active', 'archived', 'ignored'
  asset_manager_id UUID REFERENCES deals.asset_managers(id),
  assigned_to     UUID,
  snapshot_data   JSONB NOT NULL DEFAULT '{}',
  snapshot_citations JSONB DEFAULT '{}',        -- { field_name: { source_file_id, location, confidence } }
  source_type     VARCHAR(20) NOT NULL,         -- 'email', 'upload', 'manual', 'google_drive'
  source_email_id UUID,
  mandate_fits    JSONB DEFAULT '[]',           -- [{ mandate_id, fit_score, reasoning }]
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)

-- Source files (email attachments, uploaded documents, Google Drive files)
deals.source_files (
  id              UUID PRIMARY KEY,
  tenant_id       UUID,
  opportunity_id  UUID REFERENCES deals.opportunities(id),
  file_name       VARCHAR(500) NOT NULL,
  file_url        TEXT NOT NULL,
  file_type       VARCHAR(50),
  file_size       BIGINT,
  vector_store_id VARCHAR(255),
  processed       BOOLEAN DEFAULT false,
  source_origin   VARCHAR(20),                  -- 'email_attachment', 'upload', 'google_drive'
  created_at      TIMESTAMPTZ DEFAULT now()
)

-- Workspace documents (OnlyOffice files)
deals.documents (
  id              UUID PRIMARY KEY,
  tenant_id       UUID,
  opportunity_id  UUID REFERENCES deals.opportunities(id),
  template_id     UUID REFERENCES deals.document_templates(id),
  name            VARCHAR(500) NOT NULL,
  document_type   VARCHAR(50) NOT NULL,         -- 'investment_memo', 'pre_screening', 'ddq', 'news', 'market_analysis', 'custom'
  file_url        TEXT NOT NULL,
  status          VARCHAR(20) DEFAULT 'draft',  -- 'draft', 'in_review', 'approved'
  version         INTEGER DEFAULT 1,
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)

-- Document validation / review requests
deals.document_reviews (
  id              UUID PRIMARY KEY,
  tenant_id       UUID,
  reviewer_id     UUID NOT NULL,
  requested_by    UUID NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_review', 'approved', 'changes_requested'
  rationale       TEXT,                          -- AI-generated summary of review discussion + approval reasoning
  rationale_generated BOOLEAN DEFAULT false,
  requested_at    TIMESTAMPTZ DEFAULT now(),
  reviewed_at     TIMESTAMPTZ
)

-- Junction: which documents are in a review request
deals.document_review_items (
  id              UUID PRIMARY KEY,
  review_id       UUID REFERENCES deals.document_reviews(id),
  document_id     UUID REFERENCES deals.documents(id),
  UNIQUE(review_id, document_id)
)

-- Document sharing (with team members)
deals.document_shares (
  id              UUID PRIMARY KEY,
  tenant_id       UUID,
  document_id     UUID REFERENCES deals.documents(id),
  shared_with     UUID NOT NULL,
  shared_by       UUID NOT NULL,
  permission      VARCHAR(20) DEFAULT 'comment',
  created_at      TIMESTAMPTZ DEFAULT now()
)

-- Email integration accounts
deals.email_accounts (
  id              UUID PRIMARY KEY,
  tenant_id       UUID,
  user_id         UUID NOT NULL,
  provider        VARCHAR(20) DEFAULT 'gmail',
  email_address   VARCHAR(255) NOT NULL,
  access_token    TEXT,                          -- encrypted
  refresh_token   TEXT,                          -- encrypted
  token_expires_at TIMESTAMPTZ,
  sync_labels     TEXT[],
  last_synced_at  TIMESTAMPTZ,
  status          VARCHAR(20) DEFAULT 'connected',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)

-- Synced emails (read-only copies)
deals.emails (
  id              UUID PRIMARY KEY,
  tenant_id       UUID,
  email_account_id UUID REFERENCES deals.email_accounts(id),
  gmail_message_id VARCHAR(255),
  from_address    VARCHAR(255),
  from_name       VARCHAR(255),
  subject         VARCHAR(1000),
  body_text       TEXT,
  body_html       TEXT,
  received_at     TIMESTAMPTZ,
  attachment_count INTEGER DEFAULT 0,
  import_status   VARCHAR(20) DEFAULT 'new',
  opportunity_id  UUID,
  created_at      TIMESTAMPTZ DEFAULT now()
)

-- Email attachments
deals.email_attachments (
  id              UUID PRIMARY KEY,
  email_id        UUID REFERENCES deals.emails(id),
  file_name       VARCHAR(500),
  file_url        TEXT,
  file_type       VARCHAR(50),
  file_size       BIGINT,
  created_at      TIMESTAMPTZ DEFAULT now()
)

-- Google Drive integration
deals.google_drive_accounts (
  id              UUID PRIMARY KEY,
  tenant_id       UUID,
  user_id         UUID NOT NULL,
  email_address   VARCHAR(255),
  access_token    TEXT,                          -- encrypted
  refresh_token   TEXT,                          -- encrypted
  token_expires_at TIMESTAMPTZ,
  status          VARCHAR(20) DEFAULT 'connected',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)

-- Google Drive import jobs
deals.google_drive_import_jobs (
  id              UUID PRIMARY KEY,
  tenant_id       UUID,
  account_id      UUID REFERENCES deals.google_drive_accounts(id),
  folder_paths    TEXT[],                        -- selected folder IDs/paths
  status          VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  total_files     INTEGER DEFAULT 0,
  processed_files INTEGER DEFAULT 0,
  opportunities_created INTEGER DEFAULT 0,
  error_log       JSONB,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT now()
)

-- News items
deals.news_items (
  id              UUID PRIMARY KEY,
  tenant_id       UUID,
  headline        VARCHAR(500) NOT NULL,
  summary         TEXT,
  full_content    TEXT,
  category        VARCHAR(50),                  -- 'market', 'sector', 'asset_manager', 'regulatory'
  source_url      TEXT,
  generated_at    TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
)

-- News-opportunity junction
deals.news_opportunity_links (
  news_item_id    UUID REFERENCES deals.news_items(id),
  opportunity_id  UUID REFERENCES deals.opportunities(id),
  PRIMARY KEY (news_item_id, opportunity_id)
)
```

### Key Indexes

```sql
CREATE INDEX idx_opportunities_tenant_status ON deals.opportunities(tenant_id, pipeline_status);
CREATE INDEX idx_opportunities_tenant_assigned ON deals.opportunities(tenant_id, assigned_to);
CREATE INDEX idx_opportunities_asset_manager ON deals.opportunities(asset_manager_id);
CREATE INDEX idx_documents_opportunity ON deals.documents(opportunity_id);
CREATE INDEX idx_document_reviews_reviewer ON deals.document_reviews(reviewer_id, status);
CREATE INDEX idx_emails_tenant_account ON deals.emails(tenant_id, email_account_id);
CREATE INDEX idx_emails_import_status ON deals.emails(tenant_id, import_status);
CREATE INDEX idx_mandates_tenant_status ON deals.mandates(tenant_id, status);
CREATE INDEX idx_asset_managers_tenant ON deals.asset_managers(tenant_id);
CREATE INDEX idx_source_files_opportunity ON deals.source_files(opportunity_id);
CREATE INDEX idx_news_items_tenant ON deals.news_items(tenant_id);
CREATE INDEX idx_gdrive_jobs_tenant ON deals.google_drive_import_jobs(tenant_id, status);
```

### RLS Policies

All tenant-scoped tables have RLS enabled with policies enforcing `tenant_id = current_setting('app.current_tenant')::uuid`, set per-request by backend middleware.

---

## 12. Backend Architecture

### Directory Structure

Follows the same layered pattern as the Administration module:

```
server/app/modules/deals/
+-- __init__.py
+-- router.py              # FastAPI APIRouter — all deals endpoints
+-- service.py             # Business logic (orchestration, authorization)
+-- repository.py          # Database queries (SQLAlchemy async)
+-- models.py              # SQLAlchemy ORM models (all deals.* tables)
+-- schemas.py             # Pydantic request/response schemas
+-- events.py              # Domain event definitions (for future cross-module use)
```

### RBAC Pattern

Uses the same `require_role` FastAPI dependency from `app.shared.dependencies`:

```python
from app.shared.dependencies import get_current_user, require_role, get_db

@router.get("/deals/opportunities")
async def list_opportunities(
    user=Depends(require_role(module="deals", roles=["owner", "manager", "analyst"])),
    db=Depends(get_db),
):
    ...

@router.put("/deals/settings/investment-types/{type_id}")
async def update_investment_type(
    user=Depends(require_role(module="deals", roles=["owner"])),
    db=Depends(get_db),
):
    ...

@router.put("/deals/reviews/{review_id}")
async def update_review(
    user=Depends(require_role(module="deals", roles=["owner", "manager"])),
    db=Depends(get_db),
):
    ...
```

**Permission rules:**
- All `/api/v1/deals/*` — requires any role in `deals` module
- Settings (investment types, templates) — requires `deals: owner`
- Document reviews (approve/request changes) — requires `deals: owner` or `deals: manager`
- Create/edit own opportunities, mandates, documents — `deals: analyst` and above
- View everything — any deals role

### Celery Background Tasks

New tasks added to `server/app/tasks/`:

```
server/app/tasks/
+-- deals_processing.py     # process_opportunity, extract_snapshot, vectorize_files
+-- deals_email_sync.py     # sync_gmail_account, import_email_as_opportunity
+-- deals_gdrive.py         # import_google_drive_folder (long-running job)
+-- deals_news.py           # generate_news, generate_daily_report
+-- deals_documents.py      # generate_document (AI document generation)
```

| Task | Queue | Trigger | Retry |
|------|-------|---------|-------|
| `process_opportunity` | `deals` | On opportunity creation (email/upload/gdrive) | 3 attempts, exponential backoff |
| `extract_snapshot` | `deals` | Called by process_opportunity after vectorization | 3 attempts |
| `vectorize_files` | `deals` | On new source files added | 3 attempts |
| `sync_gmail_account` | `email` | Periodic (configurable) + manual trigger | 3 attempts |
| `import_email_as_opportunity` | `deals` | User clicks "Add as Opportunity" | 3 attempts |
| `import_google_drive_folder` | `deals` | User triggers bulk import | No retry (tracks progress in DB) |
| `generate_document` | `deals` | User creates a new document in workspace | 3 attempts |
| `generate_news` | `deals` | Periodic + manual trigger | 3 attempts |
| `generate_daily_report` | `deals` | User clicks "Generate Daily Report" | 3 attempts |

### Audit Logging

All significant deals actions emit audit logs via the existing `tasks.audit.write_audit_log` Celery task:

- Opportunity CRUD and status changes
- Mandate CRUD
- Document creation and status changes
- Review requests and approvals (with rationale)
- Asset manager changes
- Email imports
- Google Drive imports
- Settings changes (investment types, templates)

### Seed Data

The seed script (`server/scripts/seed.py`) is extended with deals mock data:

- 2 active mandates (Growth Equity, Real Assets)
- 4 investment types pre-configured (Fund, Direct, Co-Investment, Other) with default snapshot fields
- 5 document templates per investment type (Investment Memo, Pre-Screening, DDQ, Market Analysis, News)
- 4 sample asset managers
- 8 sample opportunities (mix of statuses and investment types)
- Sample documents in workspaces
- Sample news items

### Router Registration

```python
# server/app/main.py
from app.modules.deals.router import router as deals_router

app.include_router(deals_router, prefix="/api/v1")
```

---

## 13. API Endpoints

All responses use the standard envelope:
```json
{
  "success": true,
  "data": { ... },
  "meta": { "request_id": "uuid" }
}
```

Paginated lists include a `pagination` field. Error responses use `{ success: false, error: { code, message, details } }`.

### Mandates

```
GET    /api/v1/deals/mandates                              -- List all mandates
POST   /api/v1/deals/mandates                              -- Create mandate
GET    /api/v1/deals/mandates/:id                          -- Get mandate detail
PUT    /api/v1/deals/mandates/:id                          -- Update mandate
DELETE /api/v1/deals/mandates/:id                          -- Delete mandate (Owner only)
GET    /api/v1/deals/mandates/:id/opportunities            -- List opportunities matched to mandate
```

### Opportunities

```
GET    /api/v1/deals/opportunities                         -- List (filter by status, assigned_to, etc.)
POST   /api/v1/deals/opportunities                         -- Create (manual)
POST   /api/v1/deals/opportunities/upload                  -- Create from file upload
GET    /api/v1/deals/opportunities/:id                     -- Get detail (snapshot + metadata)
PUT    /api/v1/deals/opportunities/:id                     -- Update (snapshot fields, status, assignment)
DELETE /api/v1/deals/opportunities/:id                     -- Delete (Owner only)
GET    /api/v1/deals/opportunities/:id/files               -- List source files
POST   /api/v1/deals/opportunities/:id/files               -- Upload additional source files
POST   /api/v1/deals/opportunities/:id/process             -- Re-process: re-extract snapshot
```

### Documents (Workspace)

```
GET    /api/v1/deals/opportunities/:id/documents           -- List documents in workspace
POST   /api/v1/deals/opportunities/:id/documents           -- Create document (triggers AI generation)
GET    /api/v1/deals/opportunities/:id/documents/:docId    -- Get document metadata + OnlyOffice URL
PUT    /api/v1/deals/opportunities/:id/documents/:docId    -- Update document metadata
DELETE /api/v1/deals/opportunities/:id/documents/:docId    -- Delete document
```

### Document Reviews (Validation)

```
POST   /api/v1/deals/reviews                               -- Create review request
GET    /api/v1/deals/reviews                               -- List reviews (filter: my_requests, assigned_to_me, status)
GET    /api/v1/deals/reviews/:id                           -- Get review detail
PUT    /api/v1/deals/reviews/:id                           -- Update (approve, request_changes) with rationale
```

### Document Sharing

```
POST   /api/v1/deals/documents/:docId/share                -- Share with team members
GET    /api/v1/deals/documents/:docId/shares               -- List who has access
DELETE /api/v1/deals/documents/:docId/shares/:shareId      -- Remove share
```

### Document Email

```
POST   /api/v1/deals/documents/send-email                  -- Send selected docs as .docx via connected Gmail
```

### Asset Managers

```
GET    /api/v1/deals/asset-managers                        -- List
POST   /api/v1/deals/asset-managers                        -- Create (manual)
GET    /api/v1/deals/asset-managers/:id                    -- Get detail
PUT    /api/v1/deals/asset-managers/:id                    -- Update
DELETE /api/v1/deals/asset-managers/:id                    -- Delete (Owner only)
GET    /api/v1/deals/asset-managers/:id/opportunities      -- List opportunities from this manager
```

### Email Hub

```
GET    /api/v1/deals/email/accounts                        -- List connected email accounts
POST   /api/v1/deals/email/accounts                        -- Connect new account (initiate OAuth)
DELETE /api/v1/deals/email/accounts/:id                    -- Disconnect
POST   /api/v1/deals/email/accounts/:id/sync               -- Trigger manual sync
GET    /api/v1/deals/emails                                -- List synced emails
GET    /api/v1/deals/emails/:id                            -- Get email detail (body + attachments)
POST   /api/v1/deals/emails/:id/import                     -- Convert email to opportunity
PUT    /api/v1/deals/emails/:id/ignore                     -- Mark as ignored
```

### Google Drive Integration

```
POST   /api/v1/deals/integrations/google-drive             -- Connect Google Drive (OAuth)
DELETE /api/v1/deals/integrations/google-drive/:id         -- Disconnect
GET    /api/v1/deals/integrations/google-drive/browse      -- Browse folders/files
POST   /api/v1/deals/integrations/google-drive/import      -- Import selected folders
GET    /api/v1/deals/integrations/google-drive/import/:jobId -- Track import job progress
```

### News

```
GET    /api/v1/deals/news                                  -- List aggregated news
POST   /api/v1/deals/news/generate                         -- Trigger news generation
POST   /api/v1/deals/news/daily-report                     -- Generate downloadable daily report
```

### Settings (Owner only)

```
GET    /api/v1/deals/settings/investment-types              -- List investment types
POST   /api/v1/deals/settings/investment-types              -- Create custom type
GET    /api/v1/deals/settings/investment-types/:id          -- Get config (snapshot fields)
PUT    /api/v1/deals/settings/investment-types/:id          -- Update snapshot field config
DELETE /api/v1/deals/settings/investment-types/:id          -- Delete custom type
POST   /api/v1/deals/settings/investment-types/:id/reset   -- Reset to defaults
GET    /api/v1/deals/settings/templates                    -- List document templates
GET    /api/v1/deals/settings/templates/:id                -- Get template prompt
PUT    /api/v1/deals/settings/templates/:id                -- Update template prompt
POST   /api/v1/deals/settings/templates/:id/reset          -- Reset to default prompt
POST   /api/v1/deals/settings/templates/:id/preview        -- Generate preview output
```

### Dashboard

```
GET    /api/v1/deals/dashboard/summary                     -- Pipeline stats, allocation overview, task counts
GET    /api/v1/deals/dashboard/activity                    -- Team activity feed (Manager/Owner)
GET    /api/v1/deals/dashboard/pipeline-funnel             -- Funnel chart data
```

---

## 14. Frontend Architecture

### File Structure

```
client/src/modules/deals/
+-- pages/
|   +-- DealsLayout.tsx                  # Module layout with deals sidebar nav
|   +-- DashboardPage.tsx
|   +-- MandateListPage.tsx
|   +-- MandateDetailPage.tsx
|   +-- OpportunityListPage.tsx
|   +-- OpportunityWorkspacePage.tsx
|   +-- EmailHubPage.tsx
|   +-- AssetManagerListPage.tsx
|   +-- AssetManagerDetailPage.tsx
|   +-- NewsPage.tsx
|   +-- SettingsPage.tsx
+-- components/
|   +-- dashboard/
|   |   +-- PipelineSummary.tsx
|   |   +-- MyTasks.tsx
|   |   +-- TeamActivity.tsx
|   |   +-- AllocationOverview.tsx
|   |   +-- RecentNews.tsx
|   |   +-- PipelineFunnel.tsx
|   +-- mandates/
|   |   +-- MandateCard.tsx
|   |   +-- StrategyOverview.tsx
|   |   +-- AssetAllocationTable.tsx
|   |   +-- MandateOpportunities.tsx
|   |   +-- MandateForm.tsx
|   +-- opportunities/
|   |   +-- OpportunityTable.tsx
|   |   +-- OpportunityCard.tsx
|   |   +-- FitScoreBadge.tsx
|   |   +-- CreateOpportunityDialog.tsx
|   |   +-- PipelineStatusBadge.tsx
|   +-- workspace/
|   |   +-- WorkspaceLayout.tsx
|   |   +-- PanelManager.tsx
|   |   +-- SnapshotPanel.tsx
|   |   +-- DocumentPanel.tsx
|   |   +-- WorkspaceTabBar.tsx
|   |   +-- CreateDocumentDialog.tsx
|   |   +-- DocumentActions.tsx
|   |   +-- ValidationDialog.tsx
|   |   +-- ShareDialog.tsx
|   |   +-- SendEmailDialog.tsx
|   |   +-- CitationIndicator.tsx
|   +-- email/
|   |   +-- EmailAccountList.tsx
|   |   +-- EmailList.tsx
|   |   +-- EmailPreview.tsx
|   |   +-- ImportEmailDialog.tsx
|   |   +-- ConnectGmailButton.tsx
|   +-- asset-managers/
|   |   +-- AssetManagerTable.tsx
|   |   +-- AssetManagerProfile.tsx
|   |   +-- AssetManagerForm.tsx
|   |   +-- LinkedOpportunities.tsx
|   +-- news/
|   |   +-- NewsFeed.tsx
|   |   +-- NewsCard.tsx
|   |   +-- DailyReportButton.tsx
|   +-- settings/
|       +-- InvestmentTypeList.tsx
|       +-- SnapshotFieldEditor.tsx
|       +-- FieldConfigRow.tsx
|       +-- TemplateList.tsx
|       +-- PromptEditor.tsx
|       +-- PromptPreview.tsx
|       +-- EmailSettingsPanel.tsx
|       +-- GoogleDriveSettings.tsx
+-- store/
|   +-- useDealsStore.ts
+-- api/
|   +-- dealsApi.ts
|   +-- mock/
|       +-- handlers.ts
|       +-- data/
|           +-- mandates.ts
|           +-- opportunities.ts
|           +-- asset-managers.ts
|           +-- documents.ts
|           +-- emails.ts
|           +-- news.ts
+-- types/
|   +-- deals.types.ts
+-- routes.tsx
+-- index.ts
```

### Platform-Level Additions (Reusable)

```
client/src/platform/
+-- documents/
|   +-- OnlyOfficeEditor.tsx            # OnlyOffice integration component
|   +-- useDocumentEditor.ts            # Hook for OnlyOffice API
|   +-- types.ts
+-- email/
|   +-- GmailService.ts                 # Gmail API OAuth + sync
|   +-- EmailComposer.tsx               # Reusable compose form
|   +-- types.ts
+-- google-drive/
    +-- GoogleDriveService.ts           # Google Drive API OAuth + browse
    +-- FolderBrowser.tsx               # Folder selection UI
    +-- types.ts
```

### Zustand Store

```typescript
interface DealsState {
  // Dashboard
  dashboardSummary: DashboardSummary | null
  isDashboardLoading: boolean

  // Mandates
  mandates: Mandate[]
  selectedMandate: Mandate | null
  isMandatesLoading: boolean

  // Opportunities
  opportunities: Opportunity[]
  pipelineFilter: PipelineStatus
  isOpportunitiesLoading: boolean

  // Workspace (active opportunity)
  activeOpportunity: Opportunity | null
  workspaceDocuments: Document[]
  panelLayout: PanelLayout

  // Asset Managers
  assetManagers: AssetManager[]
  isAssetManagersLoading: boolean

  // Email Hub
  emailAccounts: EmailAccount[]
  emails: Email[]
  isEmailsLoading: boolean

  // News
  newsItems: NewsItem[]
  isNewsLoading: boolean

  // Actions
  fetchDashboard: () => Promise<void>
  fetchMandates: () => Promise<void>
  fetchOpportunities: (filter?: PipelineStatus) => Promise<void>
  // ... etc for each entity
}
```

---

## 15. Cross-Module Integration

**Deferred.** The Deals module is designed as a standalone product for v1. Cross-module integrations with Engage, Plan, Tools, and Insights will be layered on in a future phase following the 3-tier integration pattern (Navigation Links, Shared Events, Shared Data Contracts) defined in the architecture docs.

---

## 16. Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Document editor | OnlyOffice (self-hosted) | Word-like UX, native .docx, built-in comments/track changes, customizable via plugins, no Microsoft licensing dependency |
| Architecture | Single module, feature-organized | Matches architecture docs, simpler than sub-modules, well-organized sub-folders provide sufficient isolation |
| Investment type axis | Everything driven by investment type | Snapshot fields, extraction prompts, document templates all configured per type. Clean single axis of configuration. |
| Mandate matching | Qualitative fit (Strong/Moderate/Weak) | Users explicitly don't want numeric scores. Qualitative indicators are more actionable for investment decisions. |
| Email integration | Gmail API (read-only pull) | Respects existing workflow. Analysts stay in Gmail, platform pulls what's needed. Not replacing email. |
| Google Drive import | Bulk folder processing | Powerful onboarding. Firms can migrate entire pipeline history in one action. |
| Validation rationale | AI-generated from review comments | Creates audit trail of why documents were approved. Manager can edit before finalizing. |
| Cross-module | Deferred | Ship standalone first, integrate later. Graceful degradation already in the architecture. |
| AI approach | External service via backend proxy | Consistent with platform architecture. Frontend has no LLM keys. |
| Copilot | Existing global chat panel | One copilot, context-aware. No separate inline editors. Users explicitly wanted one general copilot. |

---

## 17. Deferred Items (v2+)

- Cross-module integrations (Engage, Plan, Tools, Insights)
- Outlook/Microsoft 365 email integration
- OneDrive/SharePoint integration (similar to Google Drive)
- Custom pipeline statuses beyond the 4 defaults
- Allocation workflow (proposed -> committed -> funded lifecycle with approval gates)
- Deal comparison view (side-by-side snapshot comparison of multiple opportunities)
- IC (Investment Committee) meeting preparation and minutes
- Automated email notifications for pipeline changes, review requests, etc.
- Bulk operations on opportunities (mass re-process, mass assign)
- Advanced analytics / reporting on deal flow, conversion rates, time-in-stage
- Gmail plugin development (Google Workspace Add-on)
- Mobile-responsive workspace layout

---

## Appendix A: Default Snapshot Field Sets

The complete default snapshot configurations for each investment type are maintained in a separate reference document. Each investment type ships with the following sections:

### Fund Investment (~50 fields, 6 sections)
1. Deal Overview (13 fields)
2. Fund Terms (12 fields)
3. Target Economics & Performance (9 fields)
4. GP / Manager Assessment (8 fields)
5. Allocation & Fit (6 fields)
6. Risk Factors (4 fields)

### Direct Investment (~50 fields, 6 sections)
1. Deal Overview (12 fields)
2. Company Fundamentals (9 fields)
3. Financial Overview (12 fields)
4. Transaction Terms (11 fields)
5. Investment Thesis & Value Creation (6 fields)
6. Risk Factors (5 fields)

### Co-Investment (~50 fields, 6 sections)
1. Deal Overview (13 fields)
2. Company Fundamentals (7 fields)
3. Financial Overview (7 fields)
4. Transaction Terms (13 fields)
5. GP Assessment & Alignment (7 fields)
6. Investment Thesis & Risk (6 fields)

### Other / Generic (~20 fields, 3 sections)
1. Deal Overview (9 fields)
2. Financial Terms (7 fields)
3. Risk & Assessment (5 fields)

Full field definitions with types, required/optional flags, and AI extraction instructions are in the reference data seeded during module setup.

---

## Appendix B: Default Document Templates

Default prompt templates are provided for each investment type and document type combination. Each template includes:
- Role and context framing for the AI
- Dynamic variable placeholders (`{{field_name}}`) populated from snapshot data
- Structured section definitions with content guidance
- Tone and length specifications

### Templates per Investment Type

| Document Type | Fund | Direct | Co-Investment | Other |
|--------------|------|--------|---------------|-------|
| Investment Memo | Yes (8-12 pages) | Yes (15-25 pages) | Yes (8-15 pages) | Yes (5-10 pages) |
| Pre-Screening Report | Yes (2-3 pages) | Yes (2-3 pages) | Yes (2-3 pages) | Yes (1-2 pages) |
| DDQ | Yes | Yes | Yes | Yes |
| Market Analysis | Yes | Yes | Yes | Yes |
| News/Insights | Yes | Yes | Yes | Yes |

Full prompt templates are in the reference data seeded during module setup. Firms can customize or reset to defaults via Settings.
