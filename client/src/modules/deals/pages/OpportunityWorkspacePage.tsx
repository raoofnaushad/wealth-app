import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDealsStore } from '../store'
import { useUndoRedo } from '../components/workspace/useUndoRedo'
import { useUIStore } from '@/store/useUIStore'
import { WorkspaceHeader } from '../components/workspace/WorkspaceHeader'
import { WorkspaceSidebar } from '../components/workspace/WorkspaceSidebar'
import { WorkspaceContentTabs } from '../components/workspace/WorkspaceContentTabs'
import { SnapshotPanel } from '../components/workspace/SnapshotPanel'
import { DocumentPanel } from '../components/workspace/DocumentPanel'
import { SourceFileViewer } from '../components/workspace/SourceFileViewer'
import { CreateDocumentDialog } from '../components/workspace/CreateDocumentDialog'
import { ValidationDialog } from '../components/workspace/ValidationDialog'
import { ShareDialog } from '../components/workspace/ShareDialog'
import { ReviewBanner } from '../components/workspace/ReviewBanner'
import type { WorkspaceTab, ApprovalStage } from '../types'
import { dealsApi } from '../api'

export function OpportunityWorkspacePage() {
  const { oppId } = useParams<{ oppId: string }>()
  const navigate = useNavigate()
  const store = useDealsStore()
  const { canUndo, canRedo, undo, redo, clearHistory } = useUndoRedo()
  const setGlobalSidebarCollapsed = useUIStore((s) => s.setGlobalSidebarCollapsed)
  const prevGlobalCollapsed = useRef(useUIStore.getState().globalSidebarCollapsed)

  const [showCreateDoc, setShowCreateDoc] = useState(false)
  const [showValidation, setShowValidation] = useState(false)
  const [showShare, setShowShare] = useState(false)

  useEffect(() => {
    if (oppId) {
      store.fetchWorkspace(oppId)
      if (store.investmentTypes.length === 0) store.fetchInvestmentTypes()
    }

    // Auto-collapse global left nav when workspace opens
    prevGlobalCollapsed.current = useUIStore.getState().globalSidebarCollapsed
    setGlobalSidebarCollapsed(true)

    return () => {
      clearHistory()
      // Restore global sidebar state on leave
      setGlobalSidebarCollapsed(prevGlobalCollapsed.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oppId])

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault()
          handleRedo()
        } else {
          e.preventDefault()
          handleUndo()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canUndo, canRedo])

  const handleUndo = useCallback(() => {
    const entry = undo()
    if (!entry) return
    if (entry.type === 'snapshot_field' && store.activeOpportunity) {
      const newData = { ...store.activeOpportunity.snapshotData, [entry.fieldName!]: entry.previousValue }
      useDealsStore.setState({
        activeOpportunity: { ...store.activeOpportunity, snapshotData: newData },
      })
    } else if (entry.type === 'document_content') {
      const docs = store.workspaceDocuments.map((d) =>
        d.id === entry.targetId ? { ...d, content: entry.previousValue as string } : d,
      )
      useDealsStore.setState({ workspaceDocuments: docs })
    }
  }, [undo, store.activeOpportunity, store.workspaceDocuments])

  const handleRedo = useCallback(() => {
    const entry = redo()
    if (!entry) return
    if (entry.type === 'snapshot_field' && store.activeOpportunity) {
      const newData = { ...store.activeOpportunity.snapshotData, [entry.fieldName!]: entry.newValue }
      useDealsStore.setState({
        activeOpportunity: { ...store.activeOpportunity, snapshotData: newData },
      })
    } else if (entry.type === 'document_content') {
      const docs = store.workspaceDocuments.map((d) =>
        d.id === entry.targetId ? { ...d, content: entry.newValue as string } : d,
      )
      useDealsStore.setState({ workspaceDocuments: docs })
    }
  }, [redo, store.activeOpportunity, store.workspaceDocuments])


  if (store.loadingWorkspace || !store.activeOpportunity) {
    return <div className="text-muted-foreground p-6">Loading workspace...</div>
  }

  const opp = store.activeOpportunity
  const activeTab = store.workspaceTabs.find((t) => t.id === store.activeTabId) ?? null

  const activeDocument = activeTab?.type === 'document' || activeTab?.type === 'note'
    ? store.workspaceDocuments.find((d) => d.id === activeTab.documentId) ?? null
    : null

  const activeSourceFile = activeTab?.type === 'source_file'
    ? store.workspaceSourceFiles.find((sf) => sf.id === activeTab.id)
    : null

  return (
    <div className="flex flex-col -m-6 h-[calc(100vh-3.5rem)] overflow-hidden" style={{ width: 'calc(100% + 3rem)', maxWidth: 'none' }}>
      {/* Header — sticky, never scrolls */}
      <WorkspaceHeader
        opportunity={opp}
        activeDocument={activeDocument}
        canUndo={activeTab?.type !== 'note' && canUndo}
        canRedo={activeTab?.type !== 'note' && canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onBack={() => navigate('/home/deals/opportunities')}
        onValidate={() => setShowValidation(true)}
        onShare={() => setShowShare(true)}
        onStageChange={async (stage: ApprovalStage) => {
          store.advanceApprovalStage(stage)
          try {
            await dealsApi.updateOpportunity(opp.id, { approvalStage: stage } as Record<string, unknown>)
          } catch {
            // revert on error
            store.advanceApprovalStage(opp.approvalStage)
          }
        }}
      />

      {/* Review Banner */}
      <ReviewBanner
        opportunityId={opp.id}
        approvals={store.workspaceApprovals}
        currentUserId="user-raoof"
        onApprovalUpdate={(updatedApproval) => {
          useDealsStore.setState({
            workspaceApprovals: store.workspaceApprovals.map(a =>
              a.id === updatedApproval.id ? updatedApproval : a
            ),
          })
          if (updatedApproval.status === 'approved') {
            const nextStage =
              opp.approvalStage === 'pre_screening' ? 'due_diligence' as const
              : opp.approvalStage === 'due_diligence' ? 'ic_review' as const
              : opp.approvalStage === 'ic_review' ? 'approved' as const
              : opp.approvalStage
            store.advanceApprovalStage(nextStage)
          }
        }}
      />

      {/* Body: Sidebar + Main Content — sidebar and tabs are sticky, only content scrolls */}
      <div className="flex-1 flex overflow-hidden">
        {/* Workspace sidebar — never scrolls (has its own internal ScrollArea) */}
        <WorkspaceSidebar
          collapsed={store.sidebarCollapsed}
          documents={store.workspaceDocuments}
          sourceFiles={store.workspaceSourceFiles}
          activeTabId={store.activeTabId}
          onOpenTab={(tab: WorkspaceTab) => store.openTab(tab)}
          onCreateDocument={() => setShowCreateDoc(true)}
          onUploadFile={(file: File) => store.uploadSourceFile(opp.id, file)}
          uploadingFile={store.uploadingFile}
          onToggle={() => store.toggleSidebar()}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Bar — sticky, never scrolls */}
          <WorkspaceContentTabs
            tabs={store.workspaceTabs}
            activeTabId={store.activeTabId}
            onTabClick={(tabId: string) => useDealsStore.setState({ activeTabId: tabId })}
            onTabClose={(tabId: string) => store.closeTab(tabId)}
          />

          {/* Active Tab Content — this is the only part that scrolls */}
          <div className="flex-1 overflow-auto">
            {activeTab?.type === 'snapshot' && (
              <SnapshotPanel
                opportunity={opp}
                investmentTypes={store.investmentTypes}
                onUpdate={(updated) => useDealsStore.setState({ activeOpportunity: updated })}
              />
            )}
            {activeTab?.type === 'document' && activeDocument && (
              <DocumentPanel
                key={activeDocument.id}
                document={activeDocument}
                opportunityId={opp.id}
                onUpdate={(doc) => store.updateWorkspaceDocument(doc)}
              />
            )}
            {activeTab?.type === 'note' && (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Canvas notes coming soon
              </div>
            )}
            {activeTab?.type === 'source_file' && activeSourceFile && (
              <SourceFileViewer sourceFile={activeSourceFile} />
            )}
            {!activeTab && (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Select an item from the sidebar to get started
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {showCreateDoc && (
        <CreateDocumentDialog
          opportunityId={opp.id}
          opportunityName={opp.name}
          investmentTypeId={opp.investmentTypeId}
          onClose={() => setShowCreateDoc(false)}
        />
      )}
      {showValidation && (
        <ValidationDialog
          opportunityId={opp.id}
          currentStage={opp.approvalStage}
          documents={store.workspaceDocuments}
          onClose={() => setShowValidation(false)}
          onSubmitted={(newApprovals) => {
            useDealsStore.setState({
              workspaceApprovals: [...store.workspaceApprovals, ...newApprovals],
            })
            setShowValidation(false)
          }}
        />
      )}
      {showShare && activeDocument && (
        <ShareDialog
          documentId={activeDocument.id}
          documentName={activeDocument.name}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  )
}
