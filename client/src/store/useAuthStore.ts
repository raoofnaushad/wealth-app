import { create } from 'zustand'
import type { ModuleRole, ModuleSlug } from '@/modules/admin/types'
import type { ProfileResponse, CompanyResponse, JwtPayload } from '@/api/types'
import {
  login as platformLogin,
  decodeJwt,
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  refreshTokens,
  isTokenExpired,
  getProfile,
  getCompany,
} from '@/api/platform-api'

export interface User {
  id: number
  username: string
  email: string
  firstName: string
  lastName: string
  name: string
  initials: string
  companyId: number
  companyName: string
  role: number
  capabilities: string[]
  globalRoleId: number
  timezone: string
  language: string
}

export interface Company {
  id: number
  name: string
  phone: string
  defaultCurrencyId: number
  defaultTimeZoneId: number
  preferredLanguageId: number
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  company: Company | null
  moduleRoles: Partial<Record<ModuleSlug, ModuleRole>>
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  hasModuleAccess: (moduleSlug: ModuleSlug) => boolean
  getModuleRole: (moduleSlug: ModuleSlug) => ModuleRole | null
  isOrgAdmin: () => boolean
  startRefreshTimer: () => void
  stopRefreshTimer: () => void
}

const DEFAULT_MODULE_ROLES: Partial<Record<ModuleSlug, ModuleRole>> = {
  admin: 'owner',
  deals: 'manager',
  engage: 'manager',
  insights: 'analyst',
}

let refreshTimerId: ReturnType<typeof setInterval> | null = null

function loadStoredAuth(): {
  user: User | null
  company: Company | null
  moduleRoles: Partial<Record<ModuleSlug, ModuleRole>>
} {
  let user: User | null = null
  let company: Company | null = null
  const moduleRoles = DEFAULT_MODULE_ROLES

  const storedUser = localStorage.getItem('auth_user')
  const storedCompany = localStorage.getItem('auth_company')

  if (storedUser) {
    try { user = JSON.parse(storedUser) as User } catch { /* ignore */ }
  }
  if (storedCompany) {
    try { company = JSON.parse(storedCompany) as Company } catch { /* ignore */ }
  }

  return { user, company, moduleRoles }
}

function buildUserFromJwtAndProfile(
  jwt: JwtPayload,
  profile: ProfileResponse,
  companyName: string,
): User {
  const firstName = profile.userProfileDto.userFirstName
  const lastName = profile.userProfileDto.userLastName
  const name = [firstName, lastName].filter(Boolean).join(' ')
  const initials = firstName && lastName
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase()

  return {
    id: jwt.id,
    username: jwt.sub,
    email: profile.emailAddress,
    firstName,
    lastName,
    name,
    initials,
    companyId: jwt.companyId,
    companyName,
    role: jwt.role,
    capabilities: jwt.capabilities,
    globalRoleId: profile.globalRoleId,
    timezone: jwt.userTimezone,
    language: jwt.userLanguage,
  }
}

function buildCompany(res: CompanyResponse): Company {
  return {
    id: res.company.id,
    name: res.company.name,
    phone: res.company.phone,
    defaultCurrencyId: res.company.defaultCurrencyId,
    defaultTimeZoneId: res.company.defaultTimeZoneId,
    preferredLanguageId: res.company.preferredLanguageId,
  }
}

const initial = loadStoredAuth()

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: !!getAccessToken(),
  user: initial.user,
  company: initial.company,
  moduleRoles: initial.moduleRoles,

  login: async (username: string, password: string) => {
    const tokens = await platformLogin({ username, password })
    const jwt = decodeJwt(tokens.access_token)

    const [profile, companyRes] = await Promise.all([
      getProfile(),
      getCompany(jwt.companyId),
    ])

    const company = buildCompany(companyRes)
    const user = buildUserFromJwtAndProfile(jwt, profile, company.name)

    localStorage.setItem('auth_user', JSON.stringify(user))
    localStorage.setItem('auth_company', JSON.stringify(company))

    set({
      isAuthenticated: true,
      user,
      company,
      moduleRoles: DEFAULT_MODULE_ROLES,
    })

    get().startRefreshTimer()
  },

  logout: () => {
    get().stopRefreshTimer()
    clearTokens()
    set({
      isAuthenticated: false,
      user: null,
      company: null,
      moduleRoles: {},
    })
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

  startRefreshTimer: () => {
    get().stopRefreshTimer()

    refreshTimerId = setInterval(async () => {
      const token = getAccessToken()
      if (!token) return

      if (isTokenExpired(token, 60)) {
        try {
          await refreshTokens()
        } catch {
          get().logout()
          window.location.href = '/login'
        }
      }
    }, 30_000)
  },

  stopRefreshTimer: () => {
    if (refreshTimerId) {
      clearInterval(refreshTimerId)
      refreshTimerId = null
    }
  },
}))

// Start refresh timer on load if already authenticated
if (getAccessToken() && !isTokenExpired(getAccessToken()!)) {
  useAuthStore.getState().startRefreshTimer()
}
