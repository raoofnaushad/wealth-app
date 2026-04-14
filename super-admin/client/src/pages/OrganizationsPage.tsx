import { useEffect, useState } from 'react';
import { useOrgStore } from '@/store/useOrgStore';
import { OrgTable } from '@/components/organizations/OrgTable';
import { CreateOrgDialog } from '@/components/organizations/CreateOrgDialog';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';

export function OrganizationsPage() {
  const { organizations, loading, fetchOrganizations } = useOrgStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchOrganizations({
      search: search || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
    });
  }, [fetchOrganizations, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Organizations</h1>
        <CreateOrgDialog />
      </div>
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search organizations…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {loading ? (
        <div className="text-muted-foreground py-8 text-center">Loading…</div>
      ) : (
        <OrgTable organizations={organizations} />
      )}
    </div>
  );
}
