import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { dealsApi } from '../../api'
import type { TeamMember } from '../../types'

interface ShareDialogProps {
  documentId: string
  documentName: string
  onClose: () => void
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const roleLabels: Record<string, string> = {
  manager: 'Manager',
  analyst: 'Analyst',
  owner: 'Owner',
}

export function ShareDialog({ documentId, documentName, onClose }: ShareDialogProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [selectedUsers, setSelectedUsers] = useState<Map<string, 'read' | 'read_write'>>(new Map())
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function fetchMembers() {
      try {
        const members = await dealsApi.listTeamMembers()
        if (!cancelled) setTeamMembers(members)
      } catch {
        // silently handle
      } finally {
        if (!cancelled) setLoadingMembers(false)
      }
    }
    fetchMembers()
    return () => { cancelled = true }
  }, [])

  function handleToggleUser(memberId: string) {
    setSelectedUsers((prev) => {
      const next = new Map(prev)
      if (next.has(memberId)) {
        next.delete(memberId)
      } else {
        next.set(memberId, 'read')
      }
      return next
    })
  }

  function handlePermissionChange(memberId: string, permission: 'read' | 'read_write') {
    setSelectedUsers((prev) => {
      const next = new Map(prev)
      next.set(memberId, permission)
      return next
    })
  }

  async function handleSubmit() {
    if (selectedUsers.size === 0) return

    setSubmitting(true)
    try {
      // Group by permission
      const byPermission = new Map<string, string[]>()
      for (const [userId, perm] of selectedUsers) {
        if (!byPermission.has(perm)) byPermission.set(perm, [])
        byPermission.get(perm)!.push(userId)
      }

      // Create share for each permission group
      await Promise.all(
        Array.from(byPermission).map(([permission, userIds]) =>
          dealsApi.shareDocument(documentId, { sharedWith: userIds, permission })
        )
      )

      onClose()
    } catch {
      // Error handling will be improved when toast notifications are added
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = selectedUsers.size > 0 && !submitting

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Document</DialogTitle>
          <DialogDescription>
            Share <span className="font-medium text-foreground">{documentName}</span> with team members and set their permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Select team members:</Label>
          <div className="max-h-72 space-y-0.5 overflow-y-auto rounded-md border p-2">
            {loadingMembers ? (
              <p className="py-3 text-center text-xs text-muted-foreground">
                Loading team members...
              </p>
            ) : teamMembers.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">
                No team members found.
              </p>
            ) : (
              teamMembers.map((member) => {
                const isSelected = selectedUsers.has(member.id)
                const permission = selectedUsers.get(member.id) ?? 'read'

                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 rounded-md px-2 py-2 transition-colors ${
                      isSelected ? 'bg-muted/40' : 'hover:bg-muted/30'
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleUser(member.id)}
                    />
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                      {getInitials(member.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{member.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {roleLabels[member.role] ?? member.role}
                      </div>
                    </div>
                    {isSelected && (
                      <Select
                        value={permission}
                        onValueChange={(val) => handlePermissionChange(member.id, val as 'read' | 'read_write')}
                      >
                        <SelectTrigger className="w-28 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="read">Read</SelectItem>
                          <SelectItem value="read_write">Read & Write</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting
              ? 'Sharing...'
              : `Share with ${selectedUsers.size} member${selectedUsers.size !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
