import { http, HttpResponse, delay } from 'msw'
import { RunStatus, type AgentRunResponse, type RunStep } from '@/api/types'
import { WORKFLOW_DEFINITIONS } from './data/agents'
import { MOCK_RUNS } from './data/runs'
import { DAILY_SUMMARIES } from './data/dailySummaries'
import { getMeetingBriefById } from './data/meetingBriefs'
import {
  MOCK_ORG_PROFILE,
  MOCK_ORG_BRANDING,
  MOCK_ORG_PREFERENCES,
  MOCK_USERS,
  MOCK_INVITATIONS,
} from './data/admin'
import {
  MOCK_INVESTMENT_TYPES,
  MOCK_DOCUMENT_TEMPLATES,
  MOCK_MANDATES,
  MOCK_ASSET_MANAGERS,
  MOCK_OPPORTUNITIES,
  MOCK_NEWS_ITEMS,
  MOCK_DASHBOARD_SUMMARY,
  MOCK_DOCUMENTS,
  MOCK_REVIEWS,
  MOCK_SHARES,
} from './data/deals'
import type { OrgProfile, OrgBranding, OrgPreferences, InviteUserRequest, ModuleRoleAssignment } from '@/modules/admin/types'
import type { InvestmentType, DocumentTemplate, Mandate, Opportunity, AssetManager } from '@/modules/deals/types'
import type { WorkspaceDocument, DocumentReview, DocumentShare } from './data/deals'

const dynamicRuns = new Map<string, AgentRunResponse>()
const runTimers = new Map<string, ReturnType<typeof setTimeout>>()

// Deals mutable state
const investmentTypes = [...MOCK_INVESTMENT_TYPES]
const documentTemplates = [...MOCK_DOCUMENT_TEMPLATES]
const mandates = [...MOCK_MANDATES]
const assetManagers = [...MOCK_ASSET_MANAGERS]
const opportunities = [...MOCK_OPPORTUNITIES]
const newsItems = [...MOCK_NEWS_ITEMS]
const dashboardSummary = { ...MOCK_DASHBOARD_SUMMARY }
const documents = [...MOCK_DOCUMENTS]
const reviews = [...MOCK_REVIEWS]
const shares = [...MOCK_SHARES]

// Admin mutable state
const orgProfile = { ...MOCK_ORG_PROFILE }
const orgBranding = { ...MOCK_ORG_BRANDING }
const orgPreferences = { ...MOCK_ORG_PREFERENCES }
const users = [...MOCK_USERS]
const invitations = [...MOCK_INVITATIONS]

// Initialize with mock data
MOCK_RUNS.forEach(run => dynamicRuns.set(run.id, { ...run }))

