import { Outlet } from 'react-router-dom';

export function AdminShell() {
  return (
    <div className="flex h-screen">
      <aside className="w-60 bg-sidebar text-sidebar-foreground p-4">
        <div className="text-lg font-bold mb-8">Super Admin</div>
        <nav className="space-y-1">
          <a href="/" className="block px-3 py-2 rounded hover:bg-sidebar-accent">Dashboard</a>
          <a href="/organizations" className="block px-3 py-2 rounded hover:bg-sidebar-accent">Organizations</a>
          <a href="/users" className="block px-3 py-2 rounded hover:bg-sidebar-accent">Users</a>
          <a href="/audit-logs" className="block px-3 py-2 rounded hover:bg-sidebar-accent">Audit Logs</a>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-8 bg-background">
        <Outlet />
      </main>
    </div>
  );
}
