import { create } from 'zustand'
import { dealsApi } from './api'
import type {
  InvestmentType,
  DocumentTemplate,
  Mandate,
  MandateStatus,
  Opportunity,
  PipelineStatus,
  AssetManager,
  NewsItem,
  DashboardSummary,
  Document,
  WorkspaceTab,
  SourceFile,
  EmailAccount,
  SyncedEmail,
  GoogleDriveAccount,
  ApprovalRequest,
  ApprovalStage,
} from './types'

interface DealsState {
  // Data
  investmentTypes: InvestmentType[]
  templates: DocumentTemplate[]
  mandates: Mandate[]
  opportunities: Opportunity[]
  pipelineFilter: PipelineStatus | null

  // Loading flags
  loadingInvestmentTypes: boolean
  loadingTemplates: boolean
  loadingMandates: boolean
  loadingOpportunities: boolean

  // Actions
  fetchInvestmentTypes: () => Promise<void>
  fetchTemplates: (investmentTypeId?: string) => Promise<void>
  fetchMandates: (status?: MandateStatus) => Promise<void>
  fetchOpportunities: (filters?: { pipelineStatus?: PipelineStatus; assignedTo?: string }) => Promise<void>
  setPipelineFilter: (status: PipelineStatus | null) => void

  assetManagers: AssetManager[]
  loadingAssetManagers: boolean
  newsItems: NewsItem[]
  loadingNews: boolean
  dashboardSummary: DashboardSummary | null
  loadingDashboard: boolean

  fetchAssetManagers: (type?: string) => Promise<void>
  fetchNews: (category?: string) => Promise<void>
  fetchDashboardSummary: () => Promise<void>

  // Email & Drive
  emailAccounts: EmailAccount[]
  syncedEmails: SyncedEmail[]
  selectedEmail: SyncedEmail | null
  loadingEmails: boolean
  googleDriveAccounts: GoogleDriveAccount[]
  loadingDrive: boolean

  fetchEmailAccounts: () => Promise<void>
  fetchEmails: (filters?: { accountId?: string; importStatus?: string; search?: string }) => Promise<void>
  selectEmail: (email: SyncedEmail | null) => void
  fetchGoogleDriveAccounts: () => Promise<void>

  // Workspace
  activeOpportunity: Opportunity | null
  workspaceDocuments: Document[]
  workspaceSourceFiles: SourceFile[]
  workspaceApprovals: ApprovalRequest[]
  workspaceTabs: WorkspaceTab[]
  activeTabId: string | null
  sidebarCollapsed: boolean
  loadingWorkspace: boolean

  fetchWorkspace: (opportunityId: string) => Promise<void>
  addWorkspaceDocument: (doc: Document) => void
  updateWorkspaceDocument: (doc: Document) => void
  openTab: (tab: WorkspaceTab) => void
  closeTab: (tabId: string) => void
  toggleSidebar: () => void
  advanceApprovalStage: (newStage: ApprovalStage) => void
}

