import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { OrgStatusBadge } from './OrgStatusBadge';
import type { Organization } from '@/api/types';

interface OrgTableProps {
  organizations: Organization[];
}

export function OrgTable({ organizations }: OrgTableProps) {
  const navigate = useNavigate();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Modules</TableHead>
          <TableHead className="text-right">Users</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {organizations.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
              No organizations found
            </TableCell>
          </TableRow>
        )}
        {organizations.map((org) => (
          <TableRow key={org.id} className="cursor-pointer" onClick={() => navigate(`/organizations/${org.id}`)}>
            <TableCell className="font-medium">{org.name}</TableCell>
            <TableCell><OrgStatusBadge status={org.status} /></TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {org.enabledModules.length === 0 ? (
                  <span className="text-muted-foreground text-xs">None</span>
                ) : (
                  org.enabledModules.map((m) => (
                    <Badge key={m} variant="secondary" className="text-xs capitalize">{m}</Badge>
                  ))
                )}
              </div>
            </TableCell>
            <TableCell className="text-right">{org.userCount}</TableCell>
            <TableCell className="text-muted-foreground">
              {format(new Date(org.createdAt), 'MMM d, yyyy')}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
