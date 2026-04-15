import { http, HttpResponse } from 'msw';
import type {
  Organization,
  PlatformUser,
  AuditLogEntry,
  CreateOrgPayload,
  CreateUserPayload,
  UpdateOrgPayload,
  ModuleSlug,
  LoginResponse,
  DashboardStats,
  PaginatedResponse,
} from '../types';
import { mockOrganizations } from './data/organizations';
import { mockUsers } from './data/users';
import { mockAuditLogs } from './data/audit-logs';

// ---------------------------------------------------------------------------
// Mutable in-memory state (Maps for O(1) lookup, reset on page reload)
// ---------------------------------------------------------------------------

const orgs = new Map<string, Organization>(
  mockOrganizations.map((o) => [o.id, { ...o }])
);

const users = new Map<string, PlatformUser>(
  mockUsers.map((u) => [u.id, { ...u }])
);

const auditLogs: AuditLogEntry[] = mockAuditLogs.map((a) => ({ ...a }));

// ---------------------------------------------------------------------------
// Auth state
// ---------------------------------------------------------------------------

let isAuthenticated = false;

const MOCK_ADMIN = {
  id: 'sa-001',
  email: 'admin@invictus.ai',
  name: 'Platform Admin',
  role: 'super_admin' as const,
};

const MOCK_TOKEN = 'mock-superadmin-jwt-token';

// ---------------------------------------------------------------------------
// Audit log helper
// ---------------------------------------------------------------------------

let auditIdCounter = mockAuditLogs.length + 1;

