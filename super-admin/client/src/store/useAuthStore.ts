import { create } from 'zustand';
import { api } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import type { SuperAdminUser, LoginResponse } from '@/api/types';

const TOKEN_KEY = 'sa_token';

interface AuthState {
  isAuthenticated: boolean;
  user: SuperAdminUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY),
  user: JSON.parse(localStorage.getItem('sa_user') || 'null'),
  token: localStorage.getItem(TOKEN_KEY),

  login: async (email: string, password: string) => {
    const res = await api.post<LoginResponse>(ENDPOINTS.auth.login, {
      email,
      password,
    });
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem('sa_user', JSON.stringify(res.user));
    set({ isAuthenticated: true, user: res.user, token: res.token });
  },

  logout: () => {
    api.post(ENDPOINTS.auth.logout, {}).catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('sa_user');
    set({ isAuthenticated: false, user: null, token: null });
  },
}));