function generateId(): string {
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function advanceRun(runId: string) {
  const run = dynamicRuns.get(runId)
  if (!run) return

  const workflow = WORKFLOW_DEFINITIONS.find(w => w.workflow === run.workflow)
  if (!workflow) return

  const completedSteps = run.steps.filter(s => s.status === 'complete').length
  const runningStep = run.steps.find(s => s.status === 'running')

  if (runningStep) {
    // Complete the currently running step
    runningStep.status = 'complete'
    runningStep.completed_at = new Date().toISOString()
    runningStep.result_summary = `Completed ${runningStep.node.replace(/_/g, ' ')}`
    runningStep.actions = [`Processed ${runningStep.node.replace(/_/g, ' ')} step successfully`]

    // Check if this was an HITL step
    if (workflow.supportsHitl && runningStep.node === 'human_review') {
      run.status = RunStatus.AWAITING_REVIEW
      run.output = { draft: `Draft output for ${run.workflow} — awaiting advisor review`, status: 'pending_review' }
      dynamicRuns.set(runId, { ...run })
      return // Stop advancing
    }
  }

  // Start next step if available
  const nextStepIdx = run.steps.findIndex(s => s.status === 'pending')
  if (nextStepIdx !== -1) {
    run.steps[nextStepIdx].status = 'running'
    run.steps[nextStepIdx].started_at = new Date().toISOString()
    run.status = RunStatus.RUNNING
    dynamicRuns.set(runId, { ...run })

    const timer = setTimeout(() => advanceRun(runId), 2000 + Math.random() * 2000)
    runTimers.set(runId, timer)
  } else {
    // All steps done
    run.status = RunStatus.COMPLETE
    run.completed_at = new Date().toISOString()
    run.duration_ms = new Date(run.completed_at).getTime() - new Date(run.started_at!).getTime()
    run.output = { summary: `${run.workflow} completed successfully`, completed_steps: completedSteps + 1 }
    dynamicRuns.set(runId, { ...run })
  }
}

export const handlers = [
  // List agents
  http.get('/api/agents', async () => {
    await delay(300)
    return HttpResponse.json(WORKFLOW_DEFINITIONS)
  }),

  // Trigger a run
  http.post('/api/agents/:workflow/run', async ({ params, request }) => {
    await delay(500)
    const { workflow } = params as { workflow: string }
    const body = await request.json() as Record<string, unknown>
    const workflowDef = WORKFLOW_DEFINITIONS.find(w => w.workflow === workflow)
    if (!workflowDef) {
      return HttpResponse.json({ error: 'Unknown workflow' }, { status: 404 })
    }

    const runId = generateId()
    const now = new Date().toISOString()
    const steps: RunStep[] = workflowDef.steps.map(stepName => ({
      node: stepName,
      status: 'pending' as const,
      started_at: null,
      completed_at: null,
      result_summary: null,
      actions: [],
    }))

    const newRun: AgentRunResponse = {
      id: runId,
      tenant_id: 'tenant-watar',
      user_id: 'user-raoof',
      workflow,
      status: RunStatus.QUEUED,
      input: (body as { input: Record<string, unknown> }).input || {},
      output: null,
      steps,
      llm_config: (body as { llm_config?: Record<string, unknown> }).llm_config || { provider: 'azure_openai', model: 'gpt-4o' },
      error: null,
      triggered_by: 'user-raoof',
      created_at: now,
      started_at: null,
      completed_at: null,
      duration_ms: null,
    }

    dynamicRuns.set(runId, newRun)

    // Start advancing after a short delay
    setTimeout(() => {
      const run = dynamicRuns.get(runId)!
      run.status = RunStatus.RUNNING
      run.started_at = new Date().toISOString()
      run.steps[0].status = 'running'
      run.steps[0].started_at = new Date().toISOString()
      dynamicRuns.set(runId, { ...run })

      const timer = setTimeout(() => advanceRun(runId), 2000 + Math.random() * 1000)
      runTimers.set(runId, timer)
    }, 1000)

    return HttpResponse.json({ run_id: runId, status: 'queued' }, { status: 202 })
  }),

  // Get run status
  http.get('/api/runs/:runId', async ({ params }) => {
    await delay(200)
    const { runId } = params as { runId: string }
    const run = dynamicRuns.get(runId)
    if (!run) {
      return HttpResponse.json({ error: 'Run not found' }, { status: 404 })
    }
    return HttpResponse.json(run)
  }),

  // List runs (optionally filtered by workflow)
  http.get('/api/runs', async ({ request }) => {
    await delay(300)
    const url = new URL(request.url)
    const workflow = url.searchParams.get('workflow')
    let runs = Array.from(dynamicRuns.values())
    if (workflow) {
      runs = runs.filter(r => r.workflow === workflow)
    }
    runs.sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
    return HttpResponse.json(runs)
  }),

  // Resume a run (HITL)
  http.post('/api/runs/:runId/resume', async ({ params, request }) => {
    await delay(500)
    const { runId } = params as { runId: string }
    const body = await request.json() as { approved: boolean; feedback: string }
    const run = dynamicRuns.get(runId)

    if (!run) {
      return HttpResponse.json({ error: 'Run not found' }, { status: 404 })
    }
    if (run.status !== RunStatus.AWAITING_REVIEW) {
      return HttpResponse.json({ error: 'Run is not awaiting review' }, { status: 400 })
    }

    // Complete the human_review step
    const reviewStep = run.steps.find(s => s.node === 'human_review')
    if (reviewStep) {
      reviewStep.status = 'complete'
      reviewStep.completed_at = new Date().toISOString()
      reviewStep.result_summary = body.approved
        ? `Approved by advisor${body.feedback ? ` with feedback: "${body.feedback}"` : ''}`
        : `Rejected by advisor: "${body.feedback}"`
      reviewStep.actions = [body.approved ? 'Advisor approved the draft' : 'Advisor rejected the draft', ...(body.feedback ? [`Feedback: ${body.feedback}`] : [])]
    }

    run.status = RunStatus.RESUMING
    dynamicRuns.set(runId, { ...run })

    // Continue advancing
    setTimeout(() => {
      run.status = RunStatus.RUNNING
      dynamicRuns.set(runId, { ...run })

      const nextPending = run.steps.findIndex(s => s.status === 'pending')
      if (nextPending !== -1) {
        run.steps[nextPending].status = 'running'
        run.steps[nextPending].started_at = new Date().toISOString()
        dynamicRuns.set(runId, { ...run })
        const timer = setTimeout(() => advanceRun(runId), 2000)
        runTimers.set(runId, timer)
      } else {
        run.status = RunStatus.COMPLETE
        run.completed_at = new Date().toISOString()
        run.duration_ms = new Date(run.completed_at).getTime() - new Date(run.started_at!).getTime()
        dynamicRuns.set(runId, { ...run })
      }
    }, 1500)

    return HttpResponse.json({ run_id: runId, status: 'resuming' }, { status: 202 })
  }),

  // ── Daily Summaries ──────────────────────────────────────────────

  http.get('/api/daily-summaries', async () => {
    await delay(300)
    return HttpResponse.json(DAILY_SUMMARIES)
  }),

  // ── Meeting Briefs ───────────────────────────────────────────────

  http.get('/api/meeting-briefs/:meetingId', async ({ params }) => {
    await delay(300)
    const { meetingId } = params as { meetingId: string }
    const brief = getMeetingBriefById(meetingId)
    if (!brief) {
      return HttpResponse.json({ error: 'Meeting brief not found' }, { status: 404 })
    }
    return HttpResponse.json(brief)
  }),

  // ── Administration: Organization ─────────────────────────────────

  http.get('/api/admin/organization', async () => {
    await delay(300)
    return HttpResponse.json(orgProfile)
  }),

  http.put('/api/admin/organization', async ({ request }) => {
    await delay(400)
    const body = await request.json() as Partial<OrgProfile>
    Object.assign(orgProfile, body)
    return HttpResponse.json(orgProfile)
  }),

  // ── Administration: Branding ─────────────────────────────────────

  http.get('/api/admin/branding', async () => {
    await delay(300)
    return HttpResponse.json(orgBranding)
  }),

  http.put('/api/admin/branding', async ({ request }) => {
    await delay(400)
    const body = await request.json() as Partial<OrgBranding>
    Object.assign(orgBranding, body)
    return HttpResponse.json(orgBranding)
  }),

  // ── Administration: Preferences ──────────────────────────────────

  http.get('/api/admin/preferences', async () => {
    await delay(200)
    return HttpResponse.json(orgPreferences)
  }),

  http.put('/api/admin/preferences', async ({ request }) => {
    await delay(300)
    const body = await request.json() as Partial<OrgPreferences>
    Object.assign(orgPreferences, body)
    return HttpResponse.json(orgPreferences)
  }),

  // ── Administration: Users ────────────────────────────────────────

  http.get('/api/admin/users', async () => {
    await delay(300)
    return HttpResponse.json(users)
  }),

  http.get('/api/admin/users/:id', async ({ params }) => {
    await delay(200)
    const { id } = params as { id: string }
    const user = users.find(u => u.id === id)
    if (!user) return HttpResponse.json({ error: 'User not found' }, { status: 404 })
    return HttpResponse.json(user)
  }),

  http.put('/api/admin/users/:id', async ({ params, request }) => {
    await delay(400)
    const { id } = params as { id: string }
    const body = await request.json() as { status?: string; moduleRoles?: ModuleRoleAssignment[] }
    const idx = users.findIndex(u => u.id === id)
    if (idx === -1) return HttpResponse.json({ error: 'User not found' }, { status: 404 })
    if (body.status) users[idx].status = body.status as 'active' | 'invited' | 'suspended'
    if (body.moduleRoles) users[idx].moduleRoles = body.moduleRoles
    return HttpResponse.json(users[idx])
  }),

  http.delete('/api/admin/users/:id', async ({ params }) => {
    await delay(300)
    const { id } = params as { id: string }
    const idx = users.findIndex(u => u.id === id)
    if (idx === -1) return HttpResponse.json({ error: 'User not found' }, { status: 404 })
    users.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // ── Administration: Invitations ──────────────────────────────────

  http.get('/api/admin/invitations', async () => {
    await delay(200)
    return HttpResponse.json(invitations)
  }),

  http.post('/api/admin/invitations', async ({ request }) => {
    await delay(500)
    const body = await request.json() as InviteUserRequest
    const newInvitation = {
      id: `inv-${Date.now().toString(36)}`,
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      moduleRoles: body.moduleRoles,
      invitedBy: 'user-raoof',
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    }
    invitations.push(newInvitation)

    // Also add as an invited user
    users.push({
      id: `user-${Date.now().toString(36)}`,
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      title: null,
      phone: null,
      avatarUrl: null,
      status: 'invited',
      moduleRoles: body.moduleRoles,
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
    })

    return HttpResponse.json(newInvitation, { status: 201 })
  }),

  http.delete('/api/admin/invitations/:id', async ({ params }) => {
    await delay(300)
    const { id } = params as { id: string }
    const idx = invitations.findIndex(inv => inv.id === id)
    if (idx === -1) return HttpResponse.json({ error: 'Invitation not found' }, { status: 404 })
    invitations.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // ── My Account ───────────────────────────────────────────────────

  http.get('/api/account/profile', async () => {
    await delay(200)
    const currentUser = users.find(u => u.id === 'user-raoof')
    if (!currentUser) return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    return HttpResponse.json({
      id: currentUser.id,
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      email: currentUser.email,
      title: currentUser.title,
      phone: currentUser.phone,
      managerName: 'Usman Ahmed',
      avatarUrl: currentUser.avatarUrl,
      address: { line: '123 Business Bay', city: 'Dubai', state: 'Dubai', country: 'UAE', zip: '00000' },
    })
  }),

  http.put('/api/account/profile', async ({ request }) => {
    await delay(400)
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json(body)
  }),

  http.put('/api/account/password', async () => {
    await delay(500)
    return HttpResponse.json({ success: true })
  }),

  // ── Deals: Investment Types ─────────────────────────────────────────

  http.get('/api/deals/settings/investment-types', async () => {
    await delay(300)
    return HttpResponse.json(investmentTypes)
  }),

  http.get('/api/deals/settings/investment-types/:id', async ({ params }) => {
    await delay(300)
    const { id } = params as { id: string }
    const item = investmentTypes.find(t => t.id === id)
    if (!item) return HttpResponse.json({ error: 'Investment type not found' }, { status: 404 })
    return HttpResponse.json(item)
  }),

  http.post('/api/deals/settings/investment-types', async ({ request }) => {
    await delay(400)
    const body = await request.json() as Partial<InvestmentType>
    const now = new Date().toISOString()
    const newItem: InvestmentType = {
      id: `invtype-${Date.now().toString(36)}`,
      name: body.name || 'Untitled',
      slug: body.slug || body.name?.toLowerCase().replace(/\s+/g, '-') || 'untitled',
      isSystem: false,
      sortOrder: body.sortOrder ?? investmentTypes.length + 1,
      snapshotConfig: body.snapshotConfig || { sections: [] },
      createdAt: now,
      updatedAt: now,
    }
    investmentTypes.push(newItem)
    return HttpResponse.json(newItem, { status: 201 })
  }),

  http.put('/api/deals/settings/investment-types/:id', async ({ params, request }) => {
    await delay(400)
    const { id } = params as { id: string }
    const body = await request.json() as Partial<InvestmentType>
    const idx = investmentTypes.findIndex(t => t.id === id)
    if (idx === -1) return HttpResponse.json({ error: 'Investment type not found' }, { status: 404 })
    investmentTypes[idx] = { ...investmentTypes[idx], ...body, updatedAt: new Date().toISOString() }
    return HttpResponse.json(investmentTypes[idx])
  }),

  http.delete('/api/deals/settings/investment-types/:id', async ({ params }) => {
    await delay(300)
    const { id } = params as { id: string }
    const idx = investmentTypes.findIndex(t => t.id === id)
    if (idx === -1) return HttpResponse.json({ error: 'Investment type not found' }, { status: 404 })
    investmentTypes.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // ── Deals: Document Templates ───────────────────────────────────────

  http.get('/api/deals/settings/templates', async ({ request }) => {
    await delay(300)
    const url = new URL(request.url)
    const investmentTypeId = url.searchParams.get('investmentTypeId')
    let result = documentTemplates
    if (investmentTypeId) {
      result = result.filter(t => t.investmentTypeId === investmentTypeId)
    }
    return HttpResponse.json(result)
  }),

  http.get('/api/deals/settings/templates/:id', async ({ params }) => {
    await delay(300)
    const { id } = params as { id: string }
    const item = documentTemplates.find(t => t.id === id)
    if (!item) return HttpResponse.json({ error: 'Template not found' }, { status: 404 })
    return HttpResponse.json(item)
  }),

  http.put('/api/deals/settings/templates/:id', async ({ params, request }) => {
    await delay(400)
    const { id } = params as { id: string }
    const body = await request.json() as Partial<DocumentTemplate>
    const idx = documentTemplates.findIndex(t => t.id === id)
    if (idx === -1) return HttpResponse.json({ error: 'Template not found' }, { status: 404 })
    documentTemplates[idx] = { ...documentTemplates[idx], ...body, updatedAt: new Date().toISOString() }
    return HttpResponse.json(documentTemplates[idx])
  }),

  // ── Deals: Mandates ─────────────────────────────────────────────────

  http.get('/api/deals/mandates', async ({ request }) => {
    await delay(300)
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    let result = mandates
    if (status) {
      result = result.filter(m => m.status === status)
    }
    return HttpResponse.json(result)
  }),

  http.post('/api/deals/mandates', async ({ request }) => {
    await delay(400)
    const body = await request.json() as Partial<Mandate>
    const now = new Date().toISOString()
    const newItem: Mandate = {
      id: `mandate-${Date.now().toString(36)}`,
      name: body.name || 'Untitled Mandate',
      status: body.status || 'draft',
      targetAllocation: body.targetAllocation ?? null,
      expectedReturn: body.expectedReturn || '',
      timeHorizon: body.timeHorizon || '',
      investmentTypes: body.investmentTypes || [],
      assetAllocation: body.assetAllocation ?? null,
      targetSectors: body.targetSectors || [],
      geographicFocus: body.geographicFocus || [],
      investmentCriteria: body.investmentCriteria || '',
      investmentConstraints: body.investmentConstraints || '',
      investmentStrategy: body.investmentStrategy || '',
      createdBy: 'user-raoof',
      createdAt: now,
      updatedAt: now,
    }
    mandates.push(newItem)
    return HttpResponse.json(newItem, { status: 201 })
  }),

  http.get('/api/deals/mandates/:id', async ({ params }) => {
    await delay(300)
    const { id } = params as { id: string }
    const item = mandates.find(m => m.id === id)
    if (!item) return HttpResponse.json({ error: 'Mandate not found' }, { status: 404 })
    return HttpResponse.json(item)
  }),

  http.put('/api/deals/mandates/:id', async ({ params, request }) => {
    await delay(400)
    const { id } = params as { id: string }
    const body = await request.json() as Partial<Mandate>
    const idx = mandates.findIndex(m => m.id === id)
    if (idx === -1) return HttpResponse.json({ error: 'Mandate not found' }, { status: 404 })
    mandates[idx] = { ...mandates[idx], ...body, updatedAt: new Date().toISOString() }
    return HttpResponse.json(mandates[idx])
  }),

  http.delete('/api/deals/mandates/:id', async ({ params }) => {
    await delay(300)
    const { id } = params as { id: string }
    const idx = mandates.findIndex(m => m.id === id)
    if (idx === -1) return HttpResponse.json({ error: 'Mandate not found' }, { status: 404 })
    mandates.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // ── Deals: Opportunities ────────────────────────────────────────────

  http.get('/api/deals/opportunities', async ({ request }) => {
    await delay(300)
    const url = new URL(request.url)
    const pipelineStatus = url.searchParams.get('pipelineStatus')
    const assignedTo = url.searchParams.get('assignedTo')
    let result = opportunities
    if (pipelineStatus) {
      result = result.filter(o => o.pipelineStatus === pipelineStatus)
    }
    if (assignedTo) {
      result = result.filter(o => o.assignedTo === assignedTo)
    }
    return HttpResponse.json(result)
  }),

  http.post('/api/deals/opportunities', async ({ request }) => {
    await delay(400)
    const body = await request.json() as Partial<Opportunity>
    const now = new Date().toISOString()
    const newItem: Opportunity = {
      id: `opp-${Date.now().toString(36)}`,
      name: body.name || 'Untitled Opportunity',
      investmentTypeId: body.investmentTypeId || '',
      investmentTypeName: body.investmentTypeName || '',
      pipelineStatus: body.pipelineStatus || 'new',
      assetManagerId: body.assetManagerId || '',
      assetManagerName: body.assetManagerName || '',
      assignedTo: body.assignedTo || 'user-raoof',
      snapshotData: body.snapshotData || {},
      snapshotCitations: body.snapshotCitations || {},
      sourceType: body.sourceType || 'manual',
      mandateFits: body.mandateFits || [],
      createdBy: 'user-raoof',
      createdAt: now,
      updatedAt: now,
    }
    opportunities.push(newItem)
    return HttpResponse.json(newItem, { status: 201 })
  }),

  http.get('/api/deals/opportunities/:id', async ({ params }) => {
    await delay(300)
    const { id } = params as { id: string }
    const item = opportunities.find(o => o.id === id)
    if (!item) return HttpResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    return HttpResponse.json(item)
  }),

  http.put('/api/deals/opportunities/:id', async ({ params, request }) => {
    await delay(400)
    const { id } = params as { id: string }
    const body = await request.json() as Partial<Opportunity>
    const idx = opportunities.findIndex(o => o.id === id)
    if (idx === -1) return HttpResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    opportunities[idx] = { ...opportunities[idx], ...body, updatedAt: new Date().toISOString() }
    return HttpResponse.json(opportunities[idx])
  }),

  http.delete('/api/deals/opportunities/:id', async ({ params }) => {
    await delay(300)
    const { id } = params as { id: string }
    const idx = opportunities.findIndex(o => o.id === id)
    if (idx === -1) return HttpResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    opportunities.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // ── Deals: Asset Managers ───────────────────────────────────────────

  http.get('/api/deals/asset-managers', async ({ request }) => {
    await delay(300)
    const url = new URL(request.url)
    const type = url.searchParams.get('type')
    let result = assetManagers
    if (type) {
      result = result.filter(am => am.type === type)
    }
    return HttpResponse.json(result)
  }),

  http.post('/api/deals/asset-managers', async ({ request }) => {
    await delay(400)
    const body = await request.json() as Partial<AssetManager>
    const now = new Date().toISOString()
    const newItem: AssetManager = {
      id: `am-${Date.now().toString(36)}`,
      name: body.name || 'Untitled Manager',
      type: body.type ?? null,
      location: body.location ?? null,
      description: body.description ?? null,
      fundInfo: body.fundInfo || {},
      firmInfo: body.firmInfo || {},
      strategy: body.strategy || {},
      characteristics: body.characteristics || {},
      createdByType: 'manual',
      createdAt: now,
      updatedAt: now,
    }
    assetManagers.push(newItem)
    return HttpResponse.json(newItem, { status: 201 })
  }),

  http.get('/api/deals/asset-managers/:id', async ({ params }) => {
    await delay(300)
    const { id } = params as { id: string }
    const item = assetManagers.find(am => am.id === id)
    if (!item) return HttpResponse.json({ error: 'Asset manager not found' }, { status: 404 })
    return HttpResponse.json(item)
  }),

  http.put('/api/deals/asset-managers/:id', async ({ params, request }) => {
    await delay(400)
    const { id } = params as { id: string }
    const body = await request.json() as Partial<AssetManager>
    const idx = assetManagers.findIndex(am => am.id === id)
    if (idx === -1) return HttpResponse.json({ error: 'Asset manager not found' }, { status: 404 })
    assetManagers[idx] = { ...assetManagers[idx], ...body, updatedAt: new Date().toISOString() }
    return HttpResponse.json(assetManagers[idx])
  }),

  http.delete('/api/deals/asset-managers/:id', async ({ params }) => {
    await delay(300)
    const { id } = params as { id: string }
    const idx = assetManagers.findIndex(am => am.id === id)
    if (idx === -1) return HttpResponse.json({ error: 'Asset manager not found' }, { status: 404 })
    assetManagers.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // ── Deals: News ─────────────────────────────────────────────────────

  http.get('/api/deals/news', async ({ request }) => {
    await delay(300)
    const url = new URL(request.url)
    const category = url.searchParams.get('category')
    let result = newsItems
    if (category) {
      result = result.filter(n => n.category === category)
    }
    return HttpResponse.json(result)
  }),

  // ── Deals: Dashboard ────────────────────────────────────────────────

  http.get('/api/deals/dashboard/summary', async () => {
    await delay(300)
    return HttpResponse.json(dashboardSummary)
  }),

  // ── Deals: Workspace Documents ──────────────────────────────────────

  http.get('/api/deals/opportunities/:oppId/documents', async ({ params }) => {
    await delay(300)
    const { oppId } = params as { oppId: string }
    const result = documents.filter(d => d.opportunityId === oppId)
    return HttpResponse.json(result)
  }),

  http.post('/api/deals/opportunities/:oppId/documents', async ({ params, request }) => {
    await delay(400)
    const { oppId } = params as { oppId: string }
    const body = await request.json() as Partial<WorkspaceDocument>
    const now = new Date().toISOString()
    const newDoc: WorkspaceDocument = {
      id: `doc-${Date.now().toString(36)}`,
      opportunityId: oppId as string,
      templateId: body.templateId || '',
      templateName: body.templateName || '',
      title: body.title || 'Untitled Document',
      content: body.content || '',
      status: 'draft',
      createdBy: 'user-raoof',
      createdAt: now,
      updatedAt: now,
    }
    documents.push(newDoc)
    return HttpResponse.json(newDoc, { status: 201 })
  }),

  http.get('/api/deals/opportunities/:oppId/documents/:docId', async ({ params }) => {
    await delay(300)
    const { oppId, docId } = params as { oppId: string; docId: string }
    const doc = documents.find(d => d.id === docId && d.opportunityId === oppId)
    if (!doc) return HttpResponse.json({ error: 'Document not found' }, { status: 404 })
    return HttpResponse.json(doc)
  }),

  http.put('/api/deals/opportunities/:oppId/documents/:docId', async ({ params, request }) => {
    await delay(400)
    const { oppId, docId } = params as { oppId: string; docId: string }
    const body = await request.json() as Partial<WorkspaceDocument>
    const idx = documents.findIndex(d => d.id === docId && d.opportunityId === oppId)
    if (idx === -1) return HttpResponse.json({ error: 'Document not found' }, { status: 404 })
    documents[idx] = { ...documents[idx], ...body, updatedAt: new Date().toISOString() }
    return HttpResponse.json(documents[idx])
  }),

  http.delete('/api/deals/opportunities/:oppId/documents/:docId', async ({ params }) => {
    await delay(300)
    const { oppId, docId } = params as { oppId: string; docId: string }
    const idx = documents.findIndex(d => d.id === docId && d.opportunityId === oppId)
    if (idx === -1) return HttpResponse.json({ error: 'Document not found' }, { status: 404 })
    documents.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // ── Deals: Reviews ──────────────────────────────────────────────────

  http.get('/api/deals/reviews', async () => {
    await delay(300)
    return HttpResponse.json(reviews)
  }),

  http.post('/api/deals/reviews', async ({ request }) => {
    await delay(400)
    const body = await request.json() as { documentId: string; reviewerId: string }
    const now = new Date().toISOString()
    const newReview: DocumentReview = {
      id: `review-${Date.now().toString(36)}`,
      documentId: body.documentId,
      reviewerId: body.reviewerId,
      status: 'pending',
      comments: null,
      createdAt: now,
      updatedAt: now,
    }
    reviews.push(newReview)
    // Set the document status to in_review
    const docIdx = documents.findIndex(d => d.id === body.documentId)
    if (docIdx !== -1) {
      documents[docIdx].status = 'in_review'
      documents[docIdx].updatedAt = now
    }
    return HttpResponse.json(newReview, { status: 201 })
  }),

  http.put('/api/deals/reviews/:id', async ({ params, request }) => {
    await delay(400)
    const { id } = params as { id: string }
    const body = await request.json() as { status: 'approved' | 'changes_requested'; comments?: string }
    const idx = reviews.findIndex(r => r.id === id)
    if (idx === -1) return HttpResponse.json({ error: 'Review not found' }, { status: 404 })
    const now = new Date().toISOString()
    reviews[idx] = { ...reviews[idx], status: body.status, comments: body.comments ?? null, updatedAt: now }
    // Update the document status accordingly
    const docIdx = documents.findIndex(d => d.id === reviews[idx].documentId)
    if (docIdx !== -1) {
      documents[docIdx].status = body.status
      documents[docIdx].updatedAt = now
    }
    return HttpResponse.json(reviews[idx])
  }),

  // ── Deals: Shares ───────────────────────────────────────────────────

  http.get('/api/deals/documents/:docId/shares', async ({ params }) => {
    await delay(300)
    const { docId } = params as { docId: string }
    const result = shares.filter(s => s.documentId === docId)
    return HttpResponse.json(result)
  }),

  http.post('/api/deals/documents/:docId/share', async ({ params, request }) => {
    await delay(400)
    const { docId } = params as { docId: string }
    const body = await request.json() as { sharedWith: string; permission: 'view' | 'comment' | 'edit' }[]
    const now = new Date().toISOString()
    const newShares: DocumentShare[] = (Array.isArray(body) ? body : [body]).map(s => ({
      id: `share-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      documentId: docId as string,
      sharedWith: s.sharedWith,
      permission: s.permission,
      sharedBy: 'user-raoof',
      createdAt: now,
    }))
    shares.push(...newShares)
    return HttpResponse.json(newShares, { status: 201 })
  }),
]
