# Portfolio Alerts & Discrepancies — Design Spec

**Date:** 2026-04-29  
**Author:** Raoof Naushad  
**Branch:** raoof-feat/client-360

---

## Context

The Client 360 agent already surfaces company-wide KPIs (clients, prospects, planning deployment gaps). The next step is to surface **Portfolio Alerts** — actionable, advisor-facing signals about which clients need attention and why. This requires per-client data: Engage identity/summary, Plan allocation gaps (IPQ/IPS), and Insights portfolio analytics. The output is a curated set of 5 Portfolio Alerts plus a Discrepancies section flagging clients with incomplete or missing data.

---

## What We're Building

Two new output sections added to the Client 360 agent run:

### Portfolio Alerts
5 LLM-generated, prioritized alerts across all clients. Each alert names the client(s) involved, describes the issue (drift, yield, IRR, overallocation, underallocation, etc.), and suggests an action. Alerts may be per-client or aggregated across multiple clients (e.g. "10 clients need yield increase").

### Discrepancies
Two-tier list combining:

1. **Structural gaps** (Python-detected, before LLM): clients excluded from analysis because required data couldn't be fetched — no active IPS, no planning timeline started, data fetch error. Identified in `fetch_portfolio_alerts_data`.

2. **Analytical discrepancies** (LLM-detected): inconsistencies the LLM spots across the full client picture — e.g. a Conservative-profiled client heavily allocated to illiquid PE, a client with a signed IPS whose actual allocation significantly deviates from the model portfolio, a client with deeply negative IRR vs their target. These are separate from Portfolio Alerts and carry lower urgency than actionable alerts.

Both types are merged into the single `discrepancies` output field. Each entry names the client, states the type (`structural` or `analytical`), and describes the issue.

---

## Architecture

### Graph Extension

The existing linear graph:
```
START → fetch_clients_dashboard → fetch_prospects_dashboard → fetch_planning_dashboard → generate_summary → END
```

Extended to:
```
START → fetch_clients_dashboard → fetch_prospects_dashboard → fetch_planning_dashboard
      → fetch_portfolio_alerts_data → generate_portfolio_alerts → generate_summary → END
```

Two new nodes added before `generate_summary`:

1. **`fetch_portfolio_alerts_data`** — fetches all per-client data
2. **`generate_portfolio_alerts`** — LLM call to synthesize alerts and discrepancies

### New State Fields

Added to `Client360State`:
```python
portfolio_alerts_data: dict[str, Any]       # compressed per-client summaries + discrepancies list
portfolio_alerts_warnings: list[dict[str, Any]]
portfolio_alerts: list[dict[str, Any]]      # 5 structured alerts from LLM
discrepancies: list[dict[str, Any]]         # clients with missing/incomplete data
```

---

## Node 1: `fetch_portfolio_alerts_data`

### Step 1 — Fetch client list
Call `engage_list_principals(principal_state="CLIENT", sort="aum,desc", size=50, page=0)` to get top-50 clients by AUM.

### Step 2 — Per-client concurrent fetch (semaphore=10)
For each client, gather three calls concurrently using `asyncio.Semaphore(10)`:

| Source | Tool | Key data extracted |
|--------|------|--------------------|
| **Engage** | `engage_get_principal_summary(principal_id)` | portfolioValue, deploymentTarget, cashPosition |
| **Plan** | `plan_get_client_planning_detail(principal_id)` → extract `ipsId` → `plan_get_client_asset_allocation(principal_id, ips_id)` | allocationGap per asset class, assignedModelPortfolio, riskProfile |
| **Insights** | `insights_get_portfolio_analytics_report(principal_id, reports=["investments", "asset_allocation", "returns", "distributions", "deployments", "nav_evolution"])` | IRR, NAV, distributions, deployments, allocation vs target |

