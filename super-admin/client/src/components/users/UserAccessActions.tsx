import { useState } from 'react';
import { api } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Ban, RotateCcw, Plus, Minus } from 'lucide-react';
import type { PlatformUser, ModuleSlug } from '@/api/types';

const ALL_MODULES: ModuleSlug[] = ['engage', 'plan', 'tools', 'deals', 'insights', 'admin'];
const ROLES = ['owner', 'manager', 'advisor', 'analyst', 'viewer'];

interface UserAccessActionsProps {
  user: PlatformUser;
  onUpdate: () => void;
}

export function UserAccessActions({ user, onUpdate }: UserAccessActionsProps) {
  const [grantModule, setGrantModule] = useState<ModuleSlug | ''>('');
  const [grantRole, setGrantRole] = useState('viewer');

  async function handleStatusChange(status: 'active' | 'suspended') {
    await api.patch(ENDPOINTS.users.status(user.id), { status });
    onUpdate();
  }

  async function handleRevokeModule(module: ModuleSlug) {
    await api.patch(ENDPOINTS.users.moduleRoles(user.id), { action: 'revoke', module });
    onUpdate();
  }

  async function handleGrantModule() {
    if (!grantModule) return;
    await api.patch(ENDPOINTS.users.moduleRoles(user.id), { action: 'grant', module: grantModule, role: grantRole });
    setGrantModule('');
    setGrantRole('viewer');
    onUpdate();
  }

  const existingModules = user.moduleRoles.map((r) => r.module);
  const availableModules = ALL_MODULES.filter((m) => !existingModules.includes(m));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="h-8 w-8 p-0" />}>
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {user.status === 'active' ? (
          <DropdownMenuItem onClick={() => handleStatusChange('suspended')}>
            <Ban className="h-4 w-4 mr-2" />Suspend User
          </DropdownMenuItem>
        ) : user.status === 'suspended' ? (
          <DropdownMenuItem onClick={() => handleStatusChange('active')}>
            <RotateCcw className="h-4 w-4 mr-2" />Reactivate User
          </DropdownMenuItem>
        ) : null}

        {user.moduleRoles.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger><Minus className="h-4 w-4 mr-2" />Revoke Module</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {user.moduleRoles.map((r) => (
                  <DropdownMenuItem key={r.module} onClick={() => handleRevokeModule(r.module)}>
                    {r.module} ({r.role})
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        )}

        {availableModules.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2 space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Plus className="h-3 w-3" />Grant Module Access
              </p>
              <Select value={grantModule} onValueChange={(v) => setGrantModule((v ?? '') as ModuleSlug)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Module" /></SelectTrigger>
                <SelectContent>
                  {availableModules.map((m) => (<SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={grantRole} onValueChange={(v) => setGrantRole(v ?? 'viewer')}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Role" /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (<SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>))}
                </SelectContent>
              </Select>
              <Button size="sm" className="w-full h-7 text-xs" disabled={!grantModule} onClick={handleGrantModule}>Grant</Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
