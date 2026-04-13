import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDealsStore } from '../store'
import { useUndoRedo } from '../components/workspace/useUndoRedo'
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
import type { WorkspaceTab } from '../types'
import { dealsApi } from '../api'

export function OpportunityWorkspacePage() {
  const { oppId } = useParams<{ oppId: string }>()
  const navigate = useNavigate()
  const store = useDealsStore()
  const { canUndo, canRedo, undo, redo, clearHistory } = useUndoRedo()

  const [showCreateDoc, setShowCreateDoc] = useState(false)
  const [showValidation, setShowValidation] = useState(false)
  const [showShare, setShowShare] = useState(false)

  useEffect(() => {
    if (oppId) {
      store.fetchWorkspace(oppId)
      if (store.investmentTypes.length === 0) store.fetchInvestmentTypes()
    }
    return () => {
      clearHistory()
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

  // Undo handler — applies the previous value back to store
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

  // Redo handler
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

  // Create a new note directly
  async function handleCreateNote() {
    if (!oppId) return
    try {
      const doc = await dealsApi.createDocument(oppId, {
        name: 'Untitled Note',
        documentType: 'note',
      })
      store.addWorkspaceDocument(doc)
    } catch {
      // TODO: toast
    }
  }

  if (store.loadingWorkspace || !store.activeOpportunity) {
    return <div className="text-muted-foreground p-6">Loading workspace...</div>
  }

  const opp = store.activeOpportunity
  const activeTab = store.workspaceTabs.find((t) => t.id === store.activeTabId) ?? null

  // Find the active document (for share/validation dialogs)
  const activeDocument = activeTab?.type === 'document' || activeTab?.type === 'note'
    ? store.workspaceDocuments.find((d) => d.id === activeTab.documentId)
    : null

  // Find the active source file
  const activeSourceFile = activeTab?.type === 'source_file'
    ? store.workspaceSourceFiles.find((sf) => sf.id === activeTab.id)
    : null

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <WorkspaceHeader
        opportunity={opp}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onBack={() => navigate('/home/deals/opportunities')}
        onShare={() => setShowShare(true)}
      />

      {/* Review Banner */}
      <ReviewBanner
        opportunityId={opp.id}
        documents={store.workspaceDocuments}
        currentUserId="user-raoof"
      />

      {/* Body: Sidebar + Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <WorkspaceSidebar
          collapsed={store.sidebarCollapsed}
          documents={store.workspaceDocuments}
          sourceFiles={store.workspaceSourceFiles}
          activeTabId={store.activeTabId}
          onOpenTab={(tab: WorkspaceTab) => store.openTab(tab)}
          onCreateDocument={() => setShowCreateDoc(true)}
          onCreateNote={handleCreateNote}
          onToggle={() => store.toggleSidebar()}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Bar */}
          <WorkspaceContentTabs
            tabs={store.workspaceTabs}
            activeTabId={store.activeTabId}
            onTabClick={(tabId: string) => useDealsStore.setState({ activeTabId: tabId })}
            onTabClose={(tabId: string) => store.closeTab(tabId)}
          />

          {/* Active Tab Content */}
          <div className="flex-1 overflow-auto">
            {activeTab?.type === 'snapshot' && (
              <SnapshotPanel
                opportunity={opp}
                investmentTypes={store.investmentTypes}
                onUpdate={(updated) => useDealsStore.setState({ activeOpportunity: updated })}
              />
            )}
            {(activeTab?.type === 'document' || activeTab?.type === 'note') && activeDocument && (
              <DocumentPanel
                key={activeDocument.id}
                document={activeDocument}
                opportunityId={opp.id}
                onUpdate={(doc) => store.updateWorkspaceDocument(doc)}
              />
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
          documents={store.workspaceDocuments}
          onClose={() => setShowValidation(false)}
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
