# Real Backend Auth & Copilot Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mock auth and direct-LLM browser chat with real Platform API authentication and async Copilot API integration.

**Architecture:** Two new API clients (`platform-api.ts` for auth/profile/company, `copilot-client.ts` for trigger+poll chat), rewritten auth store with JWT token management and auto-refresh, rewritten chat store using async trigger+poll pattern. Direct LLM provider files deleted. MSW stays for non-auth/non-copilot routes.

**Tech Stack:** React 19, TypeScript, Zustand 5, Vite 8 (dev proxy for CORS)

**Spec:** `docs/superpowers/specs/2026-04-17-real-auth-copilot-integration-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/api/platform-api.ts` | Platform API client: login, refresh, getProfile, getCompany |
| `src/api/copilot-client.ts` | Copilot API client: send, poll, ask, getProviders |
| `client/.env.example` | Environment variable template |

### Modified Files

| File | Changes |
|------|---------|
| `client/vite.config.ts` | Add proxy for `/platform-api` → staging URL |
| `client/.env.development` | Replace LLM keys with Platform/Copilot URLs |
| `src/api/types.ts` | Add Copilot request/response types, Platform API response types |
| `src/store/useAuthStore.ts` | Full rewrite: real login, JWT decode, profile/company fetch, refresh timer |
| `src/pages/LoginPage.tsx` | Update variable names, error handling for real API |
| `src/store/useChatStore.ts` | Full rewrite: CopilotClient integration, conversationId, remove direct LLM |
| `src/components/chat/ChatInput.tsx` | Model selector maps to `{ provider, model }` object |
| `src/components/chat/ChatMessage.tsx` | Add source citation rendering for Copilot output |
| `src/components/chat/ChatPanel.tsx` | Minor: remove simulated loading check |
| `src/main.tsx` | Remove `VITE_USE_REAL_API` conditional |
| `src/api/client.ts` | Integrate token refresh on 401 |
| `src/api/endpoints.ts` | Keep only deals/admin/summary endpoints |

### Deleted Files

| File | Reason |
|------|--------|
| `src/api/anthropic.ts` | Direct browser LLM calls removed |
| `src/api/azure-openai.ts` | Direct browser LLM calls removed |
| `src/api/openrouter.ts` | Direct browser LLM calls removed |
| `src/api/tavily.ts` | Web search handled by Copilot backend |
| `src/api/knowledge-base.ts` | Knowledge handled by Copilot backend RAG |
| `src/api/tool-call-simulation.ts` | Real tool calls from Copilot backend |

---

## Task 1: Environment & Vite Proxy Setup

**Files:**
- Create: `client/.env.example`
- Modify: `client/.env.development`
- Modify: `client/vite.config.ts:13-20`

- [ ] **Step 1: Create `.env.example`**

```bash
# client/.env.example
VITE_PLATFORM_API_URL=/platform-api
VITE_COPILOT_API_URL=/api
VITE_API_BASE_URL=/api
```

- [ ] **Step 2: Update `.env.development`**

Replace the entire file contents with:

```bash
VITE_PLATFORM_API_URL=/platform-api
VITE_COPILOT_API_URL=/api
VITE_API_BASE_URL=/api
```

This removes all LLM API keys (`VITE_ANTHROPIC_API_KEY`, `VITE_TAVILY_API_KEY`, `VITE_AZURE_*`, `VITE_OPENROUTER_API_KEY`, `VITE_USE_MOCK_API`).

- [ ] **Step 3: Update Vite proxy config**

In `client/vite.config.ts`, replace the `server.proxy` block:

```typescript
server: {
  proxy: {
    '/platform-api': {
      target: 'https://staging.asbitech.ai/esb/api/v1',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/platform-api/, ''),
      secure: true,
    },
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },
},
```

This proxies `/platform-api/*` to the staging Platform API and `/api/*` to the local Copilot API, avoiding CORS issues.

- [ ] **Step 4: Verify dev server starts**

Run: `cd client && pnpm dev`
Expected: Dev server starts without errors on http://localhost:5173

- [ ] **Step 5: Commit**

```bash
git add client/.env.example client/.env.development client/vite.config.ts
git commit -m "chore: configure env vars and Vite proxy for Platform + Copilot APIs"
```

---

## Task 2: Platform API Types

**Files:**
- Modify: `client/src/api/types.ts`

- [ ] **Step 1: Add Platform API response types**

Add the following types at the end of `client/src/api/types.ts` (after the existing types, before the closing of the file):

