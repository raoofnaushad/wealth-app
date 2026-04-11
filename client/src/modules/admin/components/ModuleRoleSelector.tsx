import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ModuleRole, ModuleSlug } from '../types'

interface ModuleRoleSelectorProps {
  moduleSlug: ModuleSlug
  moduleLabel: string
  value: ModuleRole | 'none'
  onChange: (role: ModuleRole | 'none') => void
  disabled?: boolean
}

const OPTIONS: { value: ModuleRole | 'none'; label: string }[] = [
  { value: 'none', label: 'No access' },
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'analyst', label: 'Analyst' },
]

export function ModuleRoleSelector({
  moduleSlug,
  moduleLabel,
  value,
  onChange,
  disabled = false,
}: ModuleRoleSelectorProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label
        htmlFor={`module-role-${moduleSlug}`}
        className="text-sm font-medium text-foreground"
      >
        {moduleLabel}
      </label>
      <Select
        value={value}
        onValueChange={(v) => {
          if (v !== null) onChange(v as ModuleRole | 'none')
        }}
        disabled={disabled}
      >
        <SelectTrigger id={`module-role-${moduleSlug}`} className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
