# Real Backend Auth & Copilot Integration Design

**Date:** 2026-04-17
**Status:** Approved
**Branch:** `raoof-feat/integrating-core-copilot`

---

## Overview

Replace the frontend's mock authentication and direct-LLM browser chat with real backend integrations:

1. **Authentication** — Login via the Platform API at `staging.asbitech.ai/esb/`, store JWT tokens, auto-refresh, fetch user profile and company details.
2. **Copilot** — Replace direct Anthropic/Azure/OpenRouter browser calls with the async trigger + poll pattern against the Copilot API backend.
3. **Cleanup** — Remove client-side LLM provider files, API keys from env, simulated tool calls, and local knowledge base.

Everything else (deals, admin, daily summaries, meeting briefs) remains mocked via MSW.

---

## Two Backend Services

| Service | Purpose | Base URL Env Var | Current State |
|---------|---------|-----------------|---------------|
| **Platform API** | Auth, profile, company | `VITE_PLATFORM_API_URL` | Live at `https://staging.asbitech.ai/esb/api/v1` |
| **Copilot API** | Agent runs, polling, LLM providers | `VITE_COPILOT_API_URL` | Local dev (`http://localhost:8000`) |

Both share the same JWT — the access token from Platform API login is forwarded to the Copilot API as-is.

---

## Environment Variables

### New `.env.example`

```
VITE_PLATFORM_API_URL=https://staging.asbitech.ai/esb/api/v1
VITE_COPILOT_API_URL=http://localhost:8000
```

### Removed

```
VITE_ANTHROPIC_API_KEY        # No longer needed — LLM calls go through Copilot backend
VITE_TAVILY_API_KEY           # Web search handled by Copilot backend
VITE_AZURE_OPENAI_ENDPOINT    # Proxied through Copilot backend
VITE_AZURE_OPENAI_API_KEY     # Proxied through Copilot backend
VITE_AZURE_OPENAI_API_VERSION # Proxied through Copilot backend
VITE_OPENROUTER_API_KEY       # Proxied through Copilot backend
VITE_USE_REAL_API             # No longer needed — auth is always real
VITE_USE_MOCK_API             # No longer needed — MSW handles non-auth routes automatically
```

---

## Section 1: Authentication Layer

### Login Flow

1. User enters `username` + `password` on login page
2. `POST {PLATFORM_API_URL}/auth/login` with body `{ "username": "...", "password": "..." }`
3. Response (200): `{ "access_token": "...", "refresh_token": "..." }` (flat, no wrapper)
4. Store both tokens in localStorage
5. Decode JWT to extract `id`, `companyId`, `sub` (email), `role`, `capabilities`
6. Fetch `GET {PLATFORM_API_URL}/profile` with the access token
7. Fetch `GET {PLATFORM_API_URL}/companies/{companyId}` with the access token
8. Populate `useAuthStore` with user + company data
9. Navigate to `/home`

### JWT Claims (access_token)

| Claim | Type | Example | Usage |
|-------|------|---------|-------|
| `sub` | string | `"saqib@pinnacle.sa"` | Username/email |
| `id` | number | `185` | User ID |
| `companyId` | number | `4` | Tenant scoping |
| `role` | number | `2` | Global role ID |
| `capabilities` | string[] | `["VIEW_CLIENTS", ...]` | Permission checks |
| `exp` | number | (unix timestamp) | Token expiry (~30 min) |
| `iat` | number | (unix timestamp) | Token issued at |
| `companyLanguage` | string | `"en"` | Company locale |
| `userLanguage` | string | `"en"` | User locale |
| `userLanguageTag` | string | `"en-US"` | BCP 47 tag |
| `userTimezone` | string | `"Asia/Muscat"` | User timezone |
| `impersonated` | boolean | `false` | Impersonation flag |
| `isCompanyUsingOneLanguage` | boolean | `false` | Single-language flag |

### Refresh Token Claims

| Claim | Type | Usage |
|-------|------|-------|
| `sub` | string | Username |
| `exp` | number | Expiry (~1 hour from login) |
| `impersonated` | boolean | Impersonation flag |
| `token` | string | Refresh token UUID |

### Token Refresh

