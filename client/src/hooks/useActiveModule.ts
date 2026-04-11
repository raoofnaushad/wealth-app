import { useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Handshake,
  ClipboardList,
  Flag,
  TrendingUp,
  BarChart3,
  Settings,
  Building2,
  Palette,
  Users,
  SlidersHorizontal,
  Kanban,
  Target,
  PieChart,
  UserPlus,
  FileText,
  Bell,
  CheckSquare,
  Calendar,
  type LucideIcon,
} from 'lucide-react'

export interface ModuleNavItem {
  label: string
  path: string
  icon: LucideIcon
}

export interface ActiveModule {
  slug: string
  label: string
  icon: LucideIcon
  accentColor: string
  navItems: ModuleNavItem[]
}

const MODULE_NAV_CONFIG: Record<string, ActiveModule> = {
  admin: {
    slug: 'admin',
    label: 'Administration',
    icon: Settings,
    accentColor: 'text-slate-500',
    navItems: [
      { label: 'Company Profile', path: '/home/admin/company', icon: Building2 },
      { label: 'Branding', path: '/home/admin/branding', icon: Palette },
      { label: 'Roles & Access', path: '/home/admin/users', icon: Users },
      { label: 'Preferences', path: '/home/admin/preferences', icon: SlidersHorizontal },
    ],
  },
  deals: {
    slug: 'deals',
    label: 'Deals',
    icon: TrendingUp,
    accentColor: 'text-amber-500',
    navItems: [
      { label: 'Dashboard', path: '/home/deals', icon: LayoutDashboard },
      { label: 'Pipeline', path: '/home/deals/pipeline', icon: Kanban },
      { label: 'Opportunities', path: '/home/deals/opportunities', icon: Target },
      { label: 'Allocations', path: '/home/deals/allocations', icon: PieChart },
      { label: 'Reports', path: '/home/deals/reports', icon: FileText },
    ],
  },
  engage: {
    slug: 'engage',
    label: 'Engage',
    icon: Handshake,
    accentColor: 'text-emerald-500',
    navItems: [
      { label: 'Dashboard', path: '/home/engage', icon: LayoutDashboard },
      { label: 'Clients', path: '/home/engage/clients', icon: Users },
      { label: 'Prospects', path: '/home/engage/prospects', icon: UserPlus },
      { label: 'Pipeline', path: '/home/engage/pipeline', icon: Kanban },
    ],
  },
  plan: {
    slug: 'plan',
    label: 'Plan',
    icon: ClipboardList,
    accentColor: 'text-blue-500',
    navItems: [
      { label: 'Dashboard', path: '/home/plan', icon: LayoutDashboard },
      { label: 'Financial Plans', path: '/home/plan/plans', icon: FileText },
      { label: 'Risk Profiles', path: '/home/plan/risk', icon: BarChart3 },
    ],
  },
  insights: {
    slug: 'insights',
    label: 'Insights',
    icon: BarChart3,
    accentColor: 'text-orange-500',
    navItems: [
      { label: 'Dashboard', path: '/home/insights', icon: LayoutDashboard },
      { label: 'Reports', path: '/home/insights/reports', icon: FileText },
      { label: 'Alerts', path: '/home/insights/alerts', icon: Bell },
    ],
  },
  tools: {
    slug: 'tools',
    label: 'Tools & Communication',
    icon: Flag,
    accentColor: 'text-violet-500',
    navItems: [
      { label: 'Dashboard', path: '/home/tools', icon: LayoutDashboard },
      { label: 'Tasks', path: '/home/tools/tasks', icon: CheckSquare },
      { label: 'Meetings', path: '/home/tools/meetings', icon: Calendar },
    ],
  },
}

const MODULE_SLUGS = Object.keys(MODULE_NAV_CONFIG)

export function useActiveModule(): ActiveModule | null {
  const { pathname } = useLocation()
  const match = pathname.match(/^\/home\/([^/]+)/)
  if (!match) return null
  const slug = match[1]
  if (!MODULE_SLUGS.includes(slug)) return null
  return MODULE_NAV_CONFIG[slug] ?? null
}
