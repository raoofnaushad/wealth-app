import riskPlanningMd from '../../knowledge-base/risk-and-planning/al-rashidi-2026.md?raw'
import dataAggregationMd from '../../knowledge-base/data-aggregation-reporting/al-rashidi-dashboard.md?raw'
import crmEngageMd from '../../knowledge-base/engage/al-rashidi-crm.md?raw'
import dealsMd from '../../knowledge-base/deals/greengrid-energy-prescreening.md?raw'
import envirosoilMd from '../../knowledge-base/deals/envirosoil-prescreening.md?raw'
import insightsMd from '../../knowledge-base/insights/daily-brief-2026-04-08.md?raw'
import clientPortalMd from '../../knowledge-base/client-portal/al-rashidi-portal.md?raw'

export interface KnowledgeBaseModule {
  key: string
  label: string
  content: string
  sourceUrl: string
}

export const KNOWLEDGE_BASE_MODULES: KnowledgeBaseModule[] = [
  {
    key: 'risk_planning',
    label: 'Risk & Planning',
    content: riskPlanningMd,
    sourceUrl: 'https://staging.asbitech.ai/plan/planning-dashboard',
  },
  {
    key: 'crm_engage',
    label: 'CRM / Engage',
    content: crmEngageMd,
    sourceUrl: 'https://staging.asbitech.ai/engage/prospects?period=1&page=0&size=20&sort=createdDate%2Casc&applyTo=1',
  },
  {
    key: 'data_aggregation',
    label: 'Data Aggregation & Reporting',
    content: dataAggregationMd,
    sourceUrl: 'https://staging.asbitech.ai/reports/portfolio-analytics/dashboard?page=0&size=10&sort=updatedDate%2Cdesc',
  },
  {
    key: 'deals',
    label: 'Deals',
    content: dealsMd + '\n\n---\n\n' + envirosoilMd,
    sourceUrl: 'https://proud-desert-0353e8200.2.azurestaticapps.net/opportunities/85',
  },
  {
    key: 'insights',
    label: 'Insights',
    content: insightsMd,
    sourceUrl: 'https://invictus-ai-agents-sj4z.vercel.app/insights',
  },
  {
    key: 'client_portal',
    label: 'Client Portal',
    content: clientPortalMd,
    sourceUrl: 'https://staging.asbitech.ai/client-portal/dashboard',
  },
]

export const SOURCE_LINKS = KNOWLEDGE_BASE_MODULES.reduce<Record<string, { label: string; url: string }>>(
  (acc, mod) => {
    acc[mod.key] = { label: mod.label, url: mod.sourceUrl }
    return acc
  },
  {},
)

export function buildSystemPrompt(): string {
  const sourceTable = KNOWLEDGE_BASE_MODULES.map(
    (m) => `- **${m.label}**: [${m.label}](${m.sourceUrl})`
  ).join('\n')

  const knowledgeSections = KNOWLEDGE_BASE_MODULES.map(
    (m) => `## ${m.label}\n\n${m.content}`
  ).join('\n\n---\n\n')

  return `You are the Invictus AI Copilot, an intelligent assistant for wealth management advisors at a family office. You help advisors prepare for meetings, review portfolios, track action items, and stay informed about their clients and market developments.

## Your Behavior
- Be concise and actionable. Keep responses focused — avoid unnecessary filler.
- Use markdown formatting: **bold** for emphasis, bullet lists for items, numbered lists for sequences.
- Use ## for main sections and ### for subsections. Do NOT use # (h1) — it's too large for the chat panel.
- NEVER use markdown tables (| column | syntax). Tables are FORBIDDEN — they break the chat UI. Always use bullet lists instead. Example of what to do:
  - **Managed by WATAR:** $375M (58.6%)
  - **Externally Managed:** $112M (17.5%)
  - **Unmanaged:** $153M (23.9%)
  This rule is absolute. Even when the knowledge base contains tables, convert them to bullet lists in your response.
- When discussing financial data, be precise with numbers and percentages.
- Address the advisor directly ("you have...", "your meeting...") and help them prepare for client interactions.
- If the question cannot be answered from the available knowledge base, say so clearly.

## Source Citations — IMPORTANT
At the very end of your response, include a **Sources** section listing ONLY the modules you actually drew information from. Use this exact format:

**Sources:**
- [Module Name](url)

Rules:
- ONLY cite modules whose data you actually used in the answer. Do NOT list all modules.
- If you only used Insights data, only cite Insights. If you used CRM and Risk & Planning, cite those two.
- The source links must be clickable markdown links using the exact URLs below.

## Available Source Modules
${sourceTable}

---

# KNOWLEDGE BASE

${knowledgeSections}`
}
