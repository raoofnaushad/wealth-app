import { api } from '@/api/client'
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
  SourceFile,
  DocumentReview,
  DocumentShare,
  EmailAccount,
  SyncedEmail,
  GoogleDriveAccount,
  DriveFolder,
  GoogleDriveImportJob,
  TeamMember,
  ApprovalRequest,
  ApprovalStage,
  DealEvent,
  DealTask,
  DealNotification,
  GoogleCalendarAccount,
  DocumentComment,
  TaskStatus,
  TaskPriority,
} from './types'

export const dealsApi = {
  // Investment Types
  listInvestmentTypes: () => api.get<InvestmentType[]>('/deals/settings/investment-types'),
  getInvestmentType: (id: string) => api.get<InvestmentType>(`/deals/settings/investment-types/${id}`),
  createInvestmentType: (data: Partial<InvestmentType>) =>
    api.post<InvestmentType>('/deals/settings/investment-types', data),
  updateInvestmentType: (id: string, data: Partial<InvestmentType>) =>
    api.put<InvestmentType>(`/deals/settings/investment-types/${id}`, data),
  deleteInvestmentType: (id: string) => api.delete<void>(`/deals/settings/investment-types/${id}`),

  // Document Templates
  listTemplates: (investmentTypeId?: string) => {
    const params = investmentTypeId ? `?investmentTypeId=${investmentTypeId}` : ''
    return api.get<DocumentTemplate[]>(`/deals/settings/templates${params}`)
  },
  getTemplate: (id: string) => api.get<DocumentTemplate>(`/deals/settings/templates/${id}`),
  updateTemplate: (id: string, data: Partial<DocumentTemplate>) =>
    api.put<DocumentTemplate>(`/deals/settings/templates/${id}`, data),

  // Mandates
  listMandates: (status?: MandateStatus) => {
    const params = status ? `?status=${status}` : ''
    return api.get<Mandate[]>(`/deals/mandates${params}`)
  },
  getMandate: (id: string) => api.get<Mandate>(`/deals/mandates/${id}`),
  createMandate: (data: Partial<Mandate>) => api.post<Mandate>('/deals/mandates', data),
  updateMandate: (id: string, data: Partial<Mandate>) =>
    api.put<Mandate>(`/deals/mandates/${id}`, data),
  deleteMandate: (id: string) => api.delete<void>(`/deals/mandates/${id}`),

  // Opportunities
  listOpportunities: (filters?: { pipelineStatus?: PipelineStatus; assignedTo?: string }) => {
    const params = new URLSearchParams()
    if (filters?.pipelineStatus) params.set('pipelineStatus', filters.pipelineStatus)
    if (filters?.assignedTo) params.set('assignedTo', filters.assignedTo)
    const qs = params.toString()
    return api.get<Opportunity[]>(`/deals/opportunities${qs ? `?${qs}` : ''}`)
  },
  getOpportunity: (id: string) => api.get<Opportunity>(`/deals/opportunities/${id}`),
  createOpportunity: (data: Partial<Opportunity>) =>
    api.post<Opportunity>('/deals/opportunities', data),
  updateOpportunity: (id: string, data: Partial<Opportunity>) =>
    api.put<Opportunity>(`/deals/opportunities/${id}`, data),
  deleteOpportunity: (id: string) => api.delete<void>(`/deals/opportunities/${id}`),

  // Asset Managers
  listAssetManagers: (type?: string) => {
    const params = type ? `?type=${type}` : ''
    return api.get<AssetManager[]>(`/deals/asset-managers${params}`)
  },
  getAssetManager: (id: string) => api.get<AssetManager>(`/deals/asset-managers/${id}`),
  createAssetManager: (data: { name: string; type?: string; location?: string; description?: string; fundInfo?: Record<string, string>; firmInfo?: Record<string, string>; strategy?: Record<string, string> }) =>
    api.post<AssetManager>('/deals/asset-managers', data),
  updateAssetManager: (id: string, data: Partial<AssetManager>) =>
    api.put<AssetManager>(`/deals/asset-managers/${id}`, data),
  deleteAssetManager: (id: string) => api.delete<void>(`/deals/asset-managers/${id}`),

  // News
  listNews: (category?: string) => {
    const params = category ? `?category=${category}` : ''
    return api.get<NewsItem[]>(`/deals/news${params}`)
  },

  // Dashboard
  getDashboardSummary: () => api.get<DashboardSummary>('/deals/dashboard/summary'),

  // Documents
  listDocuments: (opportunityId: string) =>
    api.get<Document[]>(`/deals/opportunities/${opportunityId}/documents`),
  createDocument: (opportunityId: string, data: { name: string; documentType: string; templateId?: string; content?: string }) =>
    api.post<Document>(`/deals/opportunities/${opportunityId}/documents`, data),
  getDocument: (opportunityId: string, docId: string) =>
    api.get<Document>(`/deals/opportunities/${opportunityId}/documents/${docId}`),
  updateDocument: (opportunityId: string, docId: string, data: { name?: string; content?: string; status?: string }) =>
    api.put<Document>(`/deals/opportunities/${opportunityId}/documents/${docId}`, data),
  deleteDocument: (opportunityId: string, docId: string) =>
    api.delete<void>(`/deals/opportunities/${opportunityId}/documents/${docId}`),

  // Source Files
  listSourceFiles: (opportunityId: string) =>
    api.get<SourceFile[]>(`/deals/opportunities/${opportunityId}/files`),
  uploadSourceFile: async (opportunityId: string, file: File): Promise<SourceFile> => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`/api/deals/opportunities/${opportunityId}/files`, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) throw new Error('Upload failed')
    return res.json()
  },

  // Team Members
  listTeamMembers: () => api.get<TeamMember[]>('/deals/team-members'),

  // Reviews
  listReviews: (filters?: { reviewerId?: string; requestedBy?: string; status?: string }) => {
    const params = new URLSearchParams()
    if (filters?.reviewerId) params.set('reviewerId', filters.reviewerId)
    if (filters?.requestedBy) params.set('requestedBy', filters.requestedBy)
    if (filters?.status) params.set('status', filters.status)
    const qs = params.toString()
    return api.get<DocumentReview[]>(`/deals/reviews${qs ? `?${qs}` : ''}`)
  },
  createReview: (data: { reviewerId: string; documentIds: string[] }) =>
    api.post<DocumentReview>('/deals/reviews', data),
  updateReview: (reviewId: string, data: { status: string; rationale?: string }) =>
    api.put<DocumentReview>(`/deals/reviews/${reviewId}`, data),

  // Approvals (opportunity-level)
  listApprovals: (opportunityId: string) =>
    api.get<ApprovalRequest[]>(`/deals/opportunities/${opportunityId}/approvals`),
  submitForApproval: (opportunityId: string, data: {
    stage: ApprovalStage
    reviewerIds: string[]
    documentIds: string[]
  }) =>
    api.post<ApprovalRequest[]>(`/deals/opportunities/${opportunityId}/approvals`, data),
  updateApproval: (opportunityId: string, approvalId: string, data: {
    status: string
    rationale?: string
  }) =>
    api.put<ApprovalRequest>(`/deals/opportunities/${opportunityId}/approvals/${approvalId}`, data),

  // Shares
  listShares: (docId: string) => api.get<DocumentShare[]>(`/deals/documents/${docId}/shares`),
  shareDocument: (docId: string, data: { sharedWith: string[]; permission?: string }) =>
    api.post<DocumentShare[]>(`/deals/documents/${docId}/share`, data),
  removeShare: (docId: string, shareId: string) =>
    api.delete<void>(`/deals/documents/${docId}/shares/${shareId}`),

  // Email Accounts
  listEmailAccounts: () => api.get<EmailAccount[]>('/deals/email/accounts'),
  connectEmailAccount: (data: { provider?: string; emailAddress: string }) =>
    api.post<EmailAccount>('/deals/email/accounts', data),
  disconnectEmailAccount: (id: string) => api.delete<void>(`/deals/email/accounts/${id}`),
  triggerEmailSync: (id: string) => api.post<EmailAccount>(`/deals/email/accounts/${id}/sync`, {}),

  // Synced Emails
  listEmails: (filters?: { accountId?: string; importStatus?: string; hasAttachments?: boolean; search?: string }) => {
    const params = new URLSearchParams()
    if (filters?.accountId) params.set('accountId', filters.accountId)
    if (filters?.importStatus) params.set('importStatus', filters.importStatus)
    if (filters?.hasAttachments !== undefined) params.set('hasAttachments', String(filters.hasAttachments))
    if (filters?.search) params.set('search', filters.search)
    const qs = params.toString()
    return api.get<SyncedEmail[]>(`/deals/emails${qs ? `?${qs}` : ''}`)
  },
  getEmail: (id: string) => api.get<SyncedEmail>(`/deals/emails/${id}`),
  importEmail: (id: string, data: { investmentTypeId: string }) =>
    api.post<Opportunity>(`/deals/emails/${id}/import`, data),
  ignoreEmail: (id: string) => api.put<void>(`/deals/emails/${id}/ignore`, {}),

  // Google Drive
  listGoogleDriveAccounts: () => api.get<GoogleDriveAccount[]>('/deals/integrations/google-drive'),
  connectGoogleDrive: (data: { emailAddress?: string }) =>
    api.post<GoogleDriveAccount>('/deals/integrations/google-drive', data),
  disconnectGoogleDrive: (id: string) =>
    api.delete<void>(`/deals/integrations/google-drive/${id}`),
  browseGoogleDrive: (accountId: string, parentFolderId?: string) => {
    const params = new URLSearchParams({ accountId })
    if (parentFolderId) params.set('parentFolderId', parentFolderId)
    return api.get<{ folders: DriveFolder[] }>(`/deals/integrations/google-drive/browse?${params}`)
  },
  startGoogleDriveImport: (accountId: string, data: { folderIds: string[] }) =>
    api.post<GoogleDriveImportJob>(`/deals/integrations/google-drive/import?accountId=${accountId}`, data),
  getImportJob: (jobId: string) =>
    api.get<GoogleDriveImportJob>(`/deals/integrations/google-drive/import/${jobId}`),

  // Events
  listEvents: (filters?: { opportunityId?: string; mandateId?: string; from?: string; to?: string }) => {
    const params = new URLSearchParams()
    if (filters?.opportunityId) params.set('opportunityId', filters.opportunityId)
    if (filters?.mandateId) params.set('mandateId', filters.mandateId)
    if (filters?.from) params.set('from', filters.from)
    if (filters?.to) params.set('to', filters.to)
    const qs = params.toString()
    return api.get<DealEvent[]>(`/deals/events${qs ? `?${qs}` : ''}`)
  },
  createEvent: (data: Partial<DealEvent>) => api.post<DealEvent>('/deals/events', data),
  updateEvent: (id: string, data: Partial<DealEvent>) =>
    api.put<DealEvent>(`/deals/events/${id}`, data),
  deleteEvent: (id: string) => api.delete<void>(`/deals/events/${id}`),

  // Tasks
  listTasks: (filters?: { assigneeId?: string; status?: TaskStatus; priority?: TaskPriority; opportunityId?: string }) => {
    const params = new URLSearchParams()
    if (filters?.assigneeId) params.set('assigneeId', filters.assigneeId)
    if (filters?.status) params.set('status', filters.status)
    if (filters?.priority) params.set('priority', filters.priority)
    if (filters?.opportunityId) params.set('opportunityId', filters.opportunityId)
    const qs = params.toString()
    return api.get<DealTask[]>(`/deals/tasks${qs ? `?${qs}` : ''}`)
  },
  createTask: (data: Partial<DealTask>) => api.post<DealTask>('/deals/tasks', data),
  updateTask: (id: string, data: Partial<DealTask>) =>
    api.put<DealTask>(`/deals/tasks/${id}`, data),
  deleteTask: (id: string) => api.delete<void>(`/deals/tasks/${id}`),

  // Notifications
  listNotifications: () => api.get<DealNotification[]>('/deals/notifications'),
  markNotificationRead: (id: string) =>
    api.put<DealNotification>(`/deals/notifications/${id}/read`, {}),

  // Google Calendar
  listCalendarAccounts: () =>
    api.get<GoogleCalendarAccount[]>('/deals/integrations/google-calendar'),
  connectCalendar: (data: { emailAddress?: string }) =>
    api.post<GoogleCalendarAccount>('/deals/integrations/google-calendar', data),
  disconnectCalendar: (id: string) =>
    api.delete<void>(`/deals/integrations/google-calendar/${id}`),

  // Comments
  listComments: (opportunityId: string) =>
    api.get<DocumentComment[]>(`/deals/opportunities/${opportunityId}/comments`),
  createComment: (opportunityId: string, data: { documentId?: string; sectionHeading?: string; content: string; parentId?: string }) =>
    api.post<DocumentComment>(`/deals/opportunities/${opportunityId}/comments`, data),

  // Export
  exportOpportunity: (opportunityId: string, data: { format: 'pdf' | 'docx' }) =>
    api.post<{ url: string }>(`/deals/opportunities/${opportunityId}/export`, data),

  // Unignore email
  unignoreEmail: (id: string) => api.put<SyncedEmail>(`/deals/emails/${id}/unignore`, {}),

  // Dashboard — team activity
  getTeamActivity: () =>
    api.get<{ userId: string; userName: string; actions: number; lastActive: string }[]>('/deals/dashboard/team-activity'),

  // Mandate matched opportunities
  getMandateMatches: (mandateId: string) =>
    api.get<(Opportunity & { matchScore: number })[]>(`/deals/mandates/${mandateId}/matches`),

  // Template CRUD (create & delete — update already exists)
  createTemplate: (data: Partial<DocumentTemplate>) =>
    api.post<DocumentTemplate>('/deals/settings/templates', data),
  deleteTemplate: (id: string) =>
    api.delete<void>(`/deals/settings/templates/${id}`),
}
