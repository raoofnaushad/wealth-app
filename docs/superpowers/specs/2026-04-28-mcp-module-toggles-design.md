# MCP Module Toggles — Design Spec

**Date:** 2026-04-28  
**Status:** Approved

## Context

The copilot backend uses strict opt-in for MCP tool servers: omitting `enabled_mcps` (or sending `[]`) means the agent has no MCP tools and cannot query CRM, planning, or portfolio data. The frontend was never sending this field, so all copilot runs were silently operating without any MCP access. This design fixes that gap and gives users visible control over which modules the agent can call.

Active modules: `engage` (21 tools), `plan` (14 tools), `insights` (9 tools). Stub modules `deals` and `client-portal` are dropped by the backend even if sent.

---

## Data Layer

### 1. `client/src/api/types.ts`

Add `enabled_mcps` to `CopilotRequest`:

```ts
export interface CopilotRequest {
  message: string
  workflow?: string
  conversation_id?: string
  source_module?: 'engage' | 'deals' | 'plan' | 'insights' | 'portal'
  context?: Record<string, unknown>
  llm_config?: LLMConfig
  enabled_mcps?: string[]   // ← add this
}
```

### 2. `client/src/store/useChatStore.ts`

Add to state:
```ts
enabledMcps: string[]   // default: ['engage', 'plan', 'insights']
```

Add to actions:
```ts
setEnabledMcps: (mcps: string[]) => void
```

Update `sendMessage` to:
- Pass `enabled_mcps: enabledMcps` in the `CopilotRequest`
- Derive `source_module` as: if `enabledMcps.length === 1`, use that single module name; otherwise use `getSourceModule()` (URL-derived)

### 3. `client/src/api/copilot-client.ts`

No changes needed — `enabled_mcps` passes through as part of the request object.

---

## UI Layer

### `client/src/components/chat/ChatInput.tsx`

**New props:**
```ts
enabledMcps: string[]
onMcpsChange: (mcps: string[]) => void
```

**New pill row** — rendered above the existing model-selector + send-button row:

- 3 pills: `Engage`, `Plan`, `Insights`
- Each pill: colored dot + label
  - Engage → blue
  - Plan → violet  
  - Insights → emerald
- Active state: filled/colored background
- Inactive state: ghost/muted (border only, muted text)

**Interaction rules:**
- Click active pill → deactivate it, unless it's the last active one (minimum 1 must remain active)
- Click inactive pill → activate it
- No save step — changes take effect on the next message sent

**`client/src/components/chat/ChatPanel.tsx`** — thread `enabledMcps` and `setEnabledMcps` from `useChatStore` down to `ChatInput`.

---

## Verification

1. Start dev server (`pnpm dev` in `client/`)
2. Open chat panel
3. Confirm all 3 pills are active by default
4. Send a message — inspect network request body in DevTools → should contain `enabled_mcps: ["engage", "plan", "insights"]`
5. Deactivate Plan and Insights, leave only Engage active → send a message → request should show `enabled_mcps: ["engage"]` and `source_module: "engage"`
6. Activate all 3 → `source_module` should revert to URL-derived value
7. Confirm last pill cannot be deactivated (click it — it stays on)
