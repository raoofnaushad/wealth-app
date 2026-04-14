import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { OrganizationsPage } from '@/pages/OrganizationsPage';
import { OrgDetailPage } from '@/pages/OrgDetailPage';
import { UsersPage } from '@/pages/UsersPage';
import { AuditLogPage } from '@/pages/AuditLogPage';
import { AdminShell } from '@/components/layout/AdminShell';

function AuthGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function GuestGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<GuestGuard />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
        <Route element={<AuthGuard />}>
          <Route element={<AdminShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/organizations" element={<OrganizationsPage />} />
            <Route path="/organizations/:id" element={<OrgDetailPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/audit-logs" element={<AuditLogPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
