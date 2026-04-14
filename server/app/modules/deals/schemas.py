import uuid
from datetime import datetime

from pydantic import BaseModel, Field


# --- Snapshot Config (nested in InvestmentType) ---
class SnapshotFieldSchema(BaseModel):
    name: str
    type: str
    required: bool = False
    instruction: str | None = None
    options: list[str] | None = None


class SnapshotSectionSchema(BaseModel):
    name: str
    sortOrder: int = 0
    fields: list[SnapshotFieldSchema]


class SnapshotConfigSchema(BaseModel):
    sections: list[SnapshotSectionSchema]


# --- Investment Types ---
class InvestmentTypeResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    isSystem: bool
    sortOrder: int
    snapshotConfig: dict
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True


class InvestmentTypeCreate(BaseModel):
    name: str
    slug: str
    snapshotConfig: dict


class InvestmentTypeUpdate(BaseModel):
    name: str | None = None
    snapshotConfig: dict | None = None
    sortOrder: int | None = None


# --- Document Templates ---
class DocumentTemplateResponse(BaseModel):
    id: uuid.UUID
    investmentTypeId: uuid.UUID
    name: str
    slug: str
    promptTemplate: str
    isSystem: bool
    sortOrder: int
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True


class DocumentTemplateUpdate(BaseModel):
    promptTemplate: str


# --- Mandates ---
class AssetAllocationItem(BaseModel):
    assetClass: str
    allocationPct: float
    targetReturn: str | None = None


class MandateResponse(BaseModel):
    id: uuid.UUID
    name: str
    status: str
    targetAllocation: float | None = None
    expectedReturn: str | None = None
    timeHorizon: str | None = None
    investmentTypes: list[str] | None = None
    assetAllocation: dict | None = None
    targetSectors: list[str] | None = None
    geographicFocus: list[str] | None = None
    investmentCriteria: str | None = None
    investmentConstraints: str | None = None
    investmentStrategy: str | None = None
    createdBy: uuid.UUID | None = None
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True


class MandateCreate(BaseModel):
    name: str
    status: str | None = None
    targetAllocation: float | None = None
    expectedReturn: str | None = None
    timeHorizon: str | None = None
    investmentTypes: list[str] | None = None
    assetAllocation: dict | None = None
    targetSectors: list[str] | None = None
    geographicFocus: list[str] | None = None
    investmentCriteria: str | None = None
    investmentConstraints: str | None = None
    investmentStrategy: str | None = None


class MandateUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    targetAllocation: float | None = None
    expectedReturn: str | None = None
    timeHorizon: str | None = None
    investmentTypes: list[str] | None = None
    assetAllocation: dict | None = None
    targetSectors: list[str] | None = None
    geographicFocus: list[str] | None = None
    investmentCriteria: str | None = None
    investmentConstraints: str | None = None
    investmentStrategy: str | None = None


# --- Opportunities ---
class MandateFitSchema(BaseModel):
    mandateId: uuid.UUID
    fitScore: float
    reasoning: str | None = None


class OpportunityResponse(BaseModel):
    id: uuid.UUID
    name: str
    investmentTypeId: uuid.UUID | None = None
    investmentTypeName: str | None = None
    pipelineStatus: str
    assetManagerId: uuid.UUID | None = None
    assetManagerName: str | None = None
    assignedTo: uuid.UUID | None = None
    snapshotData: dict
    snapshotCitations: dict
    sourceType: str
    mandateFits: list
    createdBy: uuid.UUID | None = None
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True


class OpportunityCreate(BaseModel):
    name: str
    investmentTypeId: uuid.UUID | None = None
    assetManagerId: uuid.UUID | None = None
    snapshotData: dict | None = None
    sourceType: str | None = None


class OpportunityUpdate(BaseModel):
    name: str | None = None
    investmentTypeId: uuid.UUID | None = None
    pipelineStatus: str | None = None
    assetManagerId: uuid.UUID | None = None
    assignedTo: uuid.UUID | None = None
    snapshotData: dict | None = None


# --- Asset Managers ---
class AssetManagerResponse(BaseModel):
    id: uuid.UUID
    name: str
    type: str | None = None
    location: str | None = None
    description: str | None = None
    fundInfo: dict
    firmInfo: dict
    strategy: dict
    characteristics: dict
    createdByType: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True


class AssetManagerCreate(BaseModel):
    name: str
    type: str | None = None
    location: str | None = None
    description: str | None = None
    fundInfo: dict = {}
    firmInfo: dict = {}
    strategy: dict = {}
    characteristics: dict = {}


class AssetManagerUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    location: str | None = None
    description: str | None = None
    fundInfo: dict | None = None
    firmInfo: dict | None = None
    strategy: dict | None = None
    characteristics: dict | None = None


