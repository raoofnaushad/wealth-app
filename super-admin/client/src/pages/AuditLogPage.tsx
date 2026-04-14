import { useEffect, useState } from 'react';
import { useAuditStore } from '@/store/useAuditStore';
import { AuditLogTable } from '@/components/audit/AuditLogTable';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const ACTION_TYPES = [
  'org.created', 'org.updated', 'org.suspended', 'org.reactivated', 'org.modules_updated',
  'user.suspended', 'user.reactivated', 'user.module_role_granted', 'user.module_role_revoked',
  'auth.login', 'auth.logout',
];

const RESOURCE_TYPES = ['organization', 'user', 'auth'];

export function AuditLogPage() {
  const { logs, loading, fetchLogs } = useAuditStore();
  const [actionFilter, setActionFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');

  useEffect(() => {
    fetchLogs({
      action: actionFilter === 'all' ? undefined : actionFilter,
      resourceType: resourceFilter === 'all' ? undefined : resourceFilter,
    });
  }, [fetchLogs, actionFilter, resourceFilter]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Logs</h1>
      <div className="flex items-center gap-4">
        <Select value={actionFilter} onValueChange={(v) => setActionFilter(v ?? 'all')}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {ACTION_TYPES.map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={resourceFilter} onValueChange={(v) => setResourceFilter(v ?? 'all')}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Resource Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Resources</SelectItem>
            {RESOURCE_TYPES.map((r) => (<SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      {loading ? (
        <div className="text-muted-foreground py-8 text-center">Loading…</div>
      ) : (
        <AuditLogTable logs={logs} />
      )}
    </div>
  );
}
