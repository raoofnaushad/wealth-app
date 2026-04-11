import { useEffect, useMemo, useState } from 'react'
import { useAdminStore } from '@/store/useAdminStore'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Search, UserPlus } from 'lucide-react'
import { UserRoleBadge } from '../components/UserRoleBadge'
import { ModuleRoleSelector } from '../components/ModuleRoleSelector'
import { InviteUserDialog } from '../components/InviteUserDialog'
import type { ModuleRole, ModuleSlug, ModuleRoleAssignment, OrgUser } from '../types'

const MODULE_COLUMNS: { slug: ModuleSlug; label: string }[] = [
  { slug: 'deals', label: 'Deals' },
  { slug: 'engage', label: 'Engage' },
  { slug: 'plan', label: 'Plan' },
  { slug: 'insights', label: 'Insights' },
  { slug: 'tools', label: 'Tools' },
]

function getInitials(user: OrgUser): string {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
}

const statusVariant: Record<OrgUser['status'], 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  invited: 'secondary',
  suspended: 'destructive',
}

export function UsersPage() {
  const { users, loadingUsers, fetchUsers, updateUserRoles, updateUserStatus, removeUser } = useAdminStore()
  const [search, setSearch] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null)
  const [editRoles, setEditRoles] = useState<Record<ModuleSlug, ModuleRole | 'none'>>({
    admin: 'none', deals: 'none', engage: 'none', plan: 'none', insights: 'none', tools: 'none',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    if (selectedUser) {
      const roles: Record<ModuleSlug, ModuleRole | 'none'> = {
        admin: 'none', deals: 'none', engage: 'none', plan: 'none', insights: 'none', tools: 'none',
      }
      for (const r of selectedUser.moduleRoles) {
        roles[r.moduleSlug] = r.role
      }
      setEditRoles(roles)
    }
  }, [selectedUser])

  const filtered = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase()
    return users.filter(
      (u) =>
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    )
  }, [users, search])

  async function handleSaveRoles() {
    if (!selectedUser) return
    setSaving(true)
    const moduleRoles: ModuleRoleAssignment[] = Object.entries(editRoles)
      .filter(([, role]) => role !== 'none')
      .map(([slug, role]) => ({ moduleSlug: slug as ModuleSlug, role: role as ModuleRole }))
    await updateUserRoles(selectedUser.id, moduleRoles)
    setSaving(false)
    setSelectedUser(null)
  }

  async function handleSuspendUser() {
    if (!selectedUser) return
    const newStatus = selectedUser.status === 'suspended' ? 'active' : 'suspended'
    await updateUserStatus(selectedUser.id, newStatus)
    setSelectedUser(null)
  }

  async function handleRemoveUser() {
    if (!selectedUser) return
    await removeUser(selectedUser.id)
    setSelectedUser(null)
  }

  if (loadingUsers) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                {MODULE_COLUMNS.map((col) => (
                  <TableHead key={col.slug}>{col.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => {
                const isAdmin = user.moduleRoles.some(
                  (r) => r.moduleSlug === 'admin',
                )
                return (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedUser(user)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{getInitials(user)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {user.firstName} {user.lastName}
                            </span>
                            {isAdmin && (
                              <Badge variant="secondary" className="text-xs">
                                Admin
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[user.status]}>
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </Badge>
                    </TableCell>
                    {MODULE_COLUMNS.map((col) => {
                      const assignment = user.moduleRoles.find(
                        (r) => r.moduleSlug === col.slug,
                      )
                      return (
                        <TableCell key={col.slug}>
                          {assignment ? (
                            <UserRoleBadge role={assignment.role} />
                          ) : (
                            <span className="text-muted-foreground">&mdash;</span>
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={2 + MODULE_COLUMNS.length}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <InviteUserDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />

      {/* User Edit Modal */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
              </DialogHeader>

              <div className="space-y-5 py-2">
                {/* User info */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{getInitials(selectedUser)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{selectedUser.firstName} {selectedUser.lastName}</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <Badge variant={statusVariant[selectedUser.status]}>
                    {selectedUser.status.charAt(0).toUpperCase() + selectedUser.status.slice(1)}
                  </Badge>
                </div>

                <Separator />

                {/* Module Roles */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Module Roles</h3>
                  <div className="space-y-1">
                    {MODULE_COLUMNS.map((m) => (
                      <ModuleRoleSelector
                        key={m.slug}
                        moduleSlug={m.slug}
                        moduleLabel={m.label}
                        value={editRoles[m.slug]}
                        onChange={(role) => setEditRoles({ ...editRoles, [m.slug]: role })}
                      />
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Danger zone */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={handleSuspendUser}
                  >
                    {selectedUser.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={handleRemoveUser}
                  >
                    Remove
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedUser(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveRoles} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
