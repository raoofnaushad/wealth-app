import { create } from 'zustand'
import type { ModuleRole, ModuleSlug } from '@/modules/admin/types'

interface User {
  id: string
  name: string
  email: string
  initials: string
  firstName: string
  lastName: string
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  tenantId: string
  moduleRoles: Partial<Record<ModuleSlug, ModuleRole>>
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  hasModuleAccess: (moduleSlug: ModuleSlug) => boolean
  getModuleRole: (moduleSlug: ModuleSlug) => ModuleRole | null
  isOrgAdmin: () => boolean
}

function deriveUser(input: string): User {
  const trimmed = input.trim()
  let nameParts: string[]
  let email: string

  if (trimmed.includes('@')) {
    email = trimmed.toLowerCase()
    const localPart = email.split('@')[0]
    nameParts = localPart.split(/[._\-+]+/).filter(Boolean)
  } else {
    nameParts = trimmed.split(/\s+/).filter(Boolean)
    email = `${nameParts.join('.').toLowerCase()}@asbitech.ai`
  }

  const firstName = nameParts[0]
    ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1).toLowerCase()
    : ''
  const lastName = nameParts.length >= 2
    ? nameParts[nameParts.length - 1].charAt(0).toUpperCase() + nameParts[nameParts.length - 1].slice(1).toLowerCase()
    : ''
  const name = [firstName, lastName].filter(Boolean).join(' ')
  const initials = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()

  return { id: 'user-raoof', name, email, initials, firstName, lastName }
}

const DEFAULT_MODULE_ROLES: Partial<Record<ModuleSlug, ModuleRole>> = {
  admin: 'owner',
  deals: 'manager',
  engage: 'manager',
  insights: 'analyst',
}

function loadStoredAuth(): { user: User | null; moduleRoles: Partial<Record<ModuleSlug, ModuleRole>> } {
  const stored = localStorage.getItem('auth_user')
  const storedRoles = localStorage.getItem('auth_module_roles')
  let user: User | null = null
  let moduleRoles = DEFAULT_MODULE_ROLES

  if (stored) {
    try { user = JSON.parse(stored) as User } catch { /* ignore */ }
  }
  if (storedRoles) {
    try { moduleRoles = JSON.parse(storedRoles) as Partial<Record<ModuleSlug, ModuleRole>> } catch { /* ignore */ }
  }

  return { user, moduleRoles }
}

const initial = loadStoredAuth()

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: !!localStorage.getItem('auth_token'),
  user: initial.user,
  tenantId: 'tenant-watar',
  moduleRoles: initial.moduleRoles,

  login: async (email: string, password: string) => {
    if (import.meta.env.VITE_USE_REAL_API === 'true') {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      if (!response.ok) {
        throw new Error('Invalid credentials')
      }
      const result = await response.json()
      const token = result.data.access_token
      localStorage.setItem('auth_token', token)

      // Decode JWT payload to get user info
      const payload = JSON.parse(atob(token.split('.')[1]))
      const user = {
        id: payload.sub,
        name: `${payload.first_name} ${payload.last_name}`,
        email: payload.email,
        initials: `${payload.first_name[0]}${payload.last_name[0]}`.toUpperCase(),
        firstName: payload.first_name,
        lastName: payload.last_name,
      }
      const moduleRoles = payload.module_roles

      localStorage.setItem('auth_user', JSON.stringify(user))
      localStorage.setItem('auth_module_roles', JSON.stringify(moduleRoles))

      set({
        isAuthenticated: true,
        user,
        tenantId: payload.tenant_id,
        moduleRoles,
      })
    } else {
      const user = deriveUser(email)
      const moduleRoles = DEFAULT_MODULE_ROLES
      localStorage.setItem('auth_token', 'mock-jwt-token')
      localStorage.setItem('auth_user', JSON.stringify(user))
      localStorage.setItem('auth_module_roles', JSON.stringify(moduleRoles))
      set({ isAuthenticated: true, user, moduleRoles })
    }
  },

  logout: () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_module_roles')
    set({ isAuthenticated: false, user: null, moduleRoles: {} })
  },

  hasModuleAccess: (moduleSlug: ModuleSlug) => {
    return moduleSlug in get().moduleRoles
  },

  getModuleRole: (moduleSlug: ModuleSlug) => {
    return get().moduleRoles[moduleSlug] ?? null
  },

  isOrgAdmin: () => {
    return 'admin' in get().moduleRoles
  },
}))
