import { Camera, FileText, Palette, Paperclip, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkspaceTab, WorkspaceTabType } from '../../types'

interface WorkspaceContentTabsProps {
  tabs: WorkspaceTab[]
  activeTabId: string | null
  onTabClick: (tabId: string) => void
  onTabClose: (tabId: string) => void
}

const tabIcons: Record<WorkspaceTabType, typeof Camera> = {
  snapshot: Camera,
  document: FileText,
  note: Palette,
  source_file: Paperclip,
}

export function WorkspaceContentTabs({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
}: WorkspaceContentTabsProps) {
  return (
    <div className="flex items-center border-b bg-muted/30 px-2 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        const Icon = tabIcons[tab.type]

        return (
          <button
            key={tab.id}
            onClick={() => onTabClick(tab.id)}
            className={cn(
              'flex items-center gap-1 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors relative group',
              isActive
                ? 'bg-background text-foreground border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
          >
            <Icon className="h-3.5 w-3.5 mr-1.5 shrink-0" />
            <span className="max-w-[160px] truncate">{tab.label}</span>
            {tab.closeable && (
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation()
                  onTabClose(tab.id)
                }}
                className={cn(
                  'ml-1 rounded-sm p-0.5 transition-opacity',
                  'hover:bg-muted-foreground/20',
                  isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                )}
              >
                <X className="h-3 w-3" />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
