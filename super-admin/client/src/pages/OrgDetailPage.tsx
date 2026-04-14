import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrgStore } from '@/store/useOrgStore';
import { OrgStatusBadge } from '@/components/organizations/OrgStatusBadge';
import { ModuleLicenseToggle } from '@/components/organizations/ModuleLicenseToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { AddUserDialog } from '@/components/users/AddUserDialog';
import { ArrowLeft, Ban, RotateCcw } from 'lucide-react';
import type { ModuleSlug } from '@/api/types';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'SGD', 'CHF', 'JPY'];
const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Los_Angeles',
  'Europe/London', 'Europe/Helsinki', 'Asia/Dubai',
  'Asia/Riyadh', 'Asia/Singapore', 'Asia/Tokyo', 'UTC',
];

export function OrgDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentOrg, currentOrgUsers,
    fetchOrganization, fetchOrgUsers,
    updateOrganization, updateOrgStatus, updateOrgModules,
  } = useOrgStore();

  const [editName, setEditName] = useState('');
  const [editRegNum, setEditRegNum] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCurrency, setEditCurrency] = useState('');
  const [editTimezone, setEditTimezone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) { fetchOrganization(id); fetchOrgUsers(id); }
  }, [id, fetchOrganization, fetchOrgUsers]);

  useEffect(() => {
    if (currentOrg) {
      setEditName(currentOrg.name);
      setEditRegNum(currentOrg.registrationNumber || '');
      setEditWebsite(currentOrg.website || '');
      setEditEmail(currentOrg.supportEmail);
      setEditCurrency(currentOrg.currency);
      setEditTimezone(currentOrg.timezone);
    }
  }, [currentOrg]);

  if (!currentOrg) return <div className="text-muted-foreground py-8 text-center">Loading…</div>;

  async function handleSaveInfo() {
    if (!id) return;
    setSaving(true);
    try {
      await updateOrganization(id, {
        name: editName, registrationNumber: editRegNum || null,
        website: editWebsite || null, supportEmail: editEmail,
        currency: editCurrency, timezone: editTimezone,
      });
    } finally { setSaving(false); }
  }

  async function handleStatusToggle() {
    if (!id) return;
    const newStatus = currentOrg!.status === 'active' ? 'suspended' : 'active';
    await updateOrgStatus(id, newStatus);
  }

  async function handleModuleToggle(module: ModuleSlug, enabled: boolean) {
    if (!id || module === 'admin') return;
    const current = currentOrg!.enabledModules;
    let updated = enabled ? [...current, module] : current.filter((m) => m !== module);
    if (!updated.includes('admin')) updated = [...updated, 'admin'];
    await updateOrgModules(id, updated);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/organizations')}>
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>
          <h1 className="text-2xl font-bold">{currentOrg.name}</h1>
          <OrgStatusBadge status={currentOrg.status} />
        </div>
        <Button
          variant={currentOrg.status === 'active' ? 'destructive' : 'default'}
          size="sm" onClick={handleStatusToggle} className="gap-2"
        >
          {currentOrg.status === 'active' ? (<><Ban className="h-4 w-4" />Suspend Organization</>) : (<><RotateCcw className="h-4 w-4" />Reactivate Organization</>)}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Organization Info</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Name</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Support Email</Label><Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} /></div>
            <div className="space-y-2"><Label>Registration Number</Label><Input value={editRegNum} onChange={(e) => setEditRegNum(e.target.value)} /></div>
            <div className="space-y-2"><Label>Website</Label><Input value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={editCurrency} onValueChange={(v) => setEditCurrency(v ?? 'USD')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={editTimezone} onValueChange={(v) => setEditTimezone(v ?? 'UTC')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIMEZONES.map((tz) => (<SelectItem key={tz} value={tz}>{tz}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSaveInfo} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Module Licensing</CardTitle></CardHeader>
        <CardContent>
          <ModuleLicenseToggle enabledModules={currentOrg.enabledModules} onToggle={handleModuleToggle} disabled={currentOrg.status === 'suspended'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Users ({currentOrgUsers.length})</CardTitle>
          <AddUserDialog orgId={id} onCreated={() => { if (id) { fetchOrgUsers(id); fetchOrganization(id); } }} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Email</TableHead>
                <TableHead>Status</TableHead><TableHead>Module Roles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentOrgUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      user.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        : user.status === 'suspended' ? 'bg-amber-100 text-amber-700 border-amber-200'
                          : 'bg-blue-100 text-blue-700 border-blue-200'
                    }>{user.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.moduleRoles.length === 0 ? (
                        <span className="text-muted-foreground text-xs">None</span>
                      ) : (
                        user.moduleRoles.map((r) => (
                          <Badge key={r.module} variant="secondary" className="text-xs">{r.module}: {r.role}</Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
