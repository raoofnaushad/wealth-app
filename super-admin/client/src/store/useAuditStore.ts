import { create } from 'zustand';
import { api } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import type { AuditLogEntry, PaginatedResponse } from '@/api/types';

interface AuditState {
  logs: AuditLogEntry[];
  total: number;
  loading: boolean;
  fetchLogs: (params?: {
    page?: number;
    pageSize?: number;
    action?: string;
    resourceType?: string;
  }) => Promise<void>;
}

export const useAuditStore = create<AuditState>((set) => ({
  logs: [],
  total: 0,
  loading: false,

  fetchLogs: async (params) => {
    set({ loading: true });
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    if (params?.action) query.set('action', params.action);
    if (params?.resourceType) query.set('resourceType', params.resourceType);
    const qs = query.toString();
    const url = `${ENDPOINTS.auditLogs.list}${qs ? `?${qs}` : ''}`;
    const res = await api.get<PaginatedResponse<AuditLogEntry>>(url);
    set({ logs: res.data, total: res.total, loading: false });
  },
}));
