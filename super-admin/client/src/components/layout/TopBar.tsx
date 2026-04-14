import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';

export function TopBar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="h-14 shrink-0 border-b border-border bg-card flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">{user?.email}</span>
        <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  );
}
