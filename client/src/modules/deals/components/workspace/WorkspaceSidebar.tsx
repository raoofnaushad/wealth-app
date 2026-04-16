import { useRef } from 'react'
import { FileText, StickyNote, Paperclip, Plus, Check, PanelLeftClose, PanelLeft, Upload, Loader2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Document, SourceFile, WorkspaceTab } from '../../types'

interface WorkspaceSidebarProps {
  collapsed: boolean
  documents: Document[]
  sourceFiles: SourceFile[]
  activeTabId: string | null
  onOpenTab: (tab: WorkspaceTab) => void
  onCreateDocument: () => void
  onUploadFile: (file: File) => void
  uploadingFile: boolean
  onToggle: () => void
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  in_review: { label: 'In Review', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  approved: { label: 'Approved', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
}

export function WorkspaceSidebar({
  collapsed,
  documents,
  sourceFiles,
  activeTabId,
  onOpenTab,
  onCreateDocument,
  onUploadFile,
  uploadingFile,
  onToggle,
}: WorkspaceSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const deliverables = documents.filter(d => d.documentType !== 'note')

  if (collapsed) {
    return (
      <div className="flex w-12 flex-col items-center border-r bg-background py-2 transition-all duration-200">
        <Button variant="ghost" size="icon" className="mb-4 h-7 w-7" onClick={onToggle}>
          <PanelLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col items-center gap-4">
          <button
            className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            title="Deliverables"
            onClick={onToggle}
          >
            <FileText className="h-4 w-4" />
            {deliverables.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                {deliverables.length}
              </span>
            )}
          </button>
          <button
            className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground/50 cursor-default"
            title="Notes — Coming soon"
          >
            <StickyNote className="h-4 w-4" />
          </button>
          <button
            className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            title="Source Documents"
            onClick={onToggle}
          >
            <Paperclip className="h-4 w-4" />
            {sourceFiles.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                {sourceFiles.length}
              </span>
            )}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-64 flex-col border-r bg-background transition-all duration-200">
      <div className="flex items-center justify-end px-2 py-2">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggle}>
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2">
        {/* Deliverables */}
        <SectionHeader
          label="Deliverables"
          count={deliverables.length}
          onAdd={onCreateDocument}
        />
        <ul className="mb-4 space-y-0.5">
          {deliverables.map(doc => (
            <SidebarItem
              key={doc.id}
              active={activeTabId === doc.id}
              onClick={() =>
                onOpenTab({
                  id: doc.id,
                  type: 'document',
                  label: doc.name,
                  documentId: doc.id,
                  closeable: true,
                })
              }
            >
              <span className="flex-1 truncate text-sm">{doc.name}</span>
              <StatusBadge status={doc.status} />
            </SidebarItem>
          ))}
        </ul>

        {/* Notes — Coming Soon */}
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Notes
          </span>
          <span className="text-[10px] text-muted-foreground italic">Coming soon</span>
        </div>

        {/* Source Documents */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.png,.jpg,.jpeg,.gif"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              onUploadFile(file)
              e.target.value = ''
            }
          }}
        />
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Source Documents ({sourceFiles.length})
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
            title="Upload from computer"
          >
            {uploadingFile ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        <ul className="mb-4 space-y-0.5">
          {sourceFiles.map(sf => (
            <SidebarItem
              key={sf.id}
              active={activeTabId === sf.id}
              onClick={() =>
                onOpenTab({
                  id: sf.id,
                  type: 'source_file',
                  label: sf.fileName,
                  closeable: true,
                })
              }
            >
              <span className="flex-1 truncate text-sm">{sf.fileName}</span>
              {sf.processed && (
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              )}
            </SidebarItem>
          ))}
        </ul>
      </ScrollArea>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────

function SectionHeader({
  label,
  count,
  onAdd,
}: {
  label: string
  count: number
  onAdd: () => void
}) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label} ({count})
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5"
        onClick={onAdd}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}


function SidebarItem({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <li>
      <button
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          active && 'bg-accent text-accent-foreground',
        )}
        onClick={onClick}
      >
        {children}
      </button>
    </li>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status]
  if (!config) return null
  return (
    <Badge variant="secondary" className={cn('shrink-0 text-[10px] px-1.5 py-0', config.className)}>
      {config.label}
    </Badge>
  )
}
