import { useAuthStore } from '@/store/useAuthStore'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ModuleRole } from '@/modules/admin/types'

const ROLES: { value: ModuleRole; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'analyst', label: 'Analyst' },
]

const STORAGE_KEY = 'dev_deals_role_override'

export function DevRoleSwitcher() {
  // Only render in dev mode — tree-shaken in production
  if (!import.meta.env.DEV) return null

  const currentRole = useAuthStore((s) => s.getModuleRole('deals'))
  const storedRole = localStorage.getItem(STORAGE_KEY) as ModuleRole | null

  function handleChange(role: string | null) {
    if (!role) return
    localStorage.setItem(STORAGE_KEY, role)
    // Patch the auth store's moduleRoles to include the new deals role
    const state = useAuthStore.getState()
    useAuthStore.setState({
      moduleRoles: { ...state.moduleRoles, deals: role as ModuleRole },
    })
    // Reload to ensure all components pick up the new role
    window.location.reload()
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg border bg-background/95 backdrop-blur px-3 py-2 shadow-lg">
      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
        DEV
      </Badge>
      <span className="text-xs text-muted-foreground">Role:</span>
      <Select value={storedRole ?? currentRole ?? 'analyst'} onValueChange={handleChange}>
        <SelectTrigger className="h-7 w-24 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((r) => (
            <SelectItem key={r.value} value={r.value} className="text-xs">
              {r.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
