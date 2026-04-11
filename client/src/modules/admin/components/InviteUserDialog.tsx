import { useState } from 'react'
import { useAdminStore } from '@/store/useAdminStore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Mail } from 'lucide-react'
import { ModuleRoleSelector } from './ModuleRoleSelector'
import type { ModuleRole, ModuleSlug, ModuleRoleAssignment } from '../types'

interface InviteUserDialogProps {
  open: boolean
  onClose: () => void
}

type ModuleRoles = Record<ModuleSlug, ModuleRole | 'none'>

const MODULES: { slug: ModuleSlug; label: string }[] = [
  { slug: 'deals', label: 'Deals' },
  { slug: 'engage', label: 'Engage' },
  { slug: 'plan', label: 'Plan' },
  { slug: 'insights', label: 'Insights' },
  { slug: 'tools', label: 'Tools' },
]

const INITIAL_ROLES: ModuleRoles = {
  admin: 'none',
  deals: 'none',
  engage: 'none',
  plan: 'none',
  insights: 'none',
  tools: 'none',
}

export function InviteUserDialog({ open, onClose }: InviteUserDialogProps) {
  const sendInvitation = useAdminStore((s) => s.sendInvitation)

  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [roles, setRoles] = useState<ModuleRoles>({ ...INITIAL_ROLES })
  const [sending, setSending] = useState(false)

  function reset() {
    setStep(1)
    setEmail('')
    setFirstName('')
    setLastName('')
    setRoles({ ...INITIAL_ROLES })
    setSending(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleRoleChange(slug: ModuleSlug, role: ModuleRole | 'none') {
    setRoles((prev) => ({ ...prev, [slug]: role }))
  }

  async function handleSend() {
    setSending(true)
    const moduleRoles: ModuleRoleAssignment[] = Object.entries(roles)
      .filter(([, role]) => role !== 'none')
      .map(([slug, role]) => ({
        moduleSlug: slug as ModuleSlug,
        role: role as ModuleRole,
      }))

    try {
      await sendInvitation({ email, firstName, lastName, moduleRoles })
      setStep(3)
    } finally {
      setSending(false)
    }
  }

  const step1Valid = email.trim() !== '' && firstName.trim() !== '' && lastName.trim() !== ''

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Invite User</DialogTitle>
              <DialogDescription>
                Enter the details of the user you want to invite.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="user@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-first">First Name</Label>
                <Input
                  id="invite-first"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-last">Last Name</Label>
                <Input
                  id="invite-last"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button disabled={!step1Valid} onClick={() => setStep(2)}>
                Next
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Assign Roles</DialogTitle>
              <DialogDescription>
                Choose a role for each module. Leave as &ldquo;No access&rdquo; to skip.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {MODULES.map((m) => (
                <ModuleRoleSelector
                  key={m.slug}
                  moduleSlug={m.slug}
                  moduleLabel={m.label}
                  value={roles[m.slug]}
                  onChange={(role) => handleRoleChange(m.slug, role)}
                />
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleSend} disabled={sending}>
                {sending ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 3 && (
          <>
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Invitation Sent</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  An invitation has been sent to{' '}
                  <span className="font-medium text-foreground">{email}</span>.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
