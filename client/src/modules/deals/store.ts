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

  // Workspace
  activeOpportunity: Opportunity | null
  workspaceDocuments: Document[]
  workspaceTabs: WorkspaceTab[]
  leftPanelTabId: string | null
  rightPanelTabId: string | null
  loadingWorkspace: boolean

  fetchWorkspace: (opportunityId: string) => Promise<void>
  addWorkspaceDocument: (doc: Document) => void
  updateWorkspaceDocument: (doc: Document) => void
  setLeftPanel: (tabId: string) => void
  setRightPanel: (tabId: string) => void
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

  // Workspace
  activeOpportunity: null,
  workspaceDocuments: [],
  workspaceTabs: [],
  leftPanelTabId: null,
  rightPanelTabId: null,
  loadingWorkspace: false,

  fetchWorkspace: async (opportunityId: string) => {
    set({ loadingWorkspace: true })
    try {
      const [opportunity, documents] = await Promise.all([
        dealsApi.getOpportunity(opportunityId),
        dealsApi.listDocuments(opportunityId),
      ])
      const tabs: WorkspaceTab[] = [
        { id: 'snapshot', type: 'snapshot' as const, label: 'Snapshot' },
        ...documents.map((d: Document) => ({
          id: d.id,
          type: 'document' as const,
          label: d.name,
          documentId: d.id,
        })),
      ]
      set({
        activeOpportunity: opportunity,
        workspaceDocuments: documents,
        workspaceTabs: tabs,
        leftPanelTabId: 'snapshot',
        rightPanelTabId: documents[0]?.id ?? null,
      })
    } finally {
      set({ loadingWorkspace: false })
    }
  },

  addWorkspaceDocument: (doc: Document) => {
    const state = get()
    const newTab: WorkspaceTab = { id: doc.id, type: 'document', label: doc.name, documentId: doc.id }
    set({
      workspaceDocuments: [...state.workspaceDocuments, doc],
      workspaceTabs: [...state.workspaceTabs, newTab],
      rightPanelTabId: doc.id,
    })
  },

  updateWorkspaceDocument: (doc: Document) => {
    const state = get()
    set({
      workspaceDocuments: state.workspaceDocuments.map((d) => d.id === doc.id ? doc : d),
    })
  },

  setLeftPanel: (tabId: string) => set({ leftPanelTabId: tabId }),
  setRightPanel: (tabId: string) => set({ rightPanelTabId: tabId }),
}))
