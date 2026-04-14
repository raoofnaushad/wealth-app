import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { TopNav } from './TopNav'
import { Sidebar } from './Sidebar'
import { RightPanel } from './RightPanel'
import { ModuleSwitcher } from './ModuleSwitcher'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { useChatStore } from '@/store/useChatStore'
import { useUIStore } from '@/store/useUIStore'

export function AppShell() {
  const globalSidebarCollapsed = useUIStore((s) => s.globalSidebarCollapsed)
  const toggleGlobalSidebar = useUIStore((s) => s.toggleGlobalSidebar)
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(true)
  const [moduleSwitcherOpen, setModuleSwitcherOpen] = useState(false)
  const chatOpen = useChatStore((s) => s.isOpen)

  return (
    <TooltipProvider delay={200}>
      <div className="h-screen flex flex-col overflow-hidden bg-background">
        <TopNav onModuleSwitcherOpen={() => setModuleSwitcherOpen(true)} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar collapsed={globalSidebarCollapsed} onToggle={toggleGlobalSidebar} />
          <main className="flex-1 min-w-0 overflow-y-auto">
            <Outlet />
          </main>
          {/* Show chat panel on right when open, otherwise show the events/tasks panel */}
          {chatOpen ? (
            <ChatPanel />
          ) : (
            <RightPanel collapsed={rightPanelCollapsed} onToggle={() => setRightPanelCollapsed(!rightPanelCollapsed)} />
          )}
        </div>
        <ModuleSwitcher open={moduleSwitcherOpen} onClose={() => setModuleSwitcherOpen(false)} />
      </div>
    </TooltipProvider>
  )
}
