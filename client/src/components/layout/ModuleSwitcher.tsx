import {
  Home,
  Handshake,
  ClipboardList,
  Flag,
  TrendingUp,
  Lightbulb,
  Users,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  Handshake,
  ClipboardList,
  Flag,
  TrendingUp,
  Lightbulb,
  Users,
}

const MODULES = [
  { name: 'Home', icon: 'Home', active: false, path: '/home' },
  { name: 'Invictus Engage', icon: 'Handshake', active: false, path: null },
  { name: 'Invictus Plan', icon: 'ClipboardList', active: false, path: null },
  { name: 'Invictus Tools &\nCommunication', icon: 'Flag', active: false, path: null },
  { name: 'Invictus Deals', icon: 'TrendingUp', active: false, path: null },
  { name: 'Invictus AI', icon: 'Lightbulb', active: true, path: '/home/dashboard' },
  { name: 'Invictus\nAdministration', icon: 'Users', active: false, path: '/home/admin' },
]

interface ModuleSwitcherProps {
  open: boolean
  onClose: () => void
}

export function ModuleSwitcher({ open, onClose }: ModuleSwitcherProps) {
  const navigate = useNavigate()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invictus Modules</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3 pt-2">
          {MODULES.map((mod) => {
            const Icon = ICON_MAP[mod.icon]
            return (
              <button
                key={mod.name}
                onClick={() => {
                  if (mod.path) {
                    navigate(mod.path)
                    onClose()
                  }
                }}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border transition-all text-center',
                  mod.active
                    ? 'bg-primary/10 border-primary/30 text-primary shadow-sm'
                    : 'border-border hover:bg-accent hover:border-accent-foreground/20 text-muted-foreground',
                  !mod.path && !mod.active && 'opacity-60 cursor-not-allowed'
                )}
              >
                {Icon && <Icon className="h-7 w-7" />}
                <span className="text-xs font-medium leading-tight whitespace-pre-line">{mod.name}</span>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
