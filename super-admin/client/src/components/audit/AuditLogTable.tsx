import { format } from 'date-fns';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { AuditLogEntry } from '@/api/types';

interface AuditLogTableProps {
  logs: AuditLogEntry[];
}

const actionColors: Record<string, string> = {
  organization: 'bg-blue-100 text-blue-700 border-blue-200',
  user: 'bg-purple-100 text-purple-700 border-purple-200',
  auth: 'bg-slate-100 text-slate-700 border-slate-200',
  module_license: 'bg-teal-100 text-teal-700 border-teal-200',
};

export function AuditLogTable({ logs }: AuditLogTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Timestamp</TableHead><TableHead>Admin</TableHead>
          <TableHead>Action</TableHead><TableHead>Resource Type</TableHead>
          <TableHead>Resource</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.length === 0 && (
          <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No audit log entries found</TableCell></TableRow>
        )}
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell className="text-muted-foreground whitespace-nowrap">
              {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm')}
            </TableCell>
            <TableCell>{log.adminName}</TableCell>
            <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{log.action}</code></TableCell>
            <TableCell>
              <Badge variant="outline" className={actionColors[log.resourceType] || ''}>{log.resourceType}</Badge>
            </TableCell>
            <TableCell className="font-medium">{log.resourceName}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
