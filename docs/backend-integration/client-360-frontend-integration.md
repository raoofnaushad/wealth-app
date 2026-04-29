# Client 360 — Frontend Integration Guide

The Client 360 workflow fetches client and prospect dashboard KPIs from Engage and returns a structured data payload plus a plain-English run narrative. It runs as an async background job — you trigger it, then poll until it's done.

**Typical run time:** 2–5 seconds.

---

## Authentication

Every request requires a JWT bearer token:

```
Authorization: Bearer <your_jwt_token>
```

The backend uses this token to authenticate MCP tool calls to Engage — you don't need to pass any additional credentials in the request body.

---

## Step 1 — Trigger the Workflow

```
POST /agents/client_360/run
```

No request body is needed. The server injects all required context from your JWT.

**Response — `202 Accepted`:**
```json
{
  "run_id": "3f8a1b2c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
  "status": "queued"
}
```

Save the `run_id` — you'll use it to poll for the result.

---

## Step 2 — Poll for Status and Output

```
GET /runs/{run_id}
```

Poll this endpoint until `status` is `"complete"` or `"failed"`. The recommended interval is **1 second**, with a timeout of **30 seconds**.

**Status progression:**
```
queued  →  running  →  complete
                    ↘  failed
```

**Response — `200 OK`:**
```json
{
  "id": "3f8a1b2c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
  "status": "complete",
  "workflow": "client_360",
  "output": { ... },
  "steps": [ ... ],
  "created_at": "2026-04-29T10:00:00Z",
  "started_at": "2026-04-29T10:00:00.5Z",
  "completed_at": "2026-04-29T10:00:03.1Z",
  "duration_ms": 2600,
  "error": null
}
```

When `status === "failed"`, the `error` field contains the failure reason. The `output` field may be `null` in that case.

---

## Step 3 — Read the Output

The `output` object has this shape:

```json
{
  "clients": {
    "count": 42,
    "aum": {
      "total": 1200000000,
      "currency": "USD"
    },
    "aum_by_asset_class": [
      { "asset_class": "Equities", "value": 600000000, "percentage": 50 }
    ],
    "deployment_vs_target": {
      "deployed": 85,
      "target": 90
    },
    "partial": false
  },
  "prospects": {
    "pipeline": {
      "total": 18,
      "value": 250000000
    },
    "count_metrics": {
      "total": 18,
      "new_this_month": 5
    },
    "segments": [
      { "name": "HNW", "count": 10, "value": 150000000 }
    ],
    "partial": false
  },
  "clients_warnings": [
    { "field": "aum_by_asset_class", "message": "Failed to fetch AUM breakdown" }
  ],
  "prospects_warnings": [],
  "run_summary": "42 clients with $1.2B AUM, up 3.4% MOM across 4 asset classes. 18 prospects in pipeline, 5 new this month."
}
```

### Key fields

| Field | Type | Description |
|---|---|---|
| `clients` | object | Client dashboard KPIs, or an error envelope (see below) |
| `clients.count` | number | Total active clients |
| `clients.aum` | object | Total AUM with currency |
| `clients.aum_by_asset_class` | array | AUM broken down by asset class |
| `clients.deployment_vs_target` | object | Deployment % vs advisory target % |
| `clients.partial` | boolean | `true` if some sub-fields are missing |
| `prospects` | object | Prospect dashboard KPIs, or an error envelope |
| `prospects.pipeline` | object | Total prospect count and pipeline value |
| `prospects.count_metrics` | object | Total and new-this-month counts |
| `prospects.segments` | array | Prospects segmented by category |
| `prospects.partial` | boolean | `true` if some sub-fields are missing |
| `clients_warnings` | array | Per-field warning messages for partial clients data |
| `prospects_warnings` | array | Per-field warning messages for partial prospects data |
| `run_summary` | string | Plain-English narrative describing the full run result |

---

## Error Handling

### Pipeline-level errors (inside `output`)

The pipeline **never fails silently** — if a data fetch fails, the error is captured inside the output rather than crashing the run. Check for the `error` key on `clients` or `prospects`:

