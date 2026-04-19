# Frontend Copilot Integration Guide

> **Audience:** Frontend engineers integrating the Invictus AI Copilot into the web application.
>
> **Backend status:** All endpoints are built and working. This guide covers everything needed to integrate from the frontend.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [TypeScript Interfaces](#typescript-interfaces)
- [Integration Flow](#integration-flow)
- [Multi-Turn Conversations](#multi-turn-conversations)
- [Polling Strategy](#polling-strategy)
- [Rendering Source Citations](#rendering-source-citations)
- [LLM Provider Selection (Optional)](#llm-provider-selection-optional)
- [Error Handling](#error-handling)
- [TypeScript API Client](#typescript-api-client)
- [React Hook: useCopilot](#react-hook-usecopilot)
- [Quick Start Checklist](#quick-start-checklist)
- [Postman Collection](#postman-collection)

---

## Overview

The Copilot is a conversational AI assistant for wealth management professionals. It can:

- Query CRM data (clients, prospects, AUM, tasks) via Engage
- Analyse uploaded documents (fund docs, IC memos) via RAG Gateway
- Search the web for market data and news
- Perform financial calculations (IRR, MOIC, TVPI)

The integration pattern is **async trigger + poll**:

1. Frontend sends a message to the API
2. API returns a `run_id` immediately (HTTP 202)
3. Frontend polls `GET /runs/{run_id}` until the status is `complete` or `failed`
4. Frontend renders the answer and source citations

There is no WebSocket or SSE — all communication is standard REST with polling.

---

## Architecture

```
┌─────────────────┐          ┌──────────────────┐          ┌─────────────────┐
│                  │  POST    │                  │  Celery   │                 │
│    Frontend      │ ───────> │   FastAPI         │ ───────> │   Agent Worker  │
│    (React)       │  202     │   /agents/run     │  queue    │   (LangGraph)   │
│                  │ <─────── │                  │          │                 │
│                  │          │                  │          │   ┌───────────┐ │
│                  │  GET     │                  │          │   │ Engage MCP│ │
│                  │ ───────> │   /runs/{id}      │          │   │ RAG       │ │
│                  │  200     │                  │          │   │ Web Search│ │
│                  │ <─────── │                  │          │   └───────────┘ │
└─────────────────┘          └──────────────────┘          └─────────────────┘
```

---

## Authentication

All API calls require an Azure AD JWT in the `Authorization` header.

```
Authorization: Bearer <azure-ad-jwt>
```

### Required JWT Claims

| Claim | Type | Description |
|-------|------|-------------|
| `sub` | string | Subject identifier |
| `id` | string | User ID — maps to `user_id` in the system |
| `companyId` | number | Tenant ID — scopes all data to this company |
| `exp` | number | Token expiry (enforced) |

Optional claims: `role` (number), `capabilities` (string array).

The token is forwarded as-is to downstream services (Engage MCP, RAG Gateway), so the same token that authenticates the user in the frontend works for the Copilot API.

---

## API Endpoints

Base URL: configured per environment (e.g. `http://localhost:8000` for local dev).

### 1. Trigger a Run (Recommended)

```
POST /agents/run
```

The **unified endpoint** — use this for all Copilot interactions. If you omit `workflow`, the backend auto-routes the message to the best workflow.

**Request:**

```json
{
  "message": "How many clients do we have and what is our total AUM?",
  "workflow": "copilot",
  "conversation_id": "conv-abc-123",
  "source_module": "engage",
  "llm_config": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-6"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | **Yes** | The user's question |
| `workflow` | string | No | Explicit workflow name. Omit to let the router decide (defaults to `copilot`) |
| `conversation_id` | string | No | Pass the same ID across messages to enable multi-turn memory |
| `source_module` | enum | No | Which platform module is calling: `"engage"`, `"deals"`, `"plan"`, `"insights"`, `"portal"` |
| `context` | object | No | Arbitrary context passed through to the workflow |
| `llm_config` | object | No | Override default LLM provider/model (see [LLM Provider Selection](#llm-provider-selection-optional)) |

**Response (202 Accepted):**

```json
{
  "run_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "queued",
  "workflow": "copilot"
}
```

### 2. Trigger a Copilot Run (Direct)

```
POST /agents/copilot/run
```

Bypasses the router and targets the Copilot workflow directly. Same request body as above, minus the `workflow` field.

**Response (202 Accepted):**

```json
{
  "run_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "queued"
}
```

### 3. Poll Run Status

```
GET /runs/{run_id}
```

**Response (200 OK):**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "tenant_id": "tenant-001",
  "user_id": "user-001",
  "workflow": "copilot",
  "status": "complete",
  "input": {
    "message": "How many clients do we have?"
  },
  "output": {
    "answer": "Based on our CRM data, you currently have 247 clients with a total AUM of $2.3B...",
    "sources": [
      {
        "type": "crm",
        "tool": "engage_get_clients_widget",
        "data": { "total_clients": 247, "growth": "+12 this month" }
      }
    ],
    "tools_called": [
      { "tool": "engage_get_clients_widget", "args": {}, "iteration": 1 },
      { "tool": "engage_get_clients_aum_widget", "args": {}, "iteration": 2 }
    ],
    "iteration_count": 2
  },
  "steps": [
    { "node": "agent", "status": "complete", "timestamp": "2026-04-19T10:00:01Z" },
    { "node": "tool_executor", "status": "complete", "timestamp": "2026-04-19T10:00:02Z" },
    { "node": "agent", "status": "complete", "timestamp": "2026-04-19T10:00:03Z" },
    { "node": "summarize", "status": "complete", "timestamp": "2026-04-19T10:00:04Z" }
  ],
  "llm_config": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-6"
  },
  "error": null,
  "created_at": "2026-04-19T10:00:00Z",
  "started_at": "2026-04-19T10:00:01Z",
  "completed_at": "2026-04-19T10:00:04Z",
  "duration_ms": 3200
}
```

### 4. Resume a Run (Human-in-the-Loop)

```
POST /runs/{run_id}/resume
```

Used when a run is in `awaiting_review` status. Not typical for Copilot, but supported.

**Request:**

```json
{
  "feedback": "looks good",
  "approved": true
}
```

### 5. Discovery Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /agents` | GET | List all available workflows with their descriptions and modules |
| `GET /agents/llm-providers` | GET | List available LLM providers and models |
| `GET /agents/tools` | GET | List all registered tools with categories |
| `GET /health` | GET | Health check (no auth required) |
| `GET /ready` | GET | Readiness check — verifies DB + Redis connectivity |

---

## TypeScript Interfaces

```typescript
// ─── Request Types ───────────────────────────────────────────────

interface CopilotRequest {
  message: string;
  workflow?: string;            // omit or "copilot"
  conversation_id?: string;     // for multi-turn
  source_module?: "engage" | "deals" | "plan" | "insights" | "portal";
  context?: Record<string, unknown>;
  llm_config?: LLMConfig;
}

interface LLMConfig {
  provider: "anthropic" | "azure_openai" | "openrouter";
  model: string;
  temperature?: number;         // 0.0 - 1.0
  max_tokens?: number;          // capped at 8192 server-side
}

// ─── Response Types ──────────────────────────────────────────────

interface TriggerResponse {
  run_id: string;
  status: "queued";
  workflow: string;             // present on unified endpoint
}

type RunStatus =
  | "queued"
  | "running"
  | "awaiting_review"
  | "resuming"
  | "complete"
  | "failed"
  | "cancelled";

interface RunResponse {
  id: string;
  tenant_id: string;
  user_id: string;
  workflow: string;
  status: RunStatus;
  input: Record<string, unknown> | null;
  output: CopilotOutput | null;
  steps: RunStep[];
  llm_config: LLMConfig | null;
  error: string | null;
  triggered_by: string | null;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
}

interface CopilotOutput {
  answer: string;
  sources: Source[];
  tools_called: ToolCall[];
  iteration_count: number;
}

interface Source {
  type: string;                 // "document", "crm", "web", etc.
  tool: string;                 // tool name that produced this source
  doc_id?: string;              // for document sources
  excerpt?: string;             // relevant text snippet
  page_numbers?: number[];      // page references
  data?: Record<string, unknown>; // tool-specific data
}

interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  iteration: number;
}

interface RunStep {
  node: string;
  status: string;
  timestamp: string;
  result?: Record<string, unknown>;
}

// ─── Discovery Types ─────────────────────────────────────────────

interface Workflow {
  name: string;
  modules: string[];
  is_sample: boolean;
  description: string;
}

interface LLMProvider {
  provider: string;
  models: LLMModel[];
  default?: boolean;
}

interface LLMModel {
  id: string;
  name: string;
  vendor: string;
  supports_tools?: boolean;
}

interface Tool {
  name: string;
  description: string;
  categories: string[];
  modules: string[];
}
```

---

## Integration Flow

### Step 1: Send the User's Message

```typescript
const response = await fetch(`${API_BASE}/agents/run`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    message: userMessage,
    workflow: "copilot",
    conversation_id: conversationId,    // undefined for first message
    source_module: "engage",            // or whichever module the user is in
  }),
});

const { run_id, workflow } = await response.json();
```

### Step 2: Poll for the Result

```typescript
let result: RunResponse;

do {
  await sleep(1500);  // start at 1.5s, increase on each poll
  const res = await fetch(`${API_BASE}/runs/${run_id}`, {
    headers: { "Authorization": `Bearer ${accessToken}` },
  });
  result = await res.json();
} while (result.status === "queued" || result.status === "running");
```

### Step 3: Render the Result

```typescript
if (result.status === "complete" && result.output) {
  // Display the answer (markdown-formatted text)
  renderMarkdown(result.output.answer);

  // Display source citations
  renderSources(result.output.sources);
} else if (result.status === "failed") {
  showError(result.error ?? "The request failed. Please try again.");
}
```

---

## Multi-Turn Conversations

The Copilot maintains memory across messages within a conversation. To enable this:

1. **Generate a `conversation_id`** when the user starts a new chat session (e.g. `crypto.randomUUID()`)
2. **Pass the same `conversation_id`** in every subsequent message
3. **Omit `conversation_id`** (or pass `undefined`) for one-off questions with no memory

```typescript
// First message — start a new conversation
const conversationId = crypto.randomUUID();

await triggerRun({
  message: "How many clients do we have?",
  conversation_id: conversationId,
});

// Follow-up — same conversation_id, the Copilot remembers prior context
await triggerRun({
  message: "What is the year-over-year growth trend?",
  conversation_id: conversationId,
});
```

The backend handles all memory management:
- **Last 5 turns** are kept in full (sliding window)
- **Key facts** are extracted and persisted (working memory)
- **Older turns** are summarized and compressed automatically

---

## Polling Strategy

### Recommended Approach

| Poll # | Delay | Rationale |
|--------|-------|-----------|
| 1 | 1.5s | Most simple queries complete in 2-4s |
| 2 | 2s | |
| 3 | 3s | |
| 4+ | 4s | Complex multi-tool queries may take 10-15s |
| 15+ | 5s | Timeout after ~60s total |

### Status Transitions

```
queued → running → complete
                 → failed
                 → awaiting_review → (resume) → running → complete
```

### Terminal States

Stop polling when status is one of: `complete`, `failed`, `cancelled`.

### Example with Exponential Backoff

```typescript
async function pollRun(runId: string, token: string): Promise<RunResponse> {
  const MAX_ATTEMPTS = 20;
  let delay = 1500;

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, delay));

    const res = await fetch(`${API_BASE}/runs/${runId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const run: RunResponse = await res.json();

    if (run.status === "complete" || run.status === "failed" || run.status === "cancelled") {
      return run;
    }

    delay = Math.min(delay * 1.3, 5000);  // cap at 5s
  }

  throw new Error("Copilot request timed out");
}
```

---

## Rendering Source Citations

The `output.sources` array contains citations from tools the Copilot used. Render them to build trust and transparency.

### Source Types

| `type` | Origin | What to Show |
|--------|--------|-------------|
| `"document"` | RAG Gateway | Document name, page numbers, excerpt |
| `"crm"` | Engage MCP | Widget name, key metrics |
| `"web"` | Tavily | URL, title, snippet |

### Example Rendering

```typescript
function renderSources(sources: Source[]) {
  return sources.map((source) => {
    switch (source.type) {
      case "document":
        return `📄 ${source.doc_id} — p.${source.page_numbers?.join(", ")} — "${source.excerpt}"`;
      case "crm":
        return `📊 ${source.tool} — ${JSON.stringify(source.data)}`;
      case "web":
        return `🌐 Web search result`;
      default:
        return `🔧 ${source.tool}`;
    }
  });
}
```

---

## LLM Provider Selection (Optional)

The backend supports multiple LLM providers. You can let users choose, or hardcode a default.

### Fetch Available Providers

```typescript
const res = await fetch(`${API_BASE}/agents/llm-providers`, {
  headers: { Authorization: `Bearer ${token}` },
});
const providers: LLMProvider[] = await res.json();
```

### Available Models

| Provider | Model ID | Display Name |
|----------|----------|-------------|
| `anthropic` | `claude-haiku-4-5-20251001` | Claude 4.5 Haiku (fast, cheap) |
| `anthropic` | `claude-sonnet-4-6` | Claude Sonnet 4.6 (balanced) |
| `anthropic` | `claude-opus-4-6` | Claude Opus 4.6 (most capable) |
| `azure_openai` | `inv-aii-gpt40-useast2-dev` | GPT-4o |
| `azure_openai` | `inv-aii-gpt5chat-useast2-dev` | GPT-5 Chat |
| `openrouter` | `deepseek/deepseek-v3.2` | DeepSeek V3.2 |
| `openrouter` | `moonshotai/kimi-k2.5` | Kimi K2.5 |

### Pass in Request

```typescript
await triggerRun({
  message: "...",
  llm_config: {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
  },
});
```

If `llm_config` is omitted, the backend uses its default (currently Claude 4.5 Haiku).

---

## Error Handling

### HTTP-Level Errors

| Status | Cause | Action |
|--------|-------|--------|
| 400 | Invalid `llm_config` (unknown provider/model) | Show validation error from `response.detail` |
| 401 | Missing or expired JWT | Redirect to login / refresh token |
| 404 | Unknown workflow or run not found | Show "not found" message |
| 422 | Request body validation failed | Show validation error |
| 500 | Server error | Retry once, then show generic error |

### Run-Level Errors

When `status === "failed"`, check `run.error` for the reason:

```typescript
if (run.status === "failed") {
  if (run.error?.includes("disallowed")) {
    // Input was flagged by security (prompt injection attempt)
    showError("Your message was flagged. Please rephrase.");
  } else {
    showError("Something went wrong. Please try again.");
  }
}
```

### Security Notes

- The backend sanitises inputs — prompt injection attempts will cause the run to fail with a `"disallowed"` error
- `max_tokens` is server-capped at 8192 regardless of what the client sends
- Only allowlisted provider+model combinations are accepted

---

## TypeScript API Client

A ready-to-use client class:

```typescript
const TERMINAL_STATUSES: RunStatus[] = ["complete", "failed", "cancelled"];

class CopilotClient {
  constructor(
    private baseUrl: string,
    private getToken: () => string | Promise<string>,
  ) {}

  private async headers(): Promise<HeadersInit> {
    const token = await this.getToken();
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  /** Trigger a copilot run and return the run_id */
  async send(request: CopilotRequest): Promise<TriggerResponse> {
    const res = await fetch(`${this.baseUrl}/agents/run`, {
      method: "POST",
      headers: await this.headers(),
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new CopilotError(res.status, body.detail ?? "Request failed");
    }

    return res.json();
  }

  /** Poll a run until it reaches a terminal status */
  async poll(runId: string, onProgress?: (run: RunResponse) => void): Promise<RunResponse> {
    const MAX_ATTEMPTS = 20;
    let delay = 1500;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await new Promise((r) => setTimeout(r, delay));

      const res = await fetch(`${this.baseUrl}/runs/${runId}`, {
        headers: await this.headers(),
      });
      const run: RunResponse = await res.json();

      onProgress?.(run);

      if (TERMINAL_STATUSES.includes(run.status)) {
        return run;
      }

      delay = Math.min(delay * 1.3, 5000);
    }

    throw new CopilotError(408, "Request timed out");
  }

  /** Send a message and wait for the complete result */
  async ask(
    request: CopilotRequest,
    onProgress?: (run: RunResponse) => void,
  ): Promise<RunResponse> {
    const { run_id } = await this.send(request);
    return this.poll(run_id, onProgress);
  }

  /** Fetch available LLM providers and models */
  async getProviders(): Promise<LLMProvider[]> {
    const res = await fetch(`${this.baseUrl}/agents/llm-providers`, {
      headers: await this.headers(),
    });
    return res.json();
  }

  /** Fetch available workflows */
  async getWorkflows(): Promise<Workflow[]> {
    const res = await fetch(`${this.baseUrl}/agents`, {
      headers: await this.headers(),
    });
    return res.json();
  }
}

class CopilotError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "CopilotError";
  }
}
```

### Usage

```typescript
const copilot = new CopilotClient(
  process.env.NEXT_PUBLIC_AGENTS_API_URL!,
  () => getAccessToken(),  // your auth token getter
);

// One-liner: send + poll
const result = await copilot.ask({
  message: "How many clients do we have?",
  source_module: "engage",
  conversation_id: currentConversationId,
});

console.log(result.output?.answer);
console.log(result.output?.sources);
```

---

## React Hook: useCopilot

```typescript
import { useCallback, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  toolsCalled?: ToolCall[];
}

interface UseCopilotOptions {
  sourceModule?: CopilotRequest["source_module"];
  llmConfig?: LLMConfig;
}

function useCopilot(client: CopilotClient, options: UseCopilotOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationId = useRef(crypto.randomUUID());

  const send = useCallback(
    async (userMessage: string) => {
      setError(null);
      setIsLoading(true);

      // Add user message immediately
      setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

      try {
        const run = await client.ask({
          message: userMessage,
          workflow: "copilot",
          conversation_id: conversationId.current,
          source_module: options.sourceModule,
          llm_config: options.llmConfig,
        });

        if (run.status === "complete" && run.output) {
          const output = run.output as CopilotOutput;
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: output.answer,
              sources: output.sources,
              toolsCalled: output.tools_called,
            },
          ]);
        } else {
          setError(run.error ?? "Request failed");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    },
    [client, options.sourceModule, options.llmConfig],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
    conversationId.current = crypto.randomUUID();
  }, []);

  return { messages, isLoading, error, send, reset, conversationId: conversationId.current };
}
```

### Usage in a Component

```tsx
function CopilotChat() {
  const { messages, isLoading, error, send, reset } = useCopilot(copilotClient, {
    sourceModule: "engage",
  });
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      send(input.trim());
      setInput("");
    }
  };

  return (
    <div>
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <p>{msg.content}</p>
            {msg.sources && msg.sources.length > 0 && (
              <div className="sources">
                <strong>Sources:</strong>
                <ul>
                  {msg.sources.map((s, j) => (
                    <li key={j}>{s.tool} — {s.excerpt ?? s.type}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
        {isLoading && <div className="loading">Thinking...</div>}
        {error && <div className="error">{error}</div>}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the Copilot..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>

      <button onClick={reset}>New Conversation</button>
    </div>
  );
}
```

---

## Quick Start Checklist

- [ ] Set up the API base URL for each environment
- [ ] Ensure the Azure AD JWT is included in all API calls
- [ ] Use `POST /agents/run` as the primary entry point
- [ ] Generate a `conversation_id` per chat session for multi-turn memory
- [ ] Pass `source_module` matching the current platform module the user is in
- [ ] Implement polling with backoff (start 1.5s, cap at 5s, timeout at ~60s)
- [ ] Handle terminal statuses: `complete`, `failed`, `cancelled`
- [ ] Render `output.answer` as markdown
- [ ] Render `output.sources` as citations below the answer
- [ ] Handle HTTP 400/401/404 errors at the request level
- [ ] Handle `status === "failed"` with `run.error` at the run level
- [ ] (Optional) Let users select LLM provider/model via `GET /agents/llm-providers`

---

## Postman Collection

A Postman collection is available for testing all endpoints manually:

**File:** `postman/invictus-agents.postman_collection.json`

**Setup:**
1. Import the collection into Postman
2. Set the `access_token` collection variable to your Azure AD JWT
3. The `base_url` defaults to `http://localhost:8000`

**Key folders:**
- **Infrastructure** — Health checks, discovery, LLM security tests
- **Workflows > Copilot Agent** — Trigger, poll, and multi-turn examples
- **Workflows > Unified Run Endpoint** — Auto-routed, explicit workflow, and conversation ID examples

The collection includes automated test scripts that validate response shapes and status codes.
