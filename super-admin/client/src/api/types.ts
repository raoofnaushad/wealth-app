export type ModuleSlug = 'engage' | 'plan' | 'tools' | 'deals' | 'insights' | 'admin';

export interface Organization {
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

export interface CreateOrgPayload {
  name: string;
  registrationNumber?: string;
  website?: string;
  supportEmail: string;
  currency: string;
  timezone: string;
}

export interface UpdateOrgPayload {
  name?: string;
  registrationNumber?: string | null;
  website?: string | null;
  supportEmail?: string;
  currency?: string;
  timezone?: string;
}

export interface PlatformUser {
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

export interface SuperAdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin';
}

export interface AuditLogEntry {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardStats {
  organizations: { total: number; active: number; suspended: number };
  users: { total: number; active: number; suspended: number };
  modulesLicensed: number;
  recentActivity: AuditLogEntry[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LoginResponse {
  token: string;
  user: SuperAdminUser;
}