- **Proactive**: A timer checks token expiry every 30 seconds. If the access token expires within 60 seconds, call `POST {PLATFORM_API_URL}/auth/refresh` with the refresh token.
- **Reactive**: If any API call returns 401, attempt one refresh. If refresh fails, logout.
- **Concurrency**: If multiple requests fail with 401 simultaneously, only one refresh is triggered. Other requests queue and retry after the refresh completes.
- **Refresh request**: `POST {PLATFORM_API_URL}/auth/refresh` — sends the refresh token as a Bearer token in the Authorization header (the access token may be expired at this point, so the refresh token authenticates the request).
- **Refresh response**: `{ "access_token": "...", "refresh_token": "..." }` — both tokens are replaced.

### Updated User Interface

```typescript
interface User {
  id: number                    // JWT "id" (185)
  username: string              // JWT "sub" ("saqib@pinnacle.sa")
  email: string                 // profile "emailAddress"
  firstName: string             // profile "userFirstName" ("Muhammad")
  lastName: string              // profile "userLastName" ("Saqib")
  name: string                  // derived: "Muhammad Saqib"
  initials: string              // derived: "MS"
  companyId: number             // JWT "companyId" (4)
  companyName: string           // company endpoint "name" ("SNB Capital")
  role: number                  // JWT "role" (2)
  capabilities: string[]        // JWT "capabilities"
  globalRoleId: number          // profile "globalRoleId" (2)
  timezone: string              // JWT "userTimezone" ("Asia/Muscat")
  language: string              // JWT "userLanguage" ("en")
}

interface Company {
  id: number                    // 4
  name: string                  // "SNB Capital"
  phone: string                 // "+971 50 717 4738"
  defaultCurrencyId: number     // 140
  defaultTimeZoneId: number     // 60
  preferredLanguageId: number   // 41
}
```

### localStorage Keys

```
access_token      — JWT access token string
refresh_token     — JWT refresh token string
auth_user         — JSON serialized User object
auth_company      — JSON serialized Company object
```

### Logout

Clear all four localStorage keys, reset `useAuthStore`, navigate to `/login`.

---

## Section 2: Copilot Integration

### Replace Direct LLM Calls

**Current**: `useChatStore.sendMessage()` → simulates tool calls → calls Anthropic/Azure/OpenRouter directly from browser → renders response.

**New**: `useChatStore.sendMessage()` → `POST /agents/run` (Copilot API) → poll `GET /runs/{run_id}` → render `output.answer` + `output.sources`.

### Copilot API Client

New file `src/api/copilot-client.ts`:

```typescript
class CopilotClient {
  constructor(baseUrl: string, getToken: () => string | null) {}

  async send(request: CopilotRequest): Promise<TriggerResponse>
  // POST {baseUrl}/agents/run

  async poll(runId: string, onProgress?: (run: RunResponse) => void): Promise<RunResponse>
  // GET {baseUrl}/runs/{runId} with exponential backoff

  async ask(request: CopilotRequest, onProgress?: (run: RunResponse) => void): Promise<RunResponse>
  // send() + poll() combined

  async getProviders(): Promise<LLMProvider[]>
  // GET {baseUrl}/agents/llm-providers
}
```

### CopilotRequest Shape

```typescript
interface CopilotRequest {
  message: string
  workflow?: string                // default: "copilot"
  conversation_id?: string        // for multi-turn
  source_module?: "engage" | "deals" | "plan" | "insights" | "portal"
  context?: Record<string, unknown>
  llm_config?: {
    provider: "anthropic" | "azure_openai" | "openrouter"
    model: string
    temperature?: number
    max_tokens?: number
  }
}
```

### Polling Strategy

| Poll # | Delay | Rationale |
|--------|-------|-----------|
| 1 | 1.5s | Most simple queries complete in 2-4s |
| 2 | 2s | |
| 3 | 3s | |
| 4+ | 4s | Complex multi-tool queries may take 10-15s |
| 15+ | 5s | Timeout after ~60s total |

Max 20 attempts. Backoff factor: `delay * 1.3`, capped at 5s.

Terminal states (stop polling): `complete`, `failed`, `cancelled`.

### Chat Store Rewrite

**`useChatStore` keeps:**
- `messages: ChatMessage[]`
- `activeThreadId: string | null`
- `history: ChatThread[]`
- `isOpen: boolean`
- `showHistory: boolean`
- `isLoading: boolean`
- `error: string | null`
- `conversationId: string` — new, generated per chat session
- `newChat()`, `loadThread()`, `deleteThread()`
- `toggle()`, `setShowHistory()`

