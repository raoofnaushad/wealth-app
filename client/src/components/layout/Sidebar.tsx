import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Home,
  LayoutDashboard,
  Bot,
  Settings,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Handshake,
  ClipboardList,
  Flag,
  TrendingUp,
  BarChart3,
  CalendarDays,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useActiveModule } from '@/hooks/useActiveModule'
import { useAuthStore } from '@/store/useAuthStore'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

interface NavItem {
  icon?: typeof Home
  customIcon?: React.ReactNode
  label: string
  path: string
  end?: boolean
}

const GLOBAL_NAV: NavItem[] = [
  { icon: Home, label: 'Home', path: '/home', end: true },
  { icon: LayoutDashboard, label: 'Your Daily', path: '/home/dashboard' },
  { customIcon: <img src="/invictus-logo.svg" alt="" className="h-4.5 w-4.5 dark:invert" />, label: 'Chat', path: '/home/chat' },
  { icon: Bot, label: 'Agents', path: '/home/agents' },
]

const MODULE_ITEMS: NavItem[] = [
  { icon: TrendingUp, label: 'Deals', path: '/home/deals' },
  { icon: Handshake, label: 'Engage', path: '/home/engage' },
  { icon: ClipboardList, label: 'Plan', path: '/home/plan' },
  { icon: BarChart3, label: 'Insights', path: '/home/insights' },
  { icon: Flag, label: 'Tools', path: '/home/tools' },
]

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const activeModule = useActiveModule()
  const isOrgAdmin = useAuthStore((s) => s.isOrgAdmin())
  const hasModuleAccess = useAuthStore((s) => s.hasModuleAccess)
  const navigate = useNavigate()

  function renderNavItem(item: NavItem) {
    const Icon = item.icon
    const content = (
      <div
        className={cn(
          'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors cursor-pointer',
          'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          'text-sidebar-foreground',
          hoveredItem === item.label && 'bg-sidebar-accent'
        )}
        onMouseEnter={() => setHoveredItem(item.label)}
        onMouseLeave={() => setHoveredItem(null)}
      >
        {item.customIcon ? (
          <span className="h-4 w-4 shrink-0 flex items-center justify-center">{item.customIcon}</span>
        ) : Icon ? (
          <Icon className="h-4 w-4 shrink-0" />
        ) : null}
        {!collapsed && <span className="truncate">{item.label}</span>}
      </div>
    )

    const link = (
      <NavLink
        key={item.label}
        to={item.path}
        end={item.end}
        className={({ isActive }) =>
          cn(isActive && '[&>div]:bg-sidebar-accent [&>div]:text-sidebar-accent-foreground [&>div]:font-medium')
        }
      >
        {content}
      </NavLink>
    )

    return collapsed ? (
      <Tooltip key={item.label}>
        <TooltipTrigger className="w-full text-left">
          <NavLink
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              cn(isActive && '[&>div]:bg-sidebar-accent [&>div]:text-sidebar-accent-foreground [&>div]:font-medium')
            }
          >
            {content}
          </NavLink>
        </TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    ) : link
  }

  // ── Module View ──────────────────────────────────────────────────
  if (activeModule) {
    const ModuleIcon = activeModule.icon
    const moduleNavItems: NavItem[] = activeModule.navItems.map((item) => ({
      icon: item.icon,
      label: item.label,
      path: item.path,
    }))

    return (
      <aside className={cn('border-r border-border bg-sidebar flex flex-col shrink-0 transition-all duration-200', collapsed ? 'w-14' : 'w-56')}>
        <nav className="flex-1 py-3 px-2 space-y-1">
          <button
            onClick={() => navigate('/home')}
            className={cn('flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors cursor-pointer w-full', 'hover:bg-sidebar-accent text-muted-foreground')}
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Back to Home</span>}
          </button>
          {!collapsed && (
            <div className={cn('flex items-center gap-2 px-2.5 py-2 text-xs font-bold uppercase tracking-wider', activeModule.accentColor)}>
              <ModuleIcon className="h-3.5 w-3.5" />
              {activeModule.label}
            </div>
          )}
          {moduleNavItems.map(renderNavItem)}
        </nav>
        <div className="px-2 py-1 border-t border-border">
          {renderNavItem({ icon: CalendarDays, label: 'Your Daily', path: '/home/dashboard' })}
        </div>
        <div className="p-2 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onToggle} className="w-full justify-center h-8">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </aside>
    )
  }

  // ── Global View ──────────────────────────────────────────────────
  const accessibleModules = MODULE_ITEMS.filter((item) => {
    const slug = item.path.split('/').pop()
    return slug ? hasModuleAccess(slug as 'deals' | 'engage' | 'plan' | 'insights' | 'tools') : false
  })

  return (
    <aside className={cn('border-r border-border bg-sidebar flex flex-col shrink-0 transition-all duration-200', collapsed ? 'w-14' : 'w-56')}>
      <nav className="flex-1 py-3 px-2 space-y-1">
        {GLOBAL_NAV.map(renderNavItem)}
        {accessibleModules.length > 0 && (
          <>
            {!collapsed && (
              <div className="px-2.5 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Modules
              </div>
            )}
            {collapsed && <div className="my-2 border-t border-border" />}
            {accessibleModules.map(renderNavItem)}
          </>
        )}
      </nav>
      {isOrgAdmin && (
        <div className="px-2 py-1 border-t border-border">
          {renderNavItem({ icon: Settings, label: 'Administration', path: '/home/admin' })}
        </div>
      )}
      <div className="p-2 border-t border-border">
        <Button variant="ghost" size="sm" onClick={onToggle} className="w-full justify-center h-8">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  )
}