```typescript
// ── Platform API (Auth, Profile, Company) ───────────────────────────

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
}

export interface UserProfileDto {
  id: number
  companyId: number
  title: string
  userFirstName: string
  userLastName: string
  aboutUser: string
  addressDto: {
    id: number
    line1: string
    line2: string
    city: string
    state: string
    zip: string
    countryId: number
    countryStateId: number
    addressTypeId: number
  }
  isAllRecordAccessEnabled: boolean
  isAllTeamRecordAccessEnabled: boolean
}

export interface ProfileResponse {
  id: number
  username: string
  emailAddress: string
  mobilePhone: string
  rolesCount: number
  userProfileDto: UserProfileDto
  globalRoleId: number
  userStatusId: number
  userSubStatusId: number
  lastLoginDate: string
  userPreference: {
    id: number
    preferredLanguageId: number
    notificationPreferenceId: number
    timeZoneId: number
  }
}

export interface CompanyResponse {
  company: {
    id: number
    name: string
    addressId: number
    phone: string
    url: string
    companyStatusId: number
    preferredLanguageId: number
    defaultCurrencyId: number
    defaultTimeZoneId: number
    isCompanyUsingOneLanguage: boolean
  }
  companyAddress: {
    id: number
    line1: string
    line2: string
    city: string
    state: string
    zip: string
    countryId: number
    countryStateId: number
    addressTypeId: number
  }
}

export interface JwtPayload {
  sub: string
  id: number
  companyId: number
  role: number
  capabilities: string[]
  exp: number
  iat: number
  companyLanguage: string
  userLanguage: string
  userLanguageTag: string
  userTimezone: string
  impersonated: boolean
  isCompanyUsingOneLanguage: boolean
}
```

- [ ] **Step 2: Add Copilot-specific request/response types**

Add after the Platform API types:

```typescript
// ── Copilot API ─────────────────────────────────────────────────────

export interface CopilotRequest {
  message: string
  workflow?: string
  conversation_id?: string
  source_module?: 'engage' | 'deals' | 'plan' | 'insights' | 'portal'
  context?: Record<string, unknown>
  llm_config?: LLMConfig
}

export interface LLMConfig {
  provider: 'anthropic' | 'azure_openai' | 'openrouter'
  model: string
  temperature?: number
  max_tokens?: number
}

export interface CopilotTriggerResponse {
  run_id: string
  status: 'queued'
  workflow?: string
}

export interface CopilotOutput {
  answer: string
  sources: CopilotSource[]
  tools_called: CopilotToolCall[]
  iteration_count: number
}

export interface CopilotSource {
  type: string
  tool: string
  doc_id?: string
  excerpt?: string
  page_numbers?: number[]
  data?: Record<string, unknown>
}

export interface CopilotToolCall {
  tool: string
  args: Record<string, unknown>
  iteration: number
}

export interface CopilotRunResponse {
  id: string
  tenant_id: string
  user_id: string
  workflow: string
  status: RunStatus
  input: Record<string, unknown> | null
  output: CopilotOutput | null
  steps: RunStep[]
  llm_config: LLMConfig | null
  error: string | null
  triggered_by: string | null
  created_at: string | null
  started_at: string | null
  completed_at: string | null
  duration_ms: number | null
}

export interface LLMProvider {
  provider: string
  models: LLMModel[]
  default?: boolean
}

export interface LLMModel {
  id: string
  name: string
  vendor: string
  supports_tools?: boolean
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/api/types.ts
git commit -m "feat: add Platform API and Copilot API TypeScript types"
```

---

## Task 3: Platform API Client

**Files:**
- Create: `client/src/api/platform-api.ts`

- [ ] **Step 1: Create the Platform API client**

Create `client/src/api/platform-api.ts`:

```typescript
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
  // If a refresh is already in flight, reuse it
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

  // Proactively refresh if token is about to expire (within 60s)
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
    // Try refresh once
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd client && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `platform-api.ts`

- [ ] **Step 3: Commit**

```bash
git add client/src/api/platform-api.ts
git commit -m "feat: add Platform API client with login, refresh, profile, company"
```

---

## Task 4: Copilot API Client

**Files:**
- Create: `client/src/api/copilot-client.ts`

- [ ] **Step 1: Create the Copilot API client**

Create `client/src/api/copilot-client.ts`:

```typescript
import type {
  CopilotRequest,
  CopilotTriggerResponse,
  CopilotRunResponse,
  RunStatus,
  LLMProvider,
} from './types'
import { getAccessToken, refreshTokens, clearTokens } from './platform-api'

const TERMINAL_STATUSES: RunStatus[] = ['complete', 'failed', 'cancelled']
const COPILOT_URL = import.meta.env.VITE_COPILOT_API_URL || '/api'

class CopilotError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'CopilotError'
  }
}

