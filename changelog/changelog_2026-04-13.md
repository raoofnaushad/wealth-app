# Changelog — 2026-04-13

## Business

- **Redesigned Deal Workspace**: Investment analysts now work in a professional workspace with a collapsible sidebar showing all deliverables and source documents, with each document opening in its own tab — similar to modern document editors.

- **Rich Text Document Editing**: Deal documents (Investment Memos, DDQs, Pre-Screening Reports) now support full formatting — bold, italic, headings, bullet/numbered lists, text alignment, images, and code blocks — replacing the previous plain text editor.

- **Deal Stage Management**: Each opportunity now tracks its lifecycle stage (Pre-Screening → Due Diligence → IC Review → Approved/Rejected) with a visual dropdown in the header. Stages can be changed directly or advanced through the approval workflow.

- **Stage-Based Approval Workflow**: "Send for Validation" now advances opportunities through lifecycle stages. Analysts select documents to share and managers to review. Only managers appear as validators. The approval advances the deal to the next stage automatically.

- **Enhanced Document Sharing**: Team members can be selected from a visual list with per-user permissions (View only, Can comment, Can edit) instead of typing user IDs manually.

- **Document Download**: Documents can now be exported as HTML or plain text files directly from the workspace header.

- **Notes Section (Coming Soon)**: A visual brainstorming canvas for analysts is planned for a future release, currently shown as "Coming Soon" in the sidebar.

---

## Developer

### UI Changes

- **OpportunityWorkspacePage** completely restructured from split-panel to sidebar + tabbed content layout. Full-width workspace (`-m-6 h-[calc(100vh-3rem)]`) breaks out of DealsLayout constraints.

- **WorkspaceSidebar** — New collapsible sidebar with Deliverables, Notes (coming soon), and Source Documents sections. Collapsed state shows icons with count badges.

- **WorkspaceContentTabs** — New horizontal scrollable tab bar with type-specific icons (Camera for snapshot, FileText for documents, Palette for notes, Paperclip for source files). Closeable tabs with X button.

- **WorkspaceHeader** — Enhanced header with deal stage dropdown (Pre-Screening/Due Diligence/IC Review/Approved/Reject Deal), strategy fit and recommendation badges, action icons (undo/redo/validate/share/download/notifications) with tooltips.

- **DocumentPanel** — Replaced plain `<Textarea>` with Tiptap rich text editor (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-underline`, `@tiptap/extension-text-align`, `@tiptap/extension-placeholder`). Full formatting toolbar with 17 tool buttons.

- **SnapshotPanel** — Enhanced with KPI cards row, investment type tags, 2-column grid layout, collapsible sections.

- **ValidationDialog** — Rewritten for opportunity-level stage approval with stage progress indicator, document picker, manager-only team member list.

- **ShareDialog** — Rewritten with team member list, avatar initials, per-user permission picker (view/comment/edit).

- **ReviewBanner** — Rewritten for opportunity-level approvals instead of document-level reviews.

- **CreateDocumentDialog** — Replaced form with template card selector grid with search, investment type badges.

- **SourceFileViewer** — New component for viewing uploaded source files (PDF iframe, file metadata).

### API / Integration Changes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/deals/opportunities/:id/approvals` | GET | List approval requests for an opportunity |
| `/deals/opportunities/:id/approvals` | POST | Submit opportunity for stage approval |
| `/deals/opportunities/:id/approvals/:id` | PUT | Approve or request changes |
| `/deals/opportunities/:id/files` | GET | List source files for an opportunity |
| `/deals/team-members` | GET | List team members for validation/sharing |

New types added: `ApprovalStage`, `ApprovalRequest`, `TeamMember`.

### Internal / Non-Breaking Changes

- **`useUIStore`** — New Zustand store (`client/src/store/useUIStore.ts`) for global sidebar collapse state, shared between AppShell and workspace page. Workspace auto-collapses global nav on mount, restores on unmount.

- **`useUndoRedo`** — New standalone Zustand store for undo/redo history. Command-pattern with 50-entry cap. Supports snapshot field changes and document content changes. Keyboard shortcuts (Ctrl+Z/Ctrl+Shift+Z).

- **`downloadDocument`** — New utility for HTML and text export of documents via Blob URL download.

- **Store changes** — `activeTabId` replaces `leftPanelTabId`/`rightPanelTabId`. New state: `workspaceSourceFiles`, `workspaceApprovals`, `sidebarCollapsed`. New actions: `openTab`, `closeTab`, `toggleSidebar`, `advanceApprovalStage`.

- **Mock data expanded** — Source files, team members, approval requests, `approvalStage` field on opportunities. Document mock data updated with `name` field and HTML content for Tiptap.

- **Types expanded** — `ApprovalStage` (new/pre_screening/due_diligence/ic_review/approved/rejected), `Opportunity.approvalStage`, `WorkspaceTabType` includes 'note' and 'source_file', `DocumentType` includes 'note'.
