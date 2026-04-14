import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, Users, ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/organizations', label: 'Organizations', icon: Building2 },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/audit-logs', label: 'Audit Logs', icon: ScrollText },
];

export function Sidebar() {
  return (
    <aside className="w-60 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
      <div className="h-14 flex items-center px-5 border-b border-sidebar-border">
        <span className="text-base font-semibold tracking-tight text-sidebar-primary">
          Invictus AI
        </span>
        <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-sidebar-accent text-sidebar-accent-foreground">
          Admin
        </span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
