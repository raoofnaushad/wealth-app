import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { ModuleSlug } from '@/api/types';
import { Users, Calculator, Wrench, Handshake, BarChart3, Shield } from 'lucide-react';

const MODULE_INFO: Record<ModuleSlug, { label: string; icon: typeof Users }> = {
  engage: { label: 'Engage', icon: Users },
  plan: { label: 'Plan', icon: Calculator },
  tools: { label: 'Tools', icon: Wrench },
  deals: { label: 'Deals', icon: Handshake },
  insights: { label: 'Insights', icon: BarChart3 },
  admin: { label: 'Admin', icon: Shield },
};

const ALL_MODULES: ModuleSlug[] = ['engage', 'plan', 'tools', 'deals', 'insights', 'admin'];

interface ModuleLicenseToggleProps {
  enabledModules: ModuleSlug[];
  onToggle: (module: ModuleSlug, enabled: boolean) => void;
  disabled?: boolean;
}

export function ModuleLicenseToggle({ enabledModules, onToggle, disabled }: ModuleLicenseToggleProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {ALL_MODULES.map((slug) => {
        const { label, icon: Icon } = MODULE_INFO[slug];
        const enabled = enabledModules.includes(slug);
        const isAdmin = slug === 'admin';
        return (
          <Card key={slug} className={cn('transition-colors', enabled ? 'border-primary/30 bg-primary/5' : '')}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{label}</span>
                {isAdmin && <span className="text-xs text-muted-foreground">(required)</span>}
              </div>
              <Switch
                checked={isAdmin ? true : enabled}
                onCheckedChange={(checked: boolean) => onToggle(slug, checked)}
                disabled={disabled || isAdmin}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
