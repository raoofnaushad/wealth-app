import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { api } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Puzzle } from 'lucide-react';
import type { DashboardStats } from '@/api/types';

export function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api.get<DashboardStats>(ENDPOINTS.dashboard.stats).then(setStats);
  }, []);

  if (!stats) {
    return <div className="text-muted-foreground py-8 text-center">Loading…</div>;
  }

  const summaryCards = [
    {
      title: 'Organizations',
      icon: Building2,
      total: stats.organizations.total,
      detail: `${stats.organizations.active} active · ${stats.organizations.suspended} suspended`,
    },
    {
      title: 'Users',
      icon: Users,
      total: stats.users.total,
      detail: `${stats.users.active} active · ${stats.users.suspended} suspended`,
    },
    {
      title: 'Modules Licensed',
      icon: Puzzle,
      total: stats.modulesLicensed,
      detail: 'Across all organizations',
    },
  ];

  const actionLabels: Record<string, string> = {
    'org.created': 'Created organization',
    'org.updated': 'Updated organization',
    'org.suspended': 'Suspended organization',
    'org.reactivated': 'Reactivated organization',
    'org.modules_updated': 'Updated modules for',
    'user.suspended': 'Suspended user',
    'user.reactivated': 'Reactivated user',
    'user.module_role_granted': 'Granted module access to',
    'user.module_role_revoked': 'Revoked module access from',
    'auth.login': 'Logged in',
    'auth.logout': 'Logged out',
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summaryCards.map(({ title, icon: Icon, total, detail }) => (
          <Card key={title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{title}</p>
                  <p className="text-3xl font-bold mt-1">{total}</p>
                  <p className="text-xs text-muted-foreground mt-1">{detail}</p>
                </div>
                <Icon className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Activity</CardTitle>
          <button className="text-sm text-primary hover:underline" onClick={() => navigate('/audit-logs')}>
            View All
          </button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentActivity.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm">
                    <span className="font-medium">{entry.adminName}</span>{' '}
                    <span className="text-muted-foreground">{actionLabels[entry.action] || entry.action}</span>{' '}
                    <span className="font-medium">{entry.resourceName}</span>
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-4">
                  {format(new Date(entry.createdAt), 'MMM d, HH:mm')}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
