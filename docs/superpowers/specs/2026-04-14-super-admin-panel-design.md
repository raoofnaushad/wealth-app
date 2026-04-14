# Super Admin Panel — MVP Design Spec

**Date:** 2026-04-14
**Status:** Draft
**Phase:** 1 (MVP)

---

## Overview

A standalone Super Admin panel for the Invictus AI platform, enabling the internal team to manage organizations, oversee users, control module licensing, and audit platform-level actions. This is completely separate from the tenant-facing application — different auth system, different UI, different deployment target (`admin.invictus.ai`).

## Approach

- **Frontend-first with MSW mocks** — build the full UI with mocked API responses, then build the backend to match the established API contracts
- **Separate SPA in the same repo** — lives at `super-admin/client/`, independent from `client/`
- **Backend deferred** — will be added as `server/app/modules/superadmin/` in the existing FastAPI app (shares the same DB)

## Tech Stack

Mirrors the main client application:

- React 19 + TypeScript 5.9
- Vite 8 (build tool, dev server)
- pnpm 10.15 (package manager)
- Zustand 5 (state management)
- shadcn/ui (base-nova style) + Tailwind CSS 4.2 (styling)
- React Router 7 (client-side routing)
- MSW 2 (API mocking)
- Lucide React (icons)
- ESLint flat config (linting, no Prettier)

**Visual distinction:** Deep indigo/slate color palette to differentiate from the tenant app.

## MVP Scope

### In Scope (Phase 1)

1. Super admin authentication (separate login, `super_admin` role only)
2. Organization management (create, view, update, suspend/reactivate)
3. Module licensing (enable/disable modules per org)
4. User oversight (cross-tenant user search, suspend/reactivate, grant/revoke module access)
5. Dashboard (summary cards, recent activity)
6. Audit logs (filterable platform action log)

### Deferred (Phase 2+)

- Subscription/billing management
- Feature flags system
- Platform metrics dashboard with charts
- User impersonation for support
- Platform announcements
- System health monitoring
- `support` and `billing` admin roles

---

## Directory Structure

```
super-admin/
└── client/
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tsconfig.app.json
    ├── tailwind.config.ts
    ├── components.json
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css
        ├── pages/
        │   ├── LoginPage.tsx
        │   ├── DashboardPage.tsx
        │   ├── OrganizationsPage.tsx
        │   ├── OrgDetailPage.tsx
        │   ├── UsersPage.tsx
        │   └── AuditLogPage.tsx
        ├── components/
        │   ├── ui/                         # shadcn/ui primitives
        │   ├── layout/
        │   │   ├── AdminShell.tsx
        │   │   ├── Sidebar.tsx
        │   │   └── TopBar.tsx
        │   ├── organizations/
        │   │   ├── OrgTable.tsx
        │   │   ├── CreateOrgDialog.tsx
        │   │   ├── OrgStatusBadge.tsx
        │   │   └── ModuleLicenseToggle.tsx
        │   ├── users/
        │   │   ├── UserTable.tsx
        │   │   └── UserAccessActions.tsx
        │   └── audit/
        │       └── AuditLogTable.tsx
        ├── store/
        │   ├── useAuthStore.ts
        │   ├── useOrgStore.ts
        │   └── useAuditStore.ts
        ├── api/
        │   ├── client.ts
        │   ├── endpoints.ts
        │   ├── types.ts
        │   └── mock/
        │       ├── browser.ts
        │       ├── handlers.ts
        │       └── data/
        │           ├── organizations.ts
        │           ├── users.ts
        │           └── audit-logs.ts
        ├── hooks/
        ├── lib/
        │   └── utils.ts
        └── types/
```

### Conventions

Same as the main `client/`:

- Named exports with function declarations
- Props as interfaces above the component
- PascalCase filenames
- `cn()` from `@/lib/utils` for Tailwind class composition
- `@` path alias maps to `src/`
- Zustand stores named `use<Domain>Store`

---

## Authentication

### Auth Flow

