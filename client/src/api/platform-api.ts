import type {
  LoginRequest,
  LoginResponse,
  ProfileResponse,
  CompanyResponse,
  JwtPayload,
} from './types'

const PLATFORM_URL = import.meta.env.VITE_PLATFORM_API_URL || '/platform-api'

// ── JWT Helpers ──────────────────────────────────────────────────────

export function decodeJwt(token: string): JwtPayload {
  const base64 = token.split('.')[1]
  const json = atob(base64)
  return JSON.parse(json) as JwtPayload
}

export function isTokenExpired(token: string, bufferSeconds = 0): boolean {
  try {
    const { exp } = decodeJwt(token)
    return Date.now() / 1000 > exp - bufferSeconds
  } catch {
    return true
  }
}

// ── Token Storage ────────────────────────────────────────────────────

export function getAccessToken(): string | null {
  return localStorage.getItem('access_token')
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token')
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem('access_token', access)
  localStorage.setItem('refresh_token', refresh)
}

export function clearTokens(): void {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('auth_user')
  localStorage.removeItem('auth_company')
}

// ── Refresh Queue ────────────────────────────────────────────────────

let refreshPromise: Promise<LoginResponse> | null = null

export async function refreshTokens(): Promise<LoginResponse> {
  if (refreshPromise) return refreshPromise

  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${PLATFORM_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refreshToken}`,
        },
      })

      if (!res.ok) {
        throw new Error(`Refresh failed: ${res.status}`)
      }

      const data: LoginResponse = await res.json()
      setTokens(data.access_token, data.refresh_token)
      return data
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

// ── API Methods ──────────────────────────────────────────────────────

export async function login(request: LoginRequest): Promise<LoginResponse> {
  const res = await fetch(`${PLATFORM_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Invalid credentials')
    }
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { message?: string }).message || `Login failed: ${res.status}`)
  }

  const data: LoginResponse = await res.json()
  setTokens(data.access_token, data.refresh_token)
  return data
}

async function authenticatedFetch<T>(path: string, options?: RequestInit): Promise<T> {
  let token = getAccessToken()

  if (token && isTokenExpired(token, 60)) {
    try {
      await refreshTokens()
      token = getAccessToken()
    } catch {
      clearTokens()
      window.location.href = '/login'
      throw new Error('Session expired')
    }
  }

  const res = await fetch(`${PLATFORM_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })

  if (res.status === 401) {
    try {
      await refreshTokens()
      const newToken = getAccessToken()
      const retryRes = await fetch(`${PLATFORM_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(newToken ? { Authorization: `Bearer ${newToken}` } : {}),
          ...options?.headers,
        },
      })
      if (!retryRes.ok) throw new Error(`Request failed: ${retryRes.status}`)
      return retryRes.json() as Promise<T>
    } catch {
      clearTokens()
      window.location.href = '/login'
      throw new Error('Session expired')
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { message?: string }).message || `Request failed: ${res.status}`)
  }

  return res.json() as Promise<T>
}

export function getProfile(): Promise<ProfileResponse> {
  return authenticatedFetch<ProfileResponse>('/profile')
}

export function getCompany(companyId: number): Promise<CompanyResponse> {
  return authenticatedFetch<CompanyResponse>(`/companies/${companyId}`)
}