# --- News ---
class NewsItemResponse(BaseModel):
    id: uuid.UUID
    headline: str
    summary: str | None = None
    fullContent: str | None = None
    category: str | None = None
    sourceUrl: str | None = None
    linkedOpportunityIds: list[str]
    generatedAt: datetime
    createdAt: datetime

    class Config:
        from_attributes = True


# --- Dashboard ---
class PipelineStatusCount(BaseModel):
    status: str
    count: int


class MandateAllocationSummary(BaseModel):
    mandateId: uuid.UUID
    mandateName: str
    targetAllocation: float | None = None
    currentAllocation: float | None = None
    opportunityCount: int


class DashboardSummaryResponse(BaseModel):
    pipelineCounts: list[PipelineStatusCount]
    totalOpportunities: int
    mandateAllocations: list[MandateAllocationSummary]
    recentNews: list[NewsItemResponse]


# --- Documents ---
class DocumentResponse(BaseModel):
    id: str
    opportunityId: str
    templateId: str | None
    name: str
    documentType: str
    content: str | None
    status: str
    version: int
    createdBy: str | None
    createdAt: datetime
    updatedAt: datetime


class DocumentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=500)
    documentType: str
    templateId: str | None = None
    content: str | None = None


class DocumentUpdate(BaseModel):
    name: str | None = None
    content: str | None = None
    status: str | None = None


# --- Reviews ---
class ReviewDocumentItem(BaseModel):
    documentId: str
    documentName: str
    documentType: str


class DocumentReviewResponse(BaseModel):
    id: str
    reviewerId: str
    requestedBy: str
    status: str
    rationale: str | None
    rationaleGenerated: bool
    requestedAt: datetime
    reviewedAt: datetime | None
    documents: list[ReviewDocumentItem]


class DocumentReviewCreate(BaseModel):
    reviewerId: str
    documentIds: list[str]


class DocumentReviewUpdate(BaseModel):
    status: str  # approved, changes_requested
    rationale: str | None = None


# --- Shares ---
class DocumentShareResponse(BaseModel):
    id: str
    documentId: str
    sharedWith: str
    sharedBy: str
    permission: str
    createdAt: datetime


class DocumentShareCreate(BaseModel):
    sharedWith: list[str]
    permission: str = "comment"


# --- Source Files ---
class SourceFileResponse(BaseModel):
    id: str
    opportunityId: str
    fileName: str
    fileUrl: str
    fileType: str | None
    fileSize: int | None
    processed: bool
    sourceOrigin: str | None
    createdAt: datetime


# --- Email Accounts ---
class EmailAccountResponse(BaseModel):
    id: uuid.UUID
    userId: uuid.UUID
    provider: str
    emailAddress: str
    status: str
    lastSyncedAt: datetime | None = None
    syncLabels: list[str] | None = None
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True


class EmailAccountCreate(BaseModel):
    provider: str = "gmail"
    emailAddress: str
    accessToken: str | None = None
    refreshToken: str | None = None


# --- Synced Emails ---
class EmailAttachmentResponse(BaseModel):
    id: uuid.UUID
    fileName: str | None = None
    fileType: str | None = None
    fileSize: int | None = None


class SyncedEmailResponse(BaseModel):
    id: uuid.UUID
    emailAccountId: uuid.UUID
    fromAddress: str | None = None
    fromName: str | None = None
    subject: str | None = None
    bodyText: str | None = None
    bodyHtml: str | None = None
    receivedAt: datetime | None = None
    attachmentCount: int
    importStatus: str
    opportunityId: uuid.UUID | None = None
    attachments: list[EmailAttachmentResponse]
    createdAt: datetime

    class Config:
        from_attributes = True


class ImportEmailRequest(BaseModel):
    investmentTypeId: str


# --- Google Drive ---
class GoogleDriveAccountResponse(BaseModel):
    id: uuid.UUID
    userId: uuid.UUID
    emailAddress: str | None = None
    status: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True


class GoogleDriveAccountCreate(BaseModel):
    emailAddress: str | None = None
    accessToken: str | None = None
    refreshToken: str | None = None


class DriveFolder(BaseModel):
    id: str
    name: str
    path: str
    hasChildren: bool


class DriveBrowseResponse(BaseModel):
    folders: list[DriveFolder]


class GoogleDriveImportRequest(BaseModel):
    folderIds: list[str]


class GoogleDriveImportJobResponse(BaseModel):
    id: uuid.UUID
    accountId: uuid.UUID
    folderPaths: list[str] | None = None
    status: str
    totalFiles: int
    processedFiles: int
    opportunitiesCreated: int
    errorLog: dict | None = None
    startedAt: datetime | None = None
    completedAt: datetime | None = None
    createdAt: datetime

    class Config:
        from_attributes = True
