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
import { Search, UserPlus } from 'lucide-react'
import { UserRoleBadge } from '../components/UserRoleBadge'
import { InviteUserDialog } from '../components/InviteUserDialog'
import type { ModuleSlug, OrgUser } from '../types'

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
  const { users, loadingUsers, fetchUsers } = useAdminStore()
  const [search, setSearch] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

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
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar size="sm">
                          <AvatarFallback>{getInitials(user)}</AvatarFallback>
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
    </div>
  )
}