**`useChatStore` removes:**
- `callLLM()` with provider routing
- `needsWebSearch()` + Tavily integration
- `buildSystemPrompt()` + knowledge base loading
- Simulated tool call generation (`getSimulatedToolCalls`)
- Phase-by-phase animation delays (600ms thinking, 400ms tool calls)
- `context` / `contextData` (replaced by `source_module` in the Copilot request)

**New `sendMessage()` behavior:**
1. Add user message to `messages` immediately
2. Set `isLoading = true`, clear `error`
3. `copilotClient.send({ message, workflow: "copilot", conversation_id, source_module, llm_config })`
4. Poll via `copilotClient.poll(run_id, onProgress)`:
   - `onProgress` callback updates a "thinking" / "running tools" indicator based on `run.status` and `run.steps`
5. On `complete`: add assistant message with `output.answer`, `output.sources`, `output.tools_called`
6. On `failed`: set `error` from `run.error`
7. Set `isLoading = false`
8. Auto-save thread to history

### Conversation Management

- `newChat()`: save current thread → clear messages → generate new `conversationId` via `crypto.randomUUID()`
- `loadThread()`: restore messages from history, restore `conversationId`
- Each thread in history stores its `conversationId` for resuming multi-turn

### Model Selector

The existing `ChatInput` dropdown stays. Model selection maps to `llm_config`:

| Display Name | `provider` | `model` |
|-------------|-----------|---------|
| Claude 4.5 Haiku | `anthropic` | `claude-haiku-4-5-20251001` |
| Claude Sonnet 4.6 | `anthropic` | `claude-sonnet-4-6` |
| Claude Opus 4.6 | `anthropic` | `claude-opus-4-6` |
| GPT-4o | `azure_openai` | `inv-aii-gpt40-useast2-dev` |
| GPT-5 Chat | `azure_openai` | `inv-aii-gpt5chat-useast2-dev` |
| DeepSeek V3.2 | `openrouter` | `deepseek/deepseek-v3.2` |
| Kimi K2.5 | `openrouter` | `moonshotai/kimi-k2.5` |

Optionally, the model list can be fetched dynamically from `GET /agents/llm-providers` instead of hardcoding.

### Source Module Mapping

Pass `source_module` based on the current route:

| Route Pattern | `source_module` |
|--------------|----------------|
| `/deals/*` | `"deals"` |
| `/home`, `/dashboard` | `"engage"` |
| `/insights/*` | `"insights"` |
| Default | `"engage"` |

### Tool Call & Source Display

The existing `ChatMessage` component already renders tool calls and can render sources. Changes:
- Tool calls come from `output.tools_called` (real data) instead of `getSimulatedToolCalls`
- Sources come from `output.sources` — render by type: document (excerpt + page), CRM (widget data), web (URL)
- Steps come from `run.steps` during polling for real-time progress

---

## Section 3: Error Handling

### Auth Errors

| Scenario | Behavior |
|----------|----------|
| Login 401 | Show "Invalid credentials" on login form |
| Login network error | Show "Unable to connect to server" |
| Token refresh 401 | Logout, redirect to `/login` |
| Token refresh network error | Logout, redirect to `/login` |

### Copilot HTTP Errors

| Status | Cause | Behavior |
|--------|-------|----------|
| 400 | Invalid `llm_config` | Show `response.detail` |
| 401 | Expired token | Refresh token, retry once. If fails, redirect to login |
| 404 | Unknown workflow/run | "Copilot service not available" |
| 422 | Validation error | Show `response.detail` |
| 500 | Server error | Retry once, then "Something went wrong" |

### Copilot Run Errors

| Scenario | Behavior |
|----------|----------|
| `status === "failed"`, error contains `"disallowed"` | "Your message was flagged. Please rephrase." |
| `status === "failed"`, other error | "Something went wrong. Please try again." |
| Poll timeout (20 attempts, ~60s) | "Request timed out. Please try again." |

---

## Section 4: MSW & Mock Data

### Remove Mock Handlers For

- Auth login / refresh (real Platform API)
- Chat / copilot endpoints (real Copilot API)

### Keep Mock Handlers For

