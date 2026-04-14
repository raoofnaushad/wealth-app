import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserAccessActions } from './UserAccessActions';
import type { PlatformUser } from '@/api/types';

interface UserTableProps {
  users: PlatformUser[];
  onUpdate: () => void;
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  invited: 'bg-blue-100 text-blue-700 border-blue-200',
  suspended: 'bg-amber-100 text-amber-700 border-amber-200',
};

export function UserTable({ users, onUpdate }: UserTableProps) {
  const navigate = useNavigate();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead><TableHead>Email</TableHead>
          <TableHead>Organization</TableHead><TableHead>Status</TableHead>
          <TableHead>Module Roles</TableHead><TableHead>Last Login</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 && (
          <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
        )}
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <button className="text-primary hover:underline text-sm" onClick={() => navigate(`/organizations/${user.tenantId}`)}>
                {user.organizationName}
              </button>
            </TableCell>
            <TableCell><Badge variant="outline" className={statusColors[user.status]}>{user.status}</Badge></TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {user.moduleRoles.length === 0 ? (
                  <span className="text-muted-foreground text-xs">None</span>
                ) : (
                  user.moduleRoles.map((r) => (<Badge key={r.module} variant="secondary" className="text-xs">{r.module}: {r.role}</Badge>))
                )}
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {user.lastLoginAt ? format(new Date(user.lastLoginAt), 'MMM d, yyyy') : 'Never'}
            </TableCell>
            <TableCell><UserAccessActions user={user} onUpdate={onUpdate} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