export const useDealsStore = create<DealsState>((set, get) => ({
  investmentTypes: [],
  templates: [],
  mandates: [],
  opportunities: [],
  pipelineFilter: null,

  loadingInvestmentTypes: false,
  loadingTemplates: false,
  loadingMandates: false,
  loadingOpportunities: false,

  fetchInvestmentTypes: async () => {
    set({ loadingInvestmentTypes: true })
    try {
      const investmentTypes = await dealsApi.listInvestmentTypes()
      set({ investmentTypes })
    } finally {
      set({ loadingInvestmentTypes: false })
    }
  },

  fetchTemplates: async (investmentTypeId?: string) => {
    set({ loadingTemplates: true })
    try {
      const templates = await dealsApi.listTemplates(investmentTypeId)
      set({ templates })
    } finally {
      set({ loadingTemplates: false })
    }
  },

  fetchMandates: async (status?: MandateStatus) => {
    set({ loadingMandates: true })
    try {
      const mandates = await dealsApi.listMandates(status)
      set({ mandates })
    } finally {
      set({ loadingMandates: false })
    }
  },

  fetchOpportunities: async (filters?: { pipelineStatus?: PipelineStatus; assignedTo?: string }) => {
    set({ loadingOpportunities: true })
    try {
      const opportunities = await dealsApi.listOpportunities(filters)
      set({ opportunities })
    } finally {
      set({ loadingOpportunities: false })
    }
  },

  setPipelineFilter: (status) => set({ pipelineFilter: status }),

  assetManagers: [],
  loadingAssetManagers: false,
  newsItems: [],
  loadingNews: false,
  dashboardSummary: null,
  loadingDashboard: false,

  fetchAssetManagers: async (type?: string) => {
    set({ loadingAssetManagers: true })
    try {
      const assetManagers = await dealsApi.listAssetManagers(type)
      set({ assetManagers })
    } finally {
      set({ loadingAssetManagers: false })
    }
  },

  fetchNews: async (category?: string) => {
    set({ loadingNews: true })
    try {
      const newsItems = await dealsApi.listNews(category)
      set({ newsItems })
    } finally {
      set({ loadingNews: false })
    }
  },

  fetchDashboardSummary: async () => {
    set({ loadingDashboard: true })
    try {
      const dashboardSummary = await dealsApi.getDashboardSummary()
      set({ dashboardSummary })
    } finally {
      set({ loadingDashboard: false })
    }
  },

  // Email & Drive
  emailAccounts: [],
  syncedEmails: [],
  selectedEmail: null,
  loadingEmails: false,
  googleDriveAccounts: [],
  loadingDrive: false,

  fetchEmailAccounts: async () => {
    try {
      const emailAccounts = await dealsApi.listEmailAccounts()
      set({ emailAccounts })
    } catch { /* ignore */ }
  },

  fetchEmails: async (filters) => {
    set({ loadingEmails: true })
    try {
      const syncedEmails = await dealsApi.listEmails(filters)
      set({ syncedEmails })
    } finally {
      set({ loadingEmails: false })
    }
  },

  selectEmail: (email) => set({ selectedEmail: email }),

  fetchGoogleDriveAccounts: async () => {
    set({ loadingDrive: true })
    try {
      const googleDriveAccounts = await dealsApi.listGoogleDriveAccounts()
      set({ googleDriveAccounts })
    } finally {
      set({ loadingDrive: false })
    }
  },

  // Workspace
  activeOpportunity: null,
  workspaceDocuments: [],
  workspaceSourceFiles: [],
  workspaceApprovals: [],
  workspaceTabs: [],
  activeTabId: null,
  sidebarCollapsed: false,
  loadingWorkspace: false,

  fetchWorkspace: async (opportunityId: string) => {
    set({ loadingWorkspace: true })
    try {
      const [opportunity, documents, sourceFiles, approvals] = await Promise.all([
        dealsApi.getOpportunity(opportunityId),
        dealsApi.listDocuments(opportunityId),
        dealsApi.listSourceFiles(opportunityId),
        dealsApi.listApprovals(opportunityId),
      ])
      const tabs: WorkspaceTab[] = [
        { id: 'snapshot', type: 'snapshot' as const, label: 'Snapshot' },
        ...documents.map((d: Document) => ({
          id: d.id,
          type: (d.documentType === 'note' ? 'note' : 'document') as 'note' | 'document',
          label: d.name,
          documentId: d.id,
          closeable: true,
        })),
      ]
      set({
        activeOpportunity: opportunity,
        workspaceDocuments: documents,
        workspaceSourceFiles: sourceFiles,
        workspaceApprovals: approvals,
        workspaceTabs: tabs,
        activeTabId: 'snapshot',
      })
    } finally {
      set({ loadingWorkspace: false })
    }
  },

  addWorkspaceDocument: (doc: Document) => {
    const state = get()
    const tabType = doc.documentType === 'note' ? 'note' as const : 'document' as const
    const newTab: WorkspaceTab = { id: doc.id, type: tabType, label: doc.name, documentId: doc.id, closeable: true }
    set({
      workspaceDocuments: [...state.workspaceDocuments, doc],
      workspaceTabs: [...state.workspaceTabs, newTab],
      activeTabId: doc.id,
    })
  },

  updateWorkspaceDocument: (doc: Document) => {
    const state = get()
    set({
      workspaceDocuments: state.workspaceDocuments.map((d) => d.id === doc.id ? doc : d),
    })
  },

  openTab: (tab: WorkspaceTab) => {
    const state = get()
    const exists = state.workspaceTabs.some((t) => t.id === tab.id)
    if (exists) {
      set({ activeTabId: tab.id })
    } else {
      set({
        workspaceTabs: [...state.workspaceTabs, tab],
        activeTabId: tab.id,
      })
    }
  },

  closeTab: (tabId: string) => {
    const state = get()
    const idx = state.workspaceTabs.findIndex((t) => t.id === tabId)
    if (idx === -1) return
    const newTabs = state.workspaceTabs.filter((t) => t.id !== tabId)
    let newActiveTabId = state.activeTabId
    if (state.activeTabId === tabId) {
      // Activate adjacent tab: prefer the one after, then before, then null
      const adjacentTab = newTabs[idx] ?? newTabs[idx - 1] ?? null
      newActiveTabId = adjacentTab?.id ?? null
    }
    set({ workspaceTabs: newTabs, activeTabId: newActiveTabId })
  },

  toggleSidebar: () => {
    set({ sidebarCollapsed: !get().sidebarCollapsed })
  },

  advanceApprovalStage: (newStage: ApprovalStage) => {
    const opp = get().activeOpportunity
    if (opp) {
      set({ activeOpportunity: { ...opp, approvalStage: newStage } })
    }
  },
}))