- Deals module (mandates, opportunities, asset managers, news, email)
- Admin module (users, roles, company config, branding)
- Daily summaries
- Meeting briefs
- Agent listing page (optional — could also hit Copilot API)
- Run listing/detail (optional — could also hit Copilot API)

### MSW Bypass

MSW already runs with `onUnhandledRequest: 'bypass'`. Requests to `staging.asbitech.ai` and the Copilot API URL will pass through untouched since no MSW handler matches them. No config change needed — just remove the handlers.

The `VITE_USE_REAL_API` / `VITE_USE_MOCK_API` flags are removed.

---

## Section 5: Files Changed

### New Files

| File | Purpose |
|------|---------|
| `src/api/platform-api.ts` | Platform API client: login, refresh, profile, company |
| `src/api/copilot-client.ts` | Copilot API client: send, poll, ask, getProviders |
| `.env.example` | New env template with `VITE_PLATFORM_API_URL` + `VITE_COPILOT_API_URL` |

### Modified Files

| File | Changes |
|------|---------|
| `src/store/useAuthStore.ts` | Rewrite: real login, JWT decode, profile/company fetch, token refresh, updated User/Company types |
| `src/store/useChatStore.ts` | Rewrite: remove direct LLM calls, use CopilotClient, add conversationId, simplify sendMessage |
| `src/api/types.ts` | Update types: CopilotRequest, RunResponse, CopilotOutput, Source, add User/Company API response types |
| `src/api/client.ts` | Keep as-is for mock endpoints; ensure it reads access_token from localStorage |
| `src/api/endpoints.ts` | Remove old agent/run endpoints (now in copilot-client.ts), keep deals/admin/summary endpoints |
| `src/components/chat/ChatPanel.tsx` | Minor: remove simulated thinking/tool-call animation logic, use real run steps |
| `src/components/chat/ChatInput.tsx` | Minor: model selector maps to llm_config object instead of string prefix |
| `src/components/chat/ChatMessage.tsx` | Minor: render real sources from CopilotOutput |
| `src/pages/LoginPage.tsx` | Update: field label to "Username", error handling for real API responses |
| `src/main.tsx` | Remove `VITE_USE_REAL_API` conditional; MSW always starts (bypass handles real API calls) |
| `src/api/mock/handlers.ts` | Remove auth mock handlers |
| `.env.development` | Replace LLM API keys with `VITE_PLATFORM_API_URL` + `VITE_COPILOT_API_URL` |

### Deleted Files

| File | Reason |
|------|--------|
| `src/api/anthropic.ts` | Direct browser LLM calls removed |
| `src/api/azure-openai.ts` | Direct browser LLM calls removed |
| `src/api/openrouter.ts` | Direct browser LLM calls removed |
| `src/api/tavily.ts` | Web search handled by Copilot backend |
| `src/api/knowledge-base.ts` | Knowledge base handled by Copilot backend (RAG) |
| `src/api/tool-call-simulation.ts` | Real tool calls from Copilot backend |

---

## Section 6: API Client Architecture

```
localStorage
  ├── access_token      (JWT from Platform API)
  ├── refresh_token     (JWT from Platform API)
  ├── auth_user         (serialized User)
  └── auth_company      (serialized Company)

platformApi (src/api/platform-api.ts)
  ├── login(username, password) → { access_token, refresh_token }
  ├── refresh(refreshToken) → { access_token, refresh_token }
  ├── getProfile() → UserProfileResponse
  └── getCompany(companyId) → CompanyResponse

copilotClient (src/api/copilot-client.ts)
  ├── send(request) → { run_id, status, workflow }
  ├── poll(runId, onProgress?) → RunResponse
  ├── ask(request, onProgress?) → RunResponse
  └── getProviders() → LLMProvider[]

apiClient (src/api/client.ts)  [unchanged]
  └── get/post/put/delete for mock endpoints (deals, admin, etc.)

All three clients read access_token from localStorage.
Token refresh logic lives in platform-api.ts and updates localStorage.
```

### Token Refresh Concurrency

```
Request fails with 401
  ↓
Is a refresh already in progress?
  ├── Yes → queue this request, wait for refresh result, retry
  └── No → start refresh
         ↓
     POST /auth/refresh with refresh_token
       ├── 200 → store new tokens, retry original + all queued
       └── fail → logout, redirect to /login
```
