import { cn } from '@/lib/utils'
import type { ModuleRole } from '../types'

interface UserRoleBadgeProps {
  role: ModuleRole
}

const roleStyles: Record<ModuleRole, string> = {
  owner:
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  manager:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  analyst:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
}

const roleLabels: Record<ModuleRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  analyst: 'Analyst',
}

export function UserRoleBadge({ role }: UserRoleBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        roleStyles[role],
      )}
    >
      {roleLabels[role]}
    </span>
  )
}
