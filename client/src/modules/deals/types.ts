// ── Investment Types ──

export type SnapshotFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'select'
  | 'multi-select'
  | 'boolean'

export interface SnapshotField {
  name: string
  type: SnapshotFieldType
  required: boolean
  instruction: string
  options?: string[]
}

export interface SnapshotSection {
  name: string
  sortOrder: number
  fields: SnapshotField[]
}

export interface SnapshotConfig {
  sections: SnapshotSection[]
}

export interface InvestmentType {
  id: string
  name: string
  slug: string
  isSystem: boolean
  sortOrder: number
  snapshotConfig: SnapshotConfig
  createdAt: string
  updatedAt: string
}

// ── Document Templates ──

export interface DocumentTemplate {
  id: string
  investmentTypeId: string
  name: string
  slug: string
  promptTemplate: string
  isSystem: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// ── Mandates ──

export interface AssetAllocationItem {
  assetClass: string
  allocationPct: number
  targetReturn: string
}

export type MandateStatus = 'draft' | 'active' | 'closed'

export interface Mandate {
  id: string
  name: string
  status: MandateStatus
  targetAllocation: number | null
  expectedReturn: string
  timeHorizon: string
  investmentTypes: string[]
  assetAllocation: AssetAllocationItem[] | null
  targetSectors: string[]
  geographicFocus: string[]
  investmentCriteria: string
  investmentConstraints: string
  investmentStrategy: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

// ── Opportunities ──

export type PipelineStatus = 'new' | 'active' | 'archived' | 'ignored'

export type FitScore = 'strong' | 'moderate' | 'weak'

export interface MandateFit {
  mandateId: string
  fitScore: FitScore
  reasoning: string
}

export interface Opportunity {
  id: string
  name: string
  investmentTypeId: string
  investmentTypeName: string
  pipelineStatus: PipelineStatus
  assetManagerId: string
  assetManagerName: string
  assignedTo: string
  snapshotData: Record<string, unknown>
  snapshotCitations: Record<string, string>
  sourceType: string
  mandateFits: MandateFit[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

// ── Asset Managers ──────────────────────────────────────────────────

export interface AssetManager {
  id: string
  name: string
  type: string | null
  location: string | null
  description: string | null
  fundInfo: Record<string, string>
  firmInfo: Record<string, string>
  strategy: Record<string, string>
  characteristics: Record<string, string>
  createdByType: 'system' | 'manual'
  createdAt: string
  updatedAt: string
}

// ── News ────────────────────────────────────────────────────────────

export type NewsCategory = 'market' | 'sector' | 'asset_manager' | 'regulatory'

export interface NewsItem {
  id: string
  headline: string
  summary: string | null
  fullContent: string | null
  category: NewsCategory | null
  sourceUrl: string | null
  linkedOpportunityIds: string[]
  generatedAt: string
  createdAt: string
}

// ── Dashboard ───────────────────────────────────────────────────────

export interface PipelineStatusCount {
  status: PipelineStatus
  count: number
}

export interface MandateAllocationSummary {
  mandateId: string
  mandateName: string
  targetAllocation: number | null
  currentAllocation: number
  opportunityCount: number
}

export interface DashboardSummary {
  pipelineCounts: PipelineStatusCount[]
  totalOpportunities: number
  mandateAllocations: MandateAllocationSummary[]
  recentNews: NewsItem[]
}

// ── Documents ───────────────────────────────────────────────────────

export type DocumentType = 'investment_memo' | 'pre_screening' | 'ddq' | 'news' | 'market_analysis' | 'custom'
export type DocumentStatus = 'draft' | 'in_review' | 'approved'

export interface Document {
  id: string
  opportunityId: string
  templateId: string | null
  name: string
  documentType: DocumentType
  content: string | null
  status: DocumentStatus
  version: number
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

// ── Document Reviews ────────────────────────────────────────────────

export type ReviewStatus = 'pending' | 'in_review' | 'approved' | 'changes_requested'

export interface ReviewDocumentItem {
  documentId: string
  documentName: string
  documentType: string
}

export interface DocumentReview {
  id: string
  reviewerId: string
  requestedBy: string
  status: ReviewStatus
  rationale: string | null
  rationaleGenerated: boolean
  requestedAt: string
  reviewedAt: string | null
  documents: ReviewDocumentItem[]
}

// ── Document Shares ─────────────────────────────────────────────────

export interface DocumentShare {
  id: string
  documentId: string
  sharedWith: string
  sharedBy: string
  permission: 'comment' | 'view'
  createdAt: string
}

// ── Source Files ────────────────────────────────────────────────────

export interface SourceFile {
  id: string
  opportunityId: string
  fileName: string
  fileUrl: string
  fileType: string | null
  fileSize: number | null
  processed: boolean
  sourceOrigin: string | null
  createdAt: string
}

// ── Workspace ───────────────────────────────────────────────────────

export type WorkspaceTabType = 'snapshot' | 'document'

export interface WorkspaceTab {
  id: string
  type: WorkspaceTabType
  label: string
  documentId?: string
}
