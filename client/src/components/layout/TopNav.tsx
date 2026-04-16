import { Sun, Moon, Grid3X3, LogOut, ChevronRight, User } from 'lucide-react'
import { NotificationBell } from '@/modules/deals/components/NotificationPanel'
import { useThemeStore } from '@/store/useThemeStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useChatStore } from '@/store/useChatStore'
import { InvictusLogo } from '@/components/shared/InvictusLogo'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLocation, useNavigate } from 'react-router-dom'

interface TopNavProps {
  onModuleSwitcherOpen: () => void
}

export function TopNav({ onModuleSwitcherOpen }: TopNavProps) {
  const { theme, toggle } = useThemeStore()
  const { user, logout } = useAuthStore()
  const { toggle: toggleChat, isOpen: chatOpen } = useChatStore()
  const location = useLocation()
  const navigate = useNavigate()

  function getBreadcrumbs() {
    const crumbs = [
      { label: 'Home', path: '/home' },
    ]

    const homePath = location.pathname.replace(/^\/home\/?/, '')
    const parts = homePath.split('/').filter(Boolean)

    if (parts[0] === 'dashboard') {
      crumbs.push({ label: 'Your Daily', path: '/home/dashboard' })
    } else if (parts[0] === 'meetings') {
      crumbs.push({ label: 'Meeting Brief', path: location.pathname })
    } else if (parts[0] === 'agents') {
      crumbs.push({ label: 'Agents', path: '/home/agents' })
      if (parts[1]) {
        const name = parts[1].replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        crumbs.push({ label: name, path: `/home/agents/${parts[1]}` })
        if (parts[2] === 'trigger') {
          crumbs.push({ label: 'Trigger', path: location.pathname })
        }
      }
    } else if (parts[0] === 'chat') {
      crumbs.push({ label: 'Chat', path: '/home/chat' })
    } else if (parts[0] === 'runs') {
      crumbs.push({ label: 'Runs', path: '/home/runs' })
      if (parts[1]) crumbs.push({ label: parts[1], path: location.pathname })
    } else if (parts[0] === 'admin') {
      crumbs.push({ label: 'Administration', path: '/home/admin' })
      if (parts[1] === 'company') crumbs.push({ label: 'Company Profile', path: '/home/admin/company' })
      else if (parts[1] === 'branding') crumbs.push({ label: 'Branding', path: '/home/admin/branding' })
      else if (parts[1] === 'users') crumbs.push({ label: 'Roles & Access', path: '/home/admin/users' })
      else if (parts[1] === 'preferences') crumbs.push({ label: 'Preferences', path: '/home/admin/preferences' })
    } else if (parts[0] === 'account') {
      crumbs.push({ label: 'My Account', path: '/home/account' })
      if (parts[1] === 'security') crumbs.push({ label: 'Security', path: '/home/account/security' })
    }

    return crumbs
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/home')}>
          <InvictusLogo size="sm" />
        </div>
        <div className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground ml-2">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.path + i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3 h-3" />}
              <button
                onClick={() => navigate(crumb.path)}
                className={`hover:text-foreground transition-colors ${i === breadcrumbs.length - 1 ? 'text-foreground font-medium' : ''}`}
              >
                {crumb.label}
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onModuleSwitcherOpen} className="h-8 w-8">
          <Grid3X3 className="h-4 w-4" />
        </Button>
        <Button
          variant={chatOpen ? 'secondary' : 'ghost'}
          size="icon"
          onClick={toggleChat}
          className="h-8 w-8 relative"
        >
          <img src="/invictus-logo.svg" alt="AI Analyst" className="h-7 w-7 dark:invert" />
        </Button>
        <NotificationBell />
        <Button variant="ghost" size="icon" onClick={toggle} className="h-8 w-8">
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-accent transition-colors cursor-pointer ml-1">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                {user?.initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm hidden md:block">{user?.name}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-2 py-1.5 text-sm">
              <p className="font-medium">{user?.name}</p>
              <p className="text-muted-foreground text-xs">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/home/account')}>
              <User className="mr-2 h-4 w-4" />
              My Account
            </DropdownMenuItem>
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