### Step 3 — Compress per-client data (pure Python, no LLM)
Each client's raw API responses are distilled into a compact summary dict:
```python
{
  "id": 3809,
  "name": "Client Name",
  "aum": 15_000_000,
  "risk_profile": "Conservative",
  "deployment_target": 2_000_000,
  "allocation_gaps": [
    {"asset_class": "Real Estate", "actual_nav": 1_500_000, "target_nav": 3_000_000, "nav_diff": 1_500_000}
  ],
  "irr": 0.08,
  "total_return": 1_200_000,
  "total_distributions": 400_000,
  "deployments_by_asset_class": [...],
  "model_portfolio": "Conservative Portfolio A"
}
```

### Step 4 — Route structural discrepancies
Clients who cannot be analyzed (no IPS, no planning timeline started, planning detail fetch failed) are placed in a `structural_discrepancies` list before the LLM sees them:
```python
{"id": 3809, "name": "Client Name", "type": "structural", "reason": "No active IPS — allocation cannot be assessed"}
```

### Error handling
- Per-client failures are caught individually; the client moves to discrepancies with reason `"DATA_FETCH_ERROR"`
- The node never crashes; it stores what it got
- Warnings accumulate into `portfolio_alerts_warnings`

---

## Node 2: `generate_portfolio_alerts`

Single LLM call. Input:
- Compressed summaries for all successfully fetched clients
- Structural discrepancies list (pre-detected in Python, passed to LLM for context only)

Prompt instructs the LLM to:
1. Act as an experienced investment advisor reviewing all client portfolios
2. Identify the 5 most important, actionable issues across all clients (Portfolio Alerts)
3. Group related clients where appropriate (e.g. "10 clients underweight in PE")
4. For each alert: name client(s), describe the issue with specifics, suggest action
5. Additionally, identify any **analytical discrepancies** — inconsistencies, mismatches, or anomalies visible in the data (e.g. risk profile vs actual holdings mismatch, signed IPS but allocation far off model, deeply negative IRR vs target). These are separate from the 5 alerts.
6. Output structured JSON:
```json
{
  "alerts": [
    {"clients": ["Name"], "category": "Portfolio Drift", "issue": "...", "action": "..."}
  ],
  "analytical_discrepancies": [
    {"clients": ["Name"], "type": "analytical", "issue": "..."}
  ]
}
```

Output: `portfolio_alerts` (list of 5) stored in state. Final `discrepancies` = structural_discrepancies (from node 1) + analytical_discrepancies (from LLM), merged and stored in state.

---

## New Tools File

`agents/client_360/tools.py` gains a third builder:

```python
async def build_client360_insights_tools(access_token: str) -> list:
    # Discovers tools from "insights" MCP server
```

---

## Prompt Design

`prompts.py` gains two new functions:

- **`build_portfolio_alerts_prompt(client_summaries, discrepancies)`** — formats the compressed client data and instructs the LLM to generate 5 alerts
- **`_describe_client_summary(client)`** — renders one client's compact summary as a readable block for the prompt

The existing `build_summary_prompt` is extended to include portfolio alerts and discrepancies in the final narrative.

---

## State Output

`_extract_output()` in `agent.py` extended to include:
```python
"portfolio_alerts": portfolio_alerts,
"discrepancies": discrepancies,
"portfolio_alerts_warnings": portfolio_alerts_warnings,
```

---

## Verification

1. **Unit test** (`tests/test_client_360_portfolio_alerts.py`):
   - Mock `engage_list_principals` returning 3 clients
   - Mock one client with full data, one with no IPS, one with a fetch error
   - Assert discrepancies list has 2 entries with correct reasons
   - Assert compressed summary for the good client has expected fields
   - Assert `generate_portfolio_alerts` node produces `portfolio_alerts` list of length ≤ 5

2. **Integration**: Run agent end-to-end against live MCP servers; verify `portfolio_alerts` and `discrepancies` appear in output JSON

3. **Prompt sanity**: Check compressed client summaries stay under ~800 chars each so 50 clients fit in a single LLM context window comfortably (~40k chars total, well within limits)