1. Super admin navigates to the login page
2. Enters email + password
3. `POST /api/v1/superadmin/auth/login` returns a JWT with `type: "platform_admin"`
4. Token stored in `localStorage` under key `sa_token` (distinct from tenant `token`)
5. All subsequent API calls include `Authorization: Bearer <sa_token>`
6. Logout clears `sa_token` and redirects to `/login`

### Auth Store

```typescript
interface SuperAdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin';
}

interface AuthState {
  isAuthenticated: boolean;
  user: SuperAdminUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
```

### Routes & Guards

| Route | Page | Guard |
|-------|------|-------|
| `/login` | LoginPage | GuestGuard (redirects to `/` if authenticated) |
| `/` | DashboardPage | AuthGuard |
| `/organizations` | OrganizationsPage | AuthGuard |
| `/organizations/:id` | OrgDetailPage | AuthGuard |
| `/users` | UsersPage | AuthGuard |
| `/audit-logs` | AuditLogPage | AuthGuard |

### MSW Mock

- `POST /api/v1/superadmin/auth/login` — accepts `admin@invictus.ai` / `admin123`, returns mock JWT
- `POST /api/v1/superadmin/auth/logout` — returns `{ success: true }`

---

## Organization Management

### Organizations Page (`/organizations`)

**Table columns:** Name, Status, Modules Enabled, Users Count, Created Date

**Capabilities:**
- Sort by name, status, created date
- Filter by status (`active`, `suspended`, `deleted`)
- Search by org name
- "Create Organization" button opens CreateOrgDialog

### Create Organization Dialog

**Fields:**
- Name (required)
- Registration Number (optional)
- Website (optional)
- Support Email (required)
- Currency (dropdown, default: USD)
- Timezone (dropdown, default: UTC)

Creates org with `active` status and all modules disabled by default.

### Org Detail Page (`/organizations/:id`)

Three sections:

**1. Organization Info**
Editable card: name, registration number, website, support email, currency, timezone, status. Save button to persist changes.

**2. Module Licensing**
Grid of 6 module cards (Engage, Plan, Tools, Deals, Insights, Admin). Each has a toggle switch to enable/disable for this org. Disabling a module removes org-level access — existing user role assignments for that module are preserved in the database but become inactive. Re-enabling the module restores access without needing to reassign roles.

**3. Organization Users**
Table of users in this org. Columns: Name, Email, Status, Module Roles, Actions (suspend/reactivate). No user editing — that's the tenant admin's responsibility.

**Org Actions (header):**
- Suspend Organization — sets status to `suspended`
- Reactivate Organization — sets status back to `active`
- No hard delete in MVP

### API Endpoints

```
GET    /api/v1/superadmin/organizations                → PaginatedResponse<Organization>
POST   /api/v1/superadmin/organizations                → Organization
GET    /api/v1/superadmin/organizations/:id             → Organization
PATCH  /api/v1/superadmin/organizations/:id             → Organization
PATCH  /api/v1/superadmin/organizations/:id/status      → Organization
GET    /api/v1/superadmin/organizations/:id/users       → PaginatedResponse<PlatformUser>
PATCH  /api/v1/superadmin/organizations/:id/modules     → Organization
```

---

## User Oversight

### Users Page (`/users`)

Cross-tenant user search and management.

**Table columns:** Name, Email, Organization Name, Status, Module Roles, Last Login, Actions

**Capabilities:**
- Search by name or email
- Filter by status (`active`, `invited`, `suspended`)
- Filter by organization (dropdown)
- Clicking org name navigates to `/organizations/:id`

**User Actions:**
- Suspend User — sets status to `suspended`
- Reactivate User — sets status back to `active`
- Revoke Module Access — remove a specific module role
- Grant Module Access — add a module role

No user creation — done through tenant admin's invitation flow.

### API Endpoints

```
GET    /api/v1/superadmin/users                        → PaginatedResponse<PlatformUser>
GET    /api/v1/superadmin/users/:id                    → PlatformUser
PATCH  /api/v1/superadmin/users/:id/status             → PlatformUser
PATCH  /api/v1/superadmin/users/:id/module-roles       → PlatformUser
```

---

## Dashboard

