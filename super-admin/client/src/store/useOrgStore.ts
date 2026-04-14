import { create } from 'zustand';
import { api } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import type {
  Organization,
  PlatformUser,
  PaginatedResponse,
  CreateOrgPayload,
  UpdateOrgPayload,
  ModuleSlug,
} from '@/api/types';

interface OrgState {
  organizations: Organization[];
  total: number;
  loading: boolean;
  currentOrg: Organization | null;
  currentOrgUsers: PlatformUser[];
  currentOrgUsersTotal: number;

  fetchOrganizations: (params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    search?: string;
  }) => Promise<void>;

  fetchOrganization: (id: string) => Promise<void>;
  createOrganization: (payload: CreateOrgPayload) => Promise<Organization>;
  updateOrganization: (id: string, payload: UpdateOrgPayload) => Promise<void>;
  updateOrgStatus: (id: string, status: 'active' | 'suspended') => Promise<void>;
  updateOrgModules: (id: string, enabledModules: ModuleSlug[]) => Promise<void>;
  fetchOrgUsers: (id: string, params?: { page?: number; pageSize?: number }) => Promise<void>;
}

export const useOrgStore = create<OrgState>((set) => ({
  organizations: [],
  total: 0,
  loading: false,
  currentOrg: null,
  currentOrgUsers: [],
  currentOrgUsersTotal: 0,

  fetchOrganizations: async (params) => {
    set({ loading: true });
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    const url = `${ENDPOINTS.organizations.list}${qs ? `?${qs}` : ''}`;
    const res = await api.get<PaginatedResponse<Organization>>(url);
    set({ organizations: res.data, total: res.total, loading: false });
  },

  fetchOrganization: async (id) => {
    const org = await api.get<Organization>(ENDPOINTS.organizations.detail(id));
    set({ currentOrg: org });
  },

  createOrganization: async (payload) => {
    const org = await api.post<Organization>(ENDPOINTS.organizations.create, payload);
    set((s) => ({ organizations: [org, ...s.organizations], total: s.total + 1 }));
    return org;
  },

  updateOrganization: async (id, payload) => {
    const org = await api.patch<Organization>(ENDPOINTS.organizations.update(id), payload);
    set((s) => ({
      currentOrg: org,
      organizations: s.organizations.map((o) => (o.id === id ? org : o)),
    }));
  },

  updateOrgStatus: async (id, status) => {
    const org = await api.patch<Organization>(ENDPOINTS.organizations.status(id), { status });
    set((s) => ({
      currentOrg: org,
      organizations: s.organizations.map((o) => (o.id === id ? org : o)),
    }));
  },

  updateOrgModules: async (id, enabledModules) => {
    const org = await api.patch<Organization>(ENDPOINTS.organizations.modules(id), {
      enabledModules,
    });
    set((s) => ({
      currentOrg: org,
      organizations: s.organizations.map((o) => (o.id === id ? org : o)),
    }));
  },

  fetchOrgUsers: async (id, params) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    const qs = query.toString();
    const url = `${ENDPOINTS.organizations.users(id)}${qs ? `?${qs}` : ''}`;
    const res = await api.get<PaginatedResponse<PlatformUser>>(url);
    set({ currentOrgUsers: res.data, currentOrgUsersTotal: res.total });
  },
}));