```json
{
  "clients": {
    "error": "BACKEND_ERROR",
    "message": "Connection timeout to Engage API"
  },
  "prospects": {
    "error": "TOOL_NOT_FOUND",
    "message": "engage_get_prospects_dashboard not available"
  },
  "clients_warnings": [],
  "prospects_warnings": [],
  "run_summary": "Client fetch failed due to a backend error. Prospect fetch failed — tool not available."
}
```

**Error codes:**

| Code | Meaning |
|---|---|
| `BACKEND_ERROR` | MCP tool raised an exception (network error, timeout, etc.) |
| `TOOL_NOT_FOUND` | The Engage MCP tool was not discoverable for this user |

**Partial data** — when `partial: true`, the main data fields are present but some sub-fields may be missing. Check `clients_warnings` / `prospects_warnings` for specifics.

**`run_summary`** is always present — even when both fetches fail, the LLM generates a narrative describing what went wrong. If the LLM itself fails, it falls back to: `"Run narrative could not be generated due to an LLM error."`

### HTTP-level errors

| Status | Meaning |
|---|---|
| `401` | Missing or expired JWT — re-authenticate |
| `404` | `run_id` not found or belongs to a different tenant |
| `400` | Invalid request (e.g. bad `llm_config`) |
| `500` | Server error — retry with backoff |

---

## Complete Integration Example (TypeScript)

```typescript
const BASE_URL = process.env.NEXT_PUBLIC_API_URL; // e.g. https://api.invictus.ai

interface Client360Output {
  clients: Record<string, unknown> | { error: string; message: string };
  prospects: Record<string, unknown> | { error: string; message: string };
  clients_warnings: Array<{ field: string; message: string }>;
  prospects_warnings: Array<{ field: string; message: string }>;
  run_summary: string;
}

interface RunResponse {
  id: string;
  status: "queued" | "running" | "complete" | "failed";
  output: Client360Output | null;
  error: string | null;
  duration_ms: number | null;
}

export async function fetchClient360(token: string): Promise<Client360Output> {
  // 1. Trigger the workflow
  const triggerRes = await fetch(`${BASE_URL}/agents/client_360/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!triggerRes.ok) {
    throw new Error(`Failed to trigger Client 360: ${triggerRes.status}`);
  }

  const { run_id } = await triggerRes.json();

  // 2. Poll until complete or failed (30s timeout, 1s interval)
  const timeout = Date.now() + 30_000;

  while (Date.now() < timeout) {
    await new Promise((r) => setTimeout(r, 1_000));

    const pollRes = await fetch(`${BASE_URL}/runs/${run_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!pollRes.ok) {
      throw new Error(`Failed to poll run: ${pollRes.status}`);
    }

    const run: RunResponse = await pollRes.json();

    if (run.status === "complete") {
      if (!run.output) throw new Error("Run completed with no output");
      return run.output;
    }

    if (run.status === "failed") {
      throw new Error(`Client 360 run failed: ${run.error ?? "unknown error"}`);
    }
  }

  throw new Error("Client 360 timed out after 30 seconds");
}
```

### Rendering partial data with warnings

```typescript
function hasError(section: Record<string, unknown>): boolean {
  return "error" in section;
}

// Usage
const output = await fetchClient360(token);

if (hasError(output.clients as Record<string, unknown>)) {
  // Show error state for clients panel
} else if ((output.clients as any).partial) {
  // Show clients data with warning banner using output.clients_warnings
} else {
  // Render full clients panel
}
```

---

## Run Steps

The `steps` array on the run response records each pipeline node's execution:

```json
"steps": [
  {
    "node": "fetch_clients_dashboard",
    "status": "complete",
    "started_at": "2026-04-29T10:00:00.5Z",
    "completed_at": "2026-04-29T10:00:01.8Z",
    "duration_ms": 1300
  },
  {
    "node": "fetch_prospects_dashboard",
    "status": "complete",
    "started_at": "2026-04-29T10:00:01.8Z",
    "completed_at": "2026-04-29T10:00:02.9Z",
    "duration_ms": 1100
  },
  {
    "node": "generate_summary",
    "status": "complete",
    "started_at": "2026-04-29T10:00:02.9Z",
    "completed_at": "2026-04-29T10:00:03.1Z",
    "duration_ms": 200
  }
]
```

This is useful for loading indicators — you can show per-step progress while polling if your UX calls for it.