function addAuditLog(
  action: string,
  resourceType: string,
  resourceId: string,
  resourceName: string,
  metadata: Record<string, unknown> = {}
): void {
  const id = `audit-${String(auditIdCounter++).padStart(3, '0')}`;
  auditLogs.unshift({
    id,
    adminId: MOCK_ADMIN.id,
    adminName: MOCK_ADMIN.name,
    action,
    resourceType,
    resourceId,
    resourceName,
    metadata,
    createdAt: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Pagination helper
// ---------------------------------------------------------------------------

function paginate<T>(
  items: T[],
  page: number,
  pageSize: number
): PaginatedResponse<T> {
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  };
}

// ---------------------------------------------------------------------------
// ID generators
// ---------------------------------------------------------------------------

function newOrgId(): string {
  const existing = Array.from(orgs.keys())
    .filter((k) => k.startsWith('org-'))
    .map((k) => parseInt(k.replace('org-', ''), 10))
    .filter(Number.isFinite);
  const max = existing.length > 0 ? Math.max(...existing) : 0;
  return `org-${String(max + 1).padStart(3, '0')}`;
}

function newUserId(): string {
  const existing = Array.from(users.keys())
    .filter((k) => k.startsWith('user-'))
    .map((k) => parseInt(k.replace('user-', ''), 10))
    .filter(Number.isFinite);
  const max = existing.length > 0 ? Math.max(...existing) : 0;
  return `user-${String(max + 1).padStart(3, '0')}`;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export const handlers = [
  // =========================================================================
  // AUTH
  // =========================================================================

  http.post('/api/v1/superadmin/auth/login', async ({ request }) => {
    const body = await request.json() as { email?: string; password?: string };

    if (body.email !== 'admin@invictus.ai' || body.password !== 'admin123') {
      return HttpResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    isAuthenticated = true;

    addAuditLog('auth.login', 'session', MOCK_ADMIN.id, MOCK_ADMIN.name, {
      ip: '127.0.0.1',
      userAgent: 'Mock Browser',
    });

    return HttpResponse.json<LoginResponse>({
      token: MOCK_TOKEN,
      user: MOCK_ADMIN,
    });
  }),

  http.post('/api/v1/superadmin/auth/logout', () => {
    if (isAuthenticated) {
      addAuditLog('auth.logout', 'session', MOCK_ADMIN.id, MOCK_ADMIN.name, {});
    }
    isAuthenticated = false;
    return HttpResponse.json({ message: 'Logged out successfully' });
  }),

  // =========================================================================
  // DASHBOARD
  // =========================================================================

  http.get('/api/v1/superadmin/dashboard/stats', () => {
    const orgList = Array.from(orgs.values());
    const userList = Array.from(users.values());

    const modulesLicensed = orgList.reduce(
      (sum, o) => sum + o.enabledModules.length,
      0
    );

    const stats: DashboardStats = {
      organizations: {
        total: orgList.length,
        active: orgList.filter((o) => o.status === 'active').length,
        suspended: orgList.filter((o) => o.status === 'suspended').length,
      },
      users: {
        total: userList.length,
        active: userList.filter((u) => u.status === 'active').length,
        suspended: userList.filter((u) => u.status === 'suspended').length,
      },
      modulesLicensed,
      recentActivity: auditLogs.slice(0, 10),
    };

    return HttpResponse.json(stats);
  }),

  // =========================================================================
  // ORGANIZATIONS
  // =========================================================================

  // GET /organizations — list (paginated, filterable, searchable)
  http.get('/api/v1/superadmin/organizations', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') ?? '10', 10);
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search')?.toLowerCase();

    let filtered = Array.from(orgs.values());

    if (status) {
      filtered = filtered.filter((o) => o.status === status);
    }

    if (search) {
      filtered = filtered.filter(
        (o) =>
          o.name.toLowerCase().includes(search) ||
          o.supportEmail.toLowerCase().includes(search)
      );
    }

    return HttpResponse.json(paginate(filtered, page, pageSize));
  }),

  // POST /organizations — create
  http.post('/api/v1/superadmin/organizations', async ({ request }) => {
    const body = await request.json() as CreateOrgPayload;

    if (!body.name || !body.supportEmail || !body.currency || !body.timezone) {
      return HttpResponse.json(
        { message: 'name, supportEmail, currency, and timezone are required' },
        { status: 422 }
      );
    }

    const now = new Date().toISOString();
    const id = newOrgId();
    const newOrg: Organization = {
      id,
      name: body.name,
      registrationNumber: body.registrationNumber ?? null,
      website: body.website ?? null,
      supportEmail: body.supportEmail,
      currency: body.currency,
      timezone: body.timezone,
      status: 'active',
      enabledModules: [],
      userCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    orgs.set(id, newOrg);

    addAuditLog('org.created', 'organization', id, body.name, {
      currency: body.currency,
      timezone: body.timezone,
    });

    return HttpResponse.json(newOrg, { status: 201 });
  }),

  // GET /organizations/:id — detail
  http.get('/api/v1/superadmin/organizations/:id', ({ params }) => {
    const org = orgs.get(params.id as string);
    if (!org) {
      return HttpResponse.json({ message: 'Organization not found' }, { status: 404 });
    }
    return HttpResponse.json(org);
  }),

  // PATCH /organizations/:id — update
  http.patch('/api/v1/superadmin/organizations/:id', async ({ params, request }) => {
    const id = params.id as string;
    const org = orgs.get(id);
    if (!org) {
      return HttpResponse.json({ message: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json() as UpdateOrgPayload;
    const changedFields = Object.keys(body) as (keyof UpdateOrgPayload)[];
    const previousValues: Record<string, unknown> = {};

    for (const field of changedFields) {
      previousValues[field] = org[field as keyof Organization];
    }

    const updated: Organization = {
      ...org,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    orgs.set(id, updated);

    addAuditLog('org.updated', 'organization', id, updated.name, {
      fields: changedFields,
      previousValues,
    });

    return HttpResponse.json(updated);
  }),

  // PATCH /organizations/:id/status — suspend / reactivate
  http.patch('/api/v1/superadmin/organizations/:id/status', async ({ params, request }) => {
    const id = params.id as string;
    const org = orgs.get(id);
    if (!org) {
      return HttpResponse.json({ message: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json() as { status: 'active' | 'suspended'; reason?: string };

    if (!['active', 'suspended'].includes(body.status)) {
      return HttpResponse.json(
        { message: 'status must be "active" or "suspended"' },
        { status: 422 }
      );
    }

    const previousStatus = org.status;
    const updated: Organization = {
      ...org,
      status: body.status,
      updatedAt: new Date().toISOString(),
    };

    orgs.set(id, updated);

    const action = body.status === 'suspended' ? 'org.suspended' : 'org.reactivated';
    addAuditLog(action, 'organization', id, org.name, {
      previousStatus,
      reason: body.reason ?? null,
    });

    return HttpResponse.json(updated);
  }),

  // GET /organizations/:id/users — users belonging to org
  http.get('/api/v1/superadmin/organizations/:id/users', ({ params, request }) => {
    const id = params.id as string;
    if (!orgs.has(id)) {
      return HttpResponse.json({ message: 'Organization not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') ?? '20', 10);

    const orgUsers = Array.from(users.values()).filter((u) => u.tenantId === id);
    return HttpResponse.json(paginate(orgUsers, page, pageSize));
  }),

  // PATCH /organizations/:id/modules — update enabled modules
  http.patch('/api/v1/superadmin/organizations/:id/modules', async ({ params, request }) => {
    const id = params.id as string;
    const org = orgs.get(id);
    if (!org) {
      return HttpResponse.json({ message: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json() as { enabledModules: ModuleSlug[] };

    if (!Array.isArray(body.enabledModules)) {
      return HttpResponse.json({ message: 'enabledModules must be an array' }, { status: 422 });
    }

    const previousModules = [...org.enabledModules];
    const updated: Organization = {
      ...org,
      enabledModules: body.enabledModules,
      updatedAt: new Date().toISOString(),
    };

    orgs.set(id, updated);

    addAuditLog('org.modules_updated', 'organization', id, org.name, {
      previousModules,
      newModules: body.enabledModules,
    });

    return HttpResponse.json(updated);
  }),

  // =========================================================================
  // USERS
  // =========================================================================

  // POST /users — create a new user under an organization
  http.post('/api/v1/superadmin/users', async ({ request }) => {
    const body = (await request.json()) as CreateUserPayload;
    const org = orgs.get(body.tenantId);
    if (!org) {
      return HttpResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    const id = newUserId();
    const now = new Date().toISOString();
    const user: PlatformUser = {
      id,
      tenantId: body.tenantId,
      organizationName: org.name,
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      status: 'invited',
      moduleRoles: body.moduleRoles ?? [],
      lastLoginAt: null,
      createdAt: now,
    };
    users.set(id, user);
    orgs.set(org.id, { ...org, userCount: org.userCount + 1 });
    addAuditLog('user.created', 'user', id, body.email, {
      organization: org.name,
      tenantId: body.tenantId,
    });
    return HttpResponse.json(user, { status: 201 });
  }),

  // GET /users — list (paginated, filterable, searchable)
  http.get('/api/v1/superadmin/users', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') ?? '10', 10);
    const status = url.searchParams.get('status');
    const orgId = url.searchParams.get('orgId');
    const search = url.searchParams.get('search')?.toLowerCase();

    let filtered = Array.from(users.values());

    if (status) {
      filtered = filtered.filter((u) => u.status === status);
    }

    if (orgId) {
      filtered = filtered.filter((u) => u.tenantId === orgId);
    }

    if (search) {
      filtered = filtered.filter(
        (u) =>
          u.email.toLowerCase().includes(search) ||
          u.firstName.toLowerCase().includes(search) ||
          u.lastName.toLowerCase().includes(search) ||
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(search)
      );
    }

    return HttpResponse.json(paginate(filtered, page, pageSize));
  }),

  // GET /users/:id — detail
  http.get('/api/v1/superadmin/users/:id', ({ params }) => {
    const user = users.get(params.id as string);
    if (!user) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 });
    }
    return HttpResponse.json(user);
  }),

  // PATCH /users/:id/status — suspend / reactivate
  http.patch('/api/v1/superadmin/users/:id/status', async ({ params, request }) => {
    const id = params.id as string;
    const user = users.get(id);
    if (!user) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const body = await request.json() as { status: 'active' | 'suspended'; reason?: string };

    if (!['active', 'suspended'].includes(body.status)) {
      return HttpResponse.json(
        { message: 'status must be "active" or "suspended"' },
        { status: 422 }
      );
    }

    const previousStatus = user.status;
    const updated: PlatformUser = {
      ...user,
      status: body.status,
    };

    users.set(id, updated);

    const fullName = `${user.firstName} ${user.lastName}`;
    const action = body.status === 'suspended' ? 'user.suspended' : 'user.reactivated';
    addAuditLog(action, 'user', id, fullName, {
      previousStatus,
      orgId: user.tenantId,
      reason: body.reason ?? null,
    });

    return HttpResponse.json(updated);
  }),

  // PATCH /users/:id/module-roles — grant or revoke a module role
  http.patch('/api/v1/superadmin/users/:id/module-roles', async ({ params, request }) => {
    const id = params.id as string;
    const user = users.get(id);
    if (!user) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const body = await request.json() as {
      action: 'grant' | 'revoke';
      module: ModuleSlug;
      role: string;
    };

    if (!body.action || !body.module || !body.role) {
      return HttpResponse.json(
        { message: 'action, module, and role are required' },
        { status: 422 }
      );
    }

    let updatedRoles = [...user.moduleRoles];

    if (body.action === 'grant') {
      // Replace existing role for module or add new
      updatedRoles = updatedRoles.filter((r) => r.module !== body.module);
      updatedRoles.push({ module: body.module, role: body.role });
    } else if (body.action === 'revoke') {
      updatedRoles = updatedRoles.filter(
        (r) => !(r.module === body.module && r.role === body.role)
      );
    } else {
      return HttpResponse.json(
        { message: 'action must be "grant" or "revoke"' },
        { status: 422 }
      );
    }

    const updated: PlatformUser = { ...user, moduleRoles: updatedRoles };
    users.set(id, updated);

    const fullName = `${user.firstName} ${user.lastName}`;
    const auditAction =
      body.action === 'grant'
        ? 'user.module_role_granted'
        : 'user.module_role_revoked';

    addAuditLog(auditAction, 'user', id, fullName, {
      module: body.module,
      role: body.role,
      orgId: user.tenantId,
    });

    return HttpResponse.json(updated);
  }),

  // =========================================================================
  // AUDIT LOGS
  // =========================================================================

  // GET /audit-logs — list (paginated, filterable)
  http.get('/api/v1/superadmin/audit-logs', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') ?? '20', 10);
    const action = url.searchParams.get('action');
    const resourceType = url.searchParams.get('resourceType');

    let filtered = [...auditLogs]; // already sorted newest-first

    if (action) {
      filtered = filtered.filter((a) => a.action === action);
    }

    if (resourceType) {
      filtered = filtered.filter((a) => a.resourceType === resourceType);
    }

    return HttpResponse.json(paginate(filtered, page, pageSize));
  }),
];
