import { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus } from 'lucide-react';
import type { Organization, PaginatedResponse, CreateUserPayload } from '@/api/types';

interface AddUserDialogProps {
  orgId?: string;
  onCreated: () => void;
}

export function AddUserDialog({ orgId, onCreated }: AddUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState(orgId ?? '');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    if (!orgId) {
      api
        .get<PaginatedResponse<Organization>>(ENDPOINTS.organizations.list)
        .then((res) => setOrgs(res.data));
    }
  }, [orgId]);

  function reset() {
    setEmail('');
    setFirstName('');
    setLastName('');
    if (!orgId) setSelectedOrg('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tenantId = orgId ?? selectedOrg;
    if (!tenantId) return;
    setLoading(true);
    try {
      const payload: CreateUserPayload = {
        tenantId,
        email,
        firstName,
        lastName,
      };
      await api.post(ENDPOINTS.users.create, payload);
      reset();
      setOpen(false);
      onCreated();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-2" />}>
        <UserPlus className="h-4 w-4" />
        Add User
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!orgId && (
            <div className="space-y-2">
              <Label>Organization *</Label>
              <Select value={selectedOrg} onValueChange={(v) => setSelectedOrg(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="user-first">First Name *</Label>
              <Input
                id="user-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-last">Last Name *</Label>
              <Input
                id="user-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-email">Email *</Label>
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            The user will be added with "invited" status. Module roles can be assigned after creation.
          </p>
          <Button
            type="submit"
            className="w-full"
            disabled={loading || (!orgId && !selectedOrg)}
          >
            {loading ? 'Adding…' : 'Add User'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