### Dashboard Page (`/`)

**Summary Cards (top row):**
- Total Organizations (active / suspended breakdown)
- Total Users (active / suspended breakdown)
- Total Modules Licensed (across all orgs)

**Recent Activity (below cards):**
- Latest 10 audit log entries
- Each shows: timestamp, action description, admin name
- "View All" link to `/audit-logs`

No charts or complex visualizations in MVP.

### API Endpoint

```
GET  /api/v1/superadmin/dashboard/stats               → DashboardStats
```

```typescript
interface DashboardStats {
  organizations: { total: number; active: number; suspended: number };
  users: { total: number; active: number; suspended: number };
  modulesLicensed: number;
  recentActivity: AuditLogEntry[];
}
```

---

## Audit Logs

### Audit Log Page (`/audit-logs`)

**Table columns:** Timestamp, Admin Name, Action, Resource Type, Resource Name, Details

**Capabilities:**
- Filter by action type, resource type, date range
- Sort by timestamp (default: newest first)
- Paginated

**Logged actions:**
- Organization: created, updated, suspended, reactivated
- User: suspended, reactivated
- Module access: granted, revoked (for a user)
- Module licensing: changed (for an org)
- Auth: login, logout

### API Endpoint

```
GET  /api/v1/superadmin/audit-logs                    → PaginatedResponse<AuditLogEntry>
```

### Audit Log Entry

```typescript
interface AuditLogEntry {
  id: string;
  adminId: string;
  adminName: string;
  action: string;                      // e.g., "org.created", "user.suspended"
  resourceType: string;                // "organization" | "user" | "module_license"
  resourceId: string;
  resourceName: string;                // human-readable: org name or user email
  metadata: Record<string, unknown>;   // extra context (e.g., old/new status)
  createdAt: string;
}
```

---

## Core TypeScript Types

```typescript
interface Organization {
  id: string;
  name: string;
  registrationNumber: string | null;
  website: string | null;
  supportEmail: string;
  currency: string;
  timezone: string;
  status: 'active' | 'suspended' | 'deleted';
  enabledModules: ModuleSlug[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

type ModuleSlug = 'engage' | 'plan' | 'tools' | 'deals' | 'insights' | 'admin';

interface PlatformUser {
  id: string;
  tenantId: string;
  organizationName: string;
  email: string;
  firstName: string;
  lastName: string;
  status: 'active' | 'invited' | 'suspended';
  moduleRoles: { module: ModuleSlug; role: string }[];
  lastLoginAt: string | null;
  createdAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface SuperAdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin';
}
```

---

## MSW Mock Data

**Mock dataset:**
- 4 organizations — 2 active, 1 suspended, 1 with all modules disabled
- 12-15 users spread across the orgs with varied statuses and module roles
- 20-30 audit log entries covering different action types
- 1 super admin account — `admin@invictus.ai` / `admin123`

**Mock behavior:**
- Mutable state via Maps — creates and updates persist during a browser session
- MSW starts before app mount in `main.tsx`
- Controlled by `VITE_USE_REAL_API` env var — when `true`, MSW does not start

---

## Backend (Deferred — Reference Only)

When the backend is built, it will be added as `server/app/modules/superadmin/` following the same 5-layer pattern:

- `router.py` — FastAPI APIRouter mounted at `/api/v1/superadmin`
- `service.py` — business logic
- `repository.py` — SQLAlchemy queries (no RLS — super admin bypasses tenant isolation)
- `models.py` — `PlatformAdmin` model in `superadmin` schema
- `schemas.py` — Pydantic request/response models

Database tables will live in the `superadmin` PostgreSQL schema, separate from tenant schemas. The `superadmin.platform_admins` table stores admin credentials and roles. All other queries read from the existing `admin.organizations`, `admin.users`, and `admin.user_module_roles` tables without tenant filtering.

---

## Phase 2 Roadmap (Not in Scope)

- Subscription/billing management
- Feature flags (global and per-org)
- Platform metrics dashboard with charts
- User impersonation for support
- Platform announcements
- System health monitoring
- `support` and `billing` admin roles with scoped permissions
