export const ENDPOINTS = {
  auth: {
    login: '/api/v1/superadmin/auth/login',
    logout: '/api/v1/superadmin/auth/logout',
  },
  dashboard: {
    stats: '/api/v1/superadmin/dashboard/stats',
  },
  organizations: {
    list: '/api/v1/superadmin/organizations',
    create: '/api/v1/superadmin/organizations',
    detail: (id: string) => `/api/v1/superadmin/organizations/${id}`,
    update: (id: string) => `/api/v1/superadmin/organizations/${id}`,
    status: (id: string) => `/api/v1/superadmin/organizations/${id}/status`,
    users: (id: string) => `/api/v1/superadmin/organizations/${id}/users`,
    modules: (id: string) => `/api/v1/superadmin/organizations/${id}/modules`,
  },
  users: {
    list: '/api/v1/superadmin/users',
    create: '/api/v1/superadmin/users',
    detail: (id: string) => `/api/v1/superadmin/users/${id}`,
    status: (id: string) => `/api/v1/superadmin/users/${id}/status`,
    moduleRoles: (id: string) => `/api/v1/superadmin/users/${id}/module-roles`,
  },
  auditLogs: {
    list: '/api/v1/superadmin/audit-logs',
  },
} as const;
