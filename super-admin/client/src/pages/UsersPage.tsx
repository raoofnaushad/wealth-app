import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { UserTable } from '@/components/users/UserTable';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import type { PlatformUser, PaginatedResponse, Organization } from '@/api/types';

export function UsersPage() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orgFilter, setOrgFilter] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const query = new URLSearchParams();
    if (search) query.set('search', search);
    if (statusFilter !== 'all') query.set('status', statusFilter);
    if (orgFilter !== 'all') query.set('organizationId', orgFilter);
    const qs = query.toString();
    const url = `${ENDPOINTS.users.list}${qs ? `?${qs}` : ''}`;
    api.get<PaginatedResponse<PlatformUser>>(url).then((res) => {
      setUsers(res.data);
      setLoaded(true);
    });
  }, [search, statusFilter, orgFilter, refreshKey]);

  useEffect(() => {
    api.get<PaginatedResponse<Organization>>(ENDPOINTS.organizations.list).then((res) => setOrgs(res.data));
  }, []);

  function fetchUsers() {
    setLoaded(false);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Users</h1>
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="invited">Invited</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={orgFilter} onValueChange={(v) => setOrgFilter(v ?? 'all')}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Organization" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Organizations</SelectItem>
            {orgs.map((org) => (<SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      {!loaded ? (
        <div className="text-muted-foreground py-8 text-center">Loading…</div>
      ) : (
        <UserTable users={users} onUpdate={fetchUsers} />
      )}
    </div>
  );
}