async function copilotFetch<T>(path: string, options?: RequestInit): Promise<T> {
  let token = getAccessToken()

  const doFetch = async (authToken: string | null) => {
    const res = await fetch(`${COPILOT_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...options?.headers,
      },
    })
    return res
  }

  let res = await doFetch(token)

  // On 401, try refresh once
  if (res.status === 401) {
    try {
      await refreshTokens()
      token = getAccessToken()
      res = await doFetch(token)
    } catch {
      clearTokens()
      window.location.href = '/login'
      throw new CopilotError(401, 'Session expired')
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const detail = (body as { detail?: string }).detail
    throw new CopilotError(res.status, detail || `Request failed: ${res.status}`)
  }

  return res.json() as Promise<T>
}

/** Trigger a copilot run — returns run_id immediately */
export function sendCopilotMessage(
  request: CopilotRequest,
): Promise<CopilotTriggerResponse> {
  return copilotFetch<CopilotTriggerResponse>('/agents/run', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

/** Poll a run until it reaches a terminal status */
export async function pollCopilotRun(
  runId: string,
  onProgress?: (run: CopilotRunResponse) => void,
): Promise<CopilotRunResponse> {
  const MAX_ATTEMPTS = 20
  let delay = 1500

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, delay))

    const run = await copilotFetch<CopilotRunResponse>(`/runs/${runId}`)
    onProgress?.(run)

    if (TERMINAL_STATUSES.includes(run.status)) {
      return run
    }

    delay = Math.min(Math.round(delay * 1.3), 5000)
  }

  throw new CopilotError(408, 'Copilot request timed out')
}

/** Send a message and wait for the complete result */
export async function askCopilot(
  request: CopilotRequest,
  onProgress?: (run: CopilotRunResponse) => void,
): Promise<CopilotRunResponse> {
  const { run_id } = await sendCopilotMessage(request)
  return pollCopilotRun(run_id, onProgress)
}

/** Fetch available LLM providers and models */
export function getCopilotProviders(): Promise<LLMProvider[]> {
  return copilotFetch<LLMProvider[]>('/agents/llm-providers')
}

export { CopilotError }
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd client && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `copilot-client.ts`

- [ ] **Step 3: Commit**

```bash
git add client/src/api/copilot-client.ts
git commit -m "feat: add Copilot API client with send, poll, ask pattern"
```

---

## Task 5: Rewrite Auth Store

**Files:**
- Modify: `client/src/store/useAuthStore.ts` (full rewrite)

- [ ] **Step 1: Rewrite useAuthStore**

Replace the entire contents of `client/src/store/useAuthStore.ts`:

```typescript
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

// Default module roles — kept for the modules that are still mocked
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
    // Step 1: Authenticate
    const tokens = await platformLogin({ username, password })

    // Step 2: Decode JWT
    const jwt = decodeJwt(tokens.access_token)

    // Step 3: Fetch profile + company in parallel
    const [profile, companyRes] = await Promise.all([
      getProfile(),
      getCompany(jwt.companyId),
    ])

    // Step 4: Build user and company objects
    const company = buildCompany(companyRes)
    const user = buildUserFromJwtAndProfile(jwt, profile, company.name)

    // Step 5: Persist to localStorage
    localStorage.setItem('auth_user', JSON.stringify(user))
    localStorage.setItem('auth_company', JSON.stringify(company))

    // Step 6: Update store
    set({
      isAuthenticated: true,
      user,
      company,
      moduleRoles: DEFAULT_MODULE_ROLES,
    })

    // Step 7: Start refresh timer
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
    // Clear any existing timer
    get().stopRefreshTimer()

    // Check every 30 seconds if the token needs refreshing
    refreshTimerId = setInterval(async () => {
      const token = getAccessToken()
      if (!token) return

      // Refresh if token expires within 60 seconds
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd client && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `useAuthStore.ts`. There may be errors in other files that still import the old `User` type — that's expected and will be fixed in later tasks.

- [ ] **Step 3: Commit**

```bash
git add client/src/store/useAuthStore.ts
git commit -m "feat: rewrite auth store with real Platform API login, JWT decode, token refresh"
```

---

## Task 6: Update Login Page

**Files:**
- Modify: `client/src/pages/LoginPage.tsx`

- [ ] **Step 1: Update LoginPage for real API errors**

In `client/src/pages/LoginPage.tsx`, make the following changes:

1. Change the `email` state variable name to `username` for clarity:

Replace:
```typescript
const [email, setEmail] = useState('')
```
With:
```typescript
const [username, setUsername] = useState('')
```

2. Update `handleSubmit` to use `username`:

Replace:
```typescript
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter your credentials')
      return
    }
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch {
      setError('Invalid credentials')
    }
  }
```
With:
```typescript
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username || !password) {
      setError('Please enter your credentials')
      return
    }
    try {
      await login(username, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    }
  }
```

3. Update the input field to use `username`:

Replace:
```tsx
                <Input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  placeholder="Username"
                  className="h-10"
                />
```
With:
```tsx
                <Input
                  id="email"
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError('') }}
                  placeholder="Username"
                  className="h-10"
                />
```

- [ ] **Step 2: Verify the page renders**

Run: `cd client && pnpm dev` — navigate to http://localhost:5173/login in a browser. The login form should render with "Username" label and placeholder.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/LoginPage.tsx
git commit -m "feat: update LoginPage to use username field and real API error messages"
```

---

## Task 7: Update main.tsx (Remove VITE_USE_REAL_API check)

**Files:**
- Modify: `client/src/main.tsx`

- [ ] **Step 1: Simplify MSW initialization**

Replace the entire `enableMocking` function and its call in `client/src/main.tsx`:

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Show the logo while the app boots
const root = createRoot(document.getElementById('root')!)
root.render(
  <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background, #fff)' }}>
    <img src="/logo_black_clean.png" alt="" style={{ height: 56, width: 56, objectFit: 'contain', opacity: 0.6 }} className="animate-pulse" />
  </div>
)

async function enableMocking() {
  if (import.meta.env.PROD) return
  const { worker } = await import('./api/mock/browser')
  return worker.start({ onUnhandledRequest: 'bypass' })
}

enableMocking().then(() => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
```

The change: replace `VITE_USE_REAL_API === 'true'` with `import.meta.env.PROD`. MSW runs in dev mode (for deals/admin mocks), is skipped in production. Real API calls to `/platform-api/*` and `/api/*` pass through MSW untouched since no handler matches.

- [ ] **Step 2: Commit**

```bash
git add client/src/main.tsx
git commit -m "refactor: simplify MSW init — always run in dev, skip in prod"
```

---

## Task 8: Update API Client (401 refresh integration)

**Files:**
- Modify: `client/src/api/client.ts`

- [ ] **Step 1: Update client.ts to use new token key and refresh**

Replace the entire contents of `client/src/api/client.ts`:

```typescript
import { getAccessToken, refreshTokens, clearTokens } from './platform-api'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken()
  const res = await fetch(`${BASE_URL}${path}`, {
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
      const retryRes = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(newToken ? { Authorization: `Bearer ${newToken}` } : {}),
          ...options?.headers,
        },
      })
      if (!retryRes.ok) {
        const error = await retryRes.json().catch(() => ({ error: retryRes.statusText }))
        throw new Error((error as { error: string }).error || retryRes.statusText)
      }
      return retryRes.json() as Promise<T>
    } catch {
      clearTokens()
      window.location.href = '/login'
      throw new Error('Session expired')
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((error as { error: string }).error || res.statusText)
  }

  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
```

Key changes:
- Uses `getAccessToken()` from `platform-api.ts` instead of `localStorage.getItem('auth_token')`
- On 401, tries `refreshTokens()` then retries the request
- On refresh failure, clears tokens and redirects to login

- [ ] **Step 2: Commit**

```bash
git add client/src/api/client.ts
git commit -m "feat: integrate token refresh into API client on 401 responses"
```

---

## Task 9: Clean Up Endpoints

**Files:**
- Modify: `client/src/api/endpoints.ts`

- [ ] **Step 1: Remove agent/run endpoints that are now in copilot-client.ts**

Replace the contents of `client/src/api/endpoints.ts`:

```typescript
import { api } from './client'
import type { WorkflowDefinition, DailySummary, MeetingBrief } from './types'

export const agentsApi = {
  list: () => api.get<WorkflowDefinition[]>('/agents'),
}

export const summariesApi = {
  list: () => api.get<DailySummary[]>('/daily-summaries'),
}

export const meetingBriefsApi = {
  get: (meetingId: string) => api.get<MeetingBrief>(`/meeting-briefs/${meetingId}`),
}
```

Removed: `agentsApi.trigger`, `runsApi` (now handled by `copilot-client.ts`). The `agentsApi.list` stays because the agents listing page may still use it via MSW mocks.

- [ ] **Step 2: Check for broken imports of `runsApi`**

Run: `cd client && grep -r "runsApi" src/ --include="*.ts" --include="*.tsx" -l`

For each file found, update imports. The runs page components likely import `runsApi` — those pages can either keep using the MSW mock or be updated to use `copilot-client.ts`. For now, if files import `runsApi`, re-add it to endpoints.ts pointing to the same `/runs` paths (they'll be handled by MSW in dev or the Copilot API in prod).

If `runsApi` is used elsewhere, add it back:

```typescript
import type { AgentRunResponse, TriggerResponse, ResumeRequest } from './types'

export const runsApi = {
  get: (runId: string) => api.get<AgentRunResponse>(`/runs/${runId}`),
  list: (workflow?: string) => api.get<AgentRunResponse[]>(`/runs${workflow ? `?workflow=${workflow}` : ''}`),
  resume: (runId: string, data: ResumeRequest) => api.post<TriggerResponse>(`/runs/${runId}/resume`, data),
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/api/endpoints.ts
git commit -m "refactor: clean up endpoints — copilot-specific routes moved to copilot-client"
```

---

## Task 10: Rewrite Chat Store

**Files:**
- Modify: `client/src/store/useChatStore.ts` (full rewrite)

- [ ] **Step 1: Rewrite useChatStore with Copilot client**

Replace the entire contents of `client/src/store/useChatStore.ts`:

```typescript
import { create } from 'zustand'
import type {
  ChatMessage,
  ToolCallStep,
  CopilotRunResponse,
  LLMConfig,
} from '@/api/types'
import { askCopilot } from '@/api/copilot-client'

export interface ChatThread {
  id: string
  title: string
  messages: ChatMessage[]
  conversationId: string
  createdAt: string
}

interface ChatState {
  messages: ChatMessage[]
  activeThreadId: string | null
  conversationId: string
  history: ChatThread[]
  showHistory: boolean
  isOpen: boolean
  isLoading: boolean
  error: string | null

  toggle: () => void
  open: () => void
  close: () => void
  newChat: () => void
  loadThread: (threadId: string) => void
  deleteThread: (threadId: string) => void
  toggleHistory: () => void
  sendMessage: (content: string, llmConfig?: LLMConfig) => void
}

function deriveTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user')
  if (!firstUser) return 'New chat'
  const text = firstUser.content
  return text.length > 40 ? text.slice(0, 40) + '...' : text
}

function getSourceModule(): 'engage' | 'deals' | 'plan' | 'insights' | 'portal' {
  const path = window.location.pathname
  if (path.startsWith('/home/deals')) return 'deals'
  if (path.startsWith('/home/insights')) return 'insights'
  return 'engage'
}

function mapRunToToolCalls(run: CopilotRunResponse): ToolCallStep[] {
  if (!run.output?.tools_called) return []
  return run.output.tools_called.map((tc, idx) => ({
    id: `tc-${run.id}-${idx}`,
    toolName: tc.tool,
    description: `${tc.tool}(${Object.keys(tc.args).join(', ')})`,
    parameters: tc.args,
    status: 'complete' as const,
    result: JSON.stringify(tc.args),
  }))
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  activeThreadId: null,
  conversationId: crypto.randomUUID(),
  history: [],
  showHistory: false,
  isOpen: false,
  isLoading: false,
  error: null,

  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),

  newChat: () => {
    const { messages, activeThreadId, history, conversationId } = get()

    let updatedHistory = history
    if (messages.length > 0) {
      if (activeThreadId) {
        updatedHistory = history.map((t) =>
          t.id === activeThreadId
            ? { ...t, messages: [...messages], title: deriveTitle(messages) }
            : t
        )
      } else {
        const thread: ChatThread = {
          id: `thread-${Date.now()}`,
          title: deriveTitle(messages),
          messages: [...messages],
          conversationId,
          createdAt: new Date().toISOString(),
        }
        updatedHistory = [thread, ...history]
      }
    }

    set({
      messages: [],
      activeThreadId: null,
      conversationId: crypto.randomUUID(),
      history: updatedHistory,
      isLoading: false,
      error: null,
      showHistory: false,
    })
  },

  loadThread: (threadId: string) => {
    const { messages, activeThreadId, history, conversationId } = get()

    let updatedHistory = history
    if (messages.length > 0 && !activeThreadId) {
      const thread: ChatThread = {
        id: `thread-${Date.now()}`,
        title: deriveTitle(messages),
        messages: [...messages],
        conversationId,
        createdAt: new Date().toISOString(),
      }
      updatedHistory = [thread, ...history]
    } else if (messages.length > 0 && activeThreadId) {
      updatedHistory = history.map((t) =>
        t.id === activeThreadId
          ? { ...t, messages: [...messages], title: deriveTitle(messages) }
          : t
      )
    }

    const target = updatedHistory.find((t) => t.id === threadId)
    if (!target) return

    set({
      messages: [...target.messages],
      activeThreadId: threadId,
      conversationId: target.conversationId,
      history: updatedHistory,
      isLoading: false,
      error: null,
      showHistory: false,
    })
  },

  deleteThread: (threadId: string) => {
    set((s) => ({
      history: s.history.filter((t) => t.id !== threadId),
      ...(s.activeThreadId === threadId
        ? { messages: [], activeThreadId: null, conversationId: crypto.randomUUID() }
        : {}),
    }))
  },

  toggleHistory: () => set((s) => ({ showHistory: !s.showHistory })),

  sendMessage: async (content: string, llmConfig?: LLMConfig) => {
    const { conversationId } = get()

    // Add user message immediately
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }

    const assistantMsgId = `msg-${Date.now()}-resp`

    // Add user message and a placeholder assistant message with thinking
    set((s) => ({
      messages: [
        ...s.messages,
        userMsg,
        {
          id: assistantMsgId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          thinking: { content: 'Processing your request...' },
          toolCalls: [],
        },
      ],
      isLoading: true,
      error: null,
    }))

    try {
      const run = await askCopilot(
        {
          message: content,
          workflow: 'copilot',
          conversation_id: conversationId,
          source_module: getSourceModule(),
          llm_config: llmConfig,
        },
        // onProgress: update tool calls and status during polling
        (progressRun) => {
          if (progressRun.status === 'running' && progressRun.steps.length > 0) {
            const toolCalls: ToolCallStep[] = progressRun.steps.map((step, idx) => ({
              id: `tc-${progressRun.id}-${idx}`,
              toolName: step.node,
              description: step.result_summary || step.node,
              status: step.status === 'complete' ? 'complete' as const : 'running' as const,
            }))
            set((s) => ({
              messages: s.messages.map((m) =>
                m.id === assistantMsgId ? { ...m, toolCalls } : m
              ),
            }))
          }
        },
      )

      if (run.status === 'complete' && run.output) {
        const toolCalls = mapRunToToolCalls(run)
        set((s) => {
          const updatedMessages = s.messages.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: run.output!.answer, toolCalls, thinking: undefined }
              : m
          )
          // Auto-save to history
          let updatedHistory = s.history
          if (s.activeThreadId) {
            updatedHistory = s.history.map((t) =>
              t.id === s.activeThreadId
                ? { ...t, messages: [...updatedMessages], title: deriveTitle(updatedMessages) }
                : t
            )
          } else {
            const newThreadId = `thread-${Date.now()}`
            const thread: ChatThread = {
              id: newThreadId,
              title: deriveTitle(updatedMessages),
              messages: [...updatedMessages],
              conversationId: s.conversationId,
              createdAt: new Date().toISOString(),
            }
            updatedHistory = [thread, ...s.history]
            return {
              messages: updatedMessages,
              isLoading: false,
              error: null,
              history: updatedHistory,
              activeThreadId: newThreadId,
            }
          }
          return { messages: updatedMessages, isLoading: false, error: null, history: updatedHistory }
        })
      } else {
        const errorMsg = run.error?.includes('disallowed')
          ? 'Your message was flagged. Please rephrase.'
          : run.error || 'Something went wrong. Please try again.'
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: `Sorry: ${errorMsg}`, thinking: undefined }
              : m
          ),
          isLoading: false,
          error: errorMsg,
        }))
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred'
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: `Sorry, I encountered an error: ${errorMsg}`, thinking: undefined }
            : m
        ),
        isLoading: false,
        error: errorMsg,
      }))
    }
  },
}))
```

Key changes:
- Removed all imports of `callAnthropic`, `callAzureOpenAI`, `callOpenRouter`, `buildSystemPrompt`, `getSimulatedToolCalls`, `needsWebSearch`, `searchTavily`, `formatTavilyResults`
- Removed `context`, `contextData`, `setContext`, `getSuggestions`, `clearTimers` — context is now just `source_module` derived from the URL
- Removed all setTimeout-based animation phases
- Added `conversationId` per thread
- `sendMessage` now takes `LLMConfig` instead of a model string
- Uses `askCopilot()` with `onProgress` for real-time step updates

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd client && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: May show errors from files that use removed exports (`getSuggestions`, `setContext`, `clearTimers`, `context`). Note these for the next tasks.

- [ ] **Step 3: Commit**

```bash
git add client/src/store/useChatStore.ts
git commit -m "feat: rewrite chat store to use Copilot API trigger+poll pattern"
```

---

## Task 11: Update ChatInput (Model Selector → LLMConfig)

**Files:**
- Modify: `client/src/components/chat/ChatInput.tsx`

- [ ] **Step 1: Update model list and onSend signature**

Replace the entire contents of `client/src/components/chat/ChatInput.tsx`:

```typescript
import { useState, useRef, useEffect } from 'react'
import { Send, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { LLMConfig } from '@/api/types'

interface ModelOption {
  id: string
  label: string
  provider: string
  llmConfig: LLMConfig
}

const COPILOT_MODELS: { group: string; models: ModelOption[] }[] = [
  { group: 'Anthropic', models: [
    { id: 'claude-haiku', label: 'Claude 4.5 Haiku', provider: 'Anthropic', llmConfig: { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' } },
    { id: 'claude-sonnet', label: 'Claude Sonnet 4.6', provider: 'Anthropic', llmConfig: { provider: 'anthropic', model: 'claude-sonnet-4-6' } },
    { id: 'claude-opus', label: 'Claude Opus 4.6', provider: 'Anthropic', llmConfig: { provider: 'anthropic', model: 'claude-opus-4-6' } },
  ]},
  { group: 'Azure OpenAI', models: [
    { id: 'gpt4o', label: 'GPT-4o', provider: 'Azure OpenAI', llmConfig: { provider: 'azure_openai', model: 'inv-aii-gpt40-useast2-dev' } },
    { id: 'gpt5', label: 'GPT-5 Chat', provider: 'Azure OpenAI', llmConfig: { provider: 'azure_openai', model: 'inv-aii-gpt5chat-useast2-dev' } },
  ]},
  { group: 'Open Source (OpenRouter)', models: [
    { id: 'deepseek', label: 'DeepSeek V3.2', provider: 'DeepSeek', llmConfig: { provider: 'openrouter', model: 'deepseek/deepseek-v3.2' } },
    { id: 'kimi', label: 'Kimi K2.5', provider: 'Moonshot', llmConfig: { provider: 'openrouter', model: 'moonshotai/kimi-k2.5' } },
  ]},
]

const ALL_MODELS = COPILOT_MODELS.flatMap((g) => g.models)

interface ChatInputProps {
  onSend: (message: string, llmConfig?: LLMConfig) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const [selectedModelId, setSelectedModelId] = useState('claude-haiku')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const currentModel = ALL_MODELS.find((m) => m.id === selectedModelId)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [value])

  function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed, currentModel?.llmConfig)
    setValue('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t border-border">
      {/* Model selector */}
      <div className="px-3 pt-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-accent cursor-pointer">
            <span className="font-medium">{currentModel?.label}</span>
            <span className="text-muted-foreground/60">· {currentModel?.provider}</span>
            <ChevronDown className="h-3 w-3 ml-0.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {COPILOT_MODELS.map((group, gi) => (
              <div key={group.group}>
                {gi > 0 && <DropdownMenuSeparator />}
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {group.group}
                  </DropdownMenuLabel>
                  {group.models.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => setSelectedModelId(model.id)}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">{model.label}</span>
                      <span className="text-[10px] text-muted-foreground">{model.provider}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Input row */}
      <div className="flex items-end gap-2 p-3 pt-1.5">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the AI copilot..."
          disabled={disabled}
          className="min-h-[36px] max-h-[120px] resize-none text-sm"
          rows={1}
        />
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          className="h-9 w-9 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
```

Key changes:
- `onSend` now takes `LLMConfig` instead of a model string
- Model options carry a `llmConfig` object with `{ provider, model }`
- Removed the `azure:` and `openrouter:` prefixes — the backend model IDs are used directly
- Removed Gemma 4 model (not in the integration doc's model list)

- [ ] **Step 2: Commit**

```bash
git add client/src/components/chat/ChatInput.tsx
git commit -m "feat: update ChatInput model selector to emit LLMConfig objects"
```

---

## Task 12: Update ChatPanel (Wire Up New sendMessage Signature)

**Files:**
- Modify: `client/src/components/chat/ChatPanel.tsx`

- [ ] **Step 1: Update ChatPanel to pass LLMConfig**

In `client/src/components/chat/ChatPanel.tsx`, the `ChatInput` `onSend` prop currently passes `sendMessage` directly. Since `sendMessage` now accepts `(content: string, llmConfig?: LLMConfig)` and `ChatInput.onSend` emits `(message: string, llmConfig?: LLMConfig)`, the signatures already match. No code change needed here for the wiring.

However, remove the loading check that references the old simulated thinking pattern. In `ChatPanel.tsx` line 143, replace:

```tsx
              {isLoading && !messages.some((m) => m.thinking && !m.content) && (
```

With:

```tsx
              {isLoading && messages.length > 0 && !messages.some((m) => m.role === 'assistant' && !m.content && m.thinking) && (
```

This is a minor refinement — the existing check is nearly identical. If the current code works, this step can be skipped.

- [ ] **Step 2: Commit (if changes were made)**

```bash
git add client/src/components/chat/ChatPanel.tsx
git commit -m "refactor: minor ChatPanel loading indicator cleanup"
```

---

## Task 13: Add Source Citations to ChatMessage

**Files:**
- Modify: `client/src/components/chat/ChatMessage.tsx`

- [ ] **Step 1: Add source citation rendering**

In `client/src/components/chat/ChatMessage.tsx`, add a `SourceCitation` component after the `ToolCallRow` component (after line 68):

```typescript
function SourceCitation({ sources }: { sources: CopilotSource[] }) {
  if (sources.length === 0) return null

  return (
    <div className="border-t border-border/30 mt-2 pt-2">
      <p className="text-[10px] font-medium text-muted-foreground mb-1">Sources</p>
      <div className="space-y-1">
        {sources.map((source, idx) => (
          <div key={idx} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
            <span className="shrink-0">
              {source.type === 'document' ? '📄' : source.type === 'crm' ? '📊' : source.type === 'web' ? '🌐' : '🔧'}
            </span>
            <span>
              {source.type === 'document' && source.doc_id
                ? `${source.doc_id}${source.page_numbers?.length ? ` — p.${source.page_numbers.join(', ')}` : ''}${source.excerpt ? ` — "${source.excerpt}"` : ''}`
                : source.type === 'crm'
                  ? `${source.tool}${source.data ? ` — ${JSON.stringify(source.data)}` : ''}`
                  : source.tool
              }
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

Add the import at the top of the file:

```typescript
import type { ChatMessage as ChatMessageType, ToolCallStep, CopilotSource } from '@/api/types'
```

Then in the `ChatMessage` component, add source rendering after the main content block (after the `{hasContent && (` section, before the timestamp):

```tsx
        {/* Source citations */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <SourceCitation sources={message.sources} />
        )}
```

- [ ] **Step 2: Add `sources` to ChatMessage type**

In `client/src/api/types.ts`, update the `ChatMessage` interface to include sources:

```typescript
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  thinking?: ThinkingBlock
  toolCalls?: ToolCallStep[]
  sources?: CopilotSource[]
}
```

- [ ] **Step 3: Update useChatStore to include sources**

In `client/src/store/useChatStore.ts`, in the `sendMessage` function where we handle `run.status === 'complete'`, update the message mapping to include sources:

Find this line inside the `sendMessage` completion handler:
```typescript
              ? { ...m, content: run.output!.answer, toolCalls, thinking: undefined }
```

Replace with:
```typescript
              ? { ...m, content: run.output!.answer, toolCalls, sources: run.output!.sources, thinking: undefined }
```

Also add the import:
```typescript
import type {
  ChatMessage,
  ToolCallStep,
  CopilotRunResponse,
  LLMConfig,
  CopilotSource,
} from '@/api/types'
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/chat/ChatMessage.tsx client/src/api/types.ts client/src/store/useChatStore.ts
git commit -m "feat: add source citation rendering to ChatMessage from Copilot output"
```

---

## Task 14: Fix Remaining Broken Imports

**Files:**
- Various files that import removed exports

- [ ] **Step 1: Find all broken references**

Run: `cd client && npx tsc --noEmit --pretty 2>&1 | grep "error TS"` to find all compile errors.

Common expected breakages:
- Files importing `getSuggestions`, `setContext`, `clearTimers`, `context` from `useChatStore`
- Files importing from deleted files (`anthropic.ts`, `azure-openai.ts`, `openrouter.ts`, `tavily.ts`, `knowledge-base.ts`, `tool-call-simulation.ts`)
- Files importing the old `User` type from `useAuthStore` (the interface changed from `id: string` to `id: number`, etc.)

- [ ] **Step 2: Fix each broken import**

For each broken file:

1. **Files using `getSuggestions` / `setContext` / `clearTimers`**: These were used for context-specific suggestions (daily summary, meeting brief). Remove the usage — the chat now works without pre-set context. If a component sets chat context, remove that call. The suggestions feature can be re-added later if needed.

2. **Files importing deleted modules**: Remove the import. If the file only existed to use those modules, the file itself may need updating.

3. **Files using old `User` shape**: Update to use the new `User` export from `useAuthStore`. The `id` is now `number`, and there are new fields. Most consumers just use `user.name`, `user.initials`, `user.email` which still exist.

- [ ] **Step 3: Verify clean compile**

Run: `cd client && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix: resolve all broken imports from auth and chat store rewrites"
```

---

## Task 15: Delete Old LLM Provider Files

**Files:**
- Delete: `client/src/api/anthropic.ts`
- Delete: `client/src/api/azure-openai.ts`
- Delete: `client/src/api/openrouter.ts`
- Delete: `client/src/api/tavily.ts`
- Delete: `client/src/api/knowledge-base.ts`
- Delete: `client/src/api/tool-call-simulation.ts`

- [ ] **Step 1: Delete the files**

```bash
cd client
rm src/api/anthropic.ts
rm src/api/azure-openai.ts
rm src/api/openrouter.ts
rm src/api/tavily.ts
rm src/api/knowledge-base.ts
rm src/api/tool-call-simulation.ts
```

- [ ] **Step 2: Verify no remaining imports**

Run: `cd client && grep -r "from.*\(anthropic\|azure-openai\|openrouter\|tavily\|knowledge-base\|tool-call-simulation\)" src/ --include="*.ts" --include="*.tsx"`
Expected: No matches (all imports should have been fixed in Task 14)

- [ ] **Step 3: Verify clean compile**

Run: `cd client && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete deprecated LLM provider files — all calls go through Copilot API"
```

---

## Task 16: Verify Build and Dev Server

**Files:** None (verification only)

- [ ] **Step 1: Run TypeScript check**

Run: `cd client && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 2: Run ESLint**

Run: `cd client && pnpm lint`
Expected: No new errors (existing warnings are OK)

- [ ] **Step 3: Run production build**

Run: `cd client && pnpm build`
Expected: Build succeeds

- [ ] **Step 4: Start dev server and test login**

Run: `cd client && pnpm dev`

1. Open http://localhost:5173/login
2. Enter username `saqib@pinnacle.sa` and password
3. Verify login succeeds (redirects to home, user name shows in UI)
4. Open browser DevTools Network tab — verify calls to `/platform-api/auth/login`, `/platform-api/profile`, `/platform-api/companies/4`

- [ ] **Step 5: Test Copilot chat**

1. Open the chat panel (floating button or sidebar)
2. Send a message like "How many clients do we have?"
3. Verify the request goes to `/api/agents/run` (Copilot API)
4. If Copilot backend is not running, verify a clear error message appears (not a crash)

- [ ] **Step 6: Test token refresh**

1. Log in successfully
2. Wait for access token to near expiry (or manually shorten the timer in code)
3. Verify refresh call to `/platform-api/auth/refresh` in Network tab

- [ ] **Step 7: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address build and runtime issues from integration"
```
