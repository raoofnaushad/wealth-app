import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/LoginPage'
import { ModulesHomePage } from '@/pages/ModulesHomePage'
import { DashboardPage } from '@/pages/DashboardPage'
import { AgentsPage } from '@/pages/AgentsPage'
import { AgentDetailPage } from '@/pages/AgentDetailPage'
import { RunDetailPage } from '@/pages/RunDetailPage'
import { TriggerPage } from '@/pages/TriggerPage'
import { RunsPage } from '@/pages/RunsPage'
import { MeetingBriefPage } from '@/pages/MeetingBriefPage'
import { ChatPage } from '@/pages/ChatPage'

// Administration module
import { AdminLayout } from '@/modules/admin/pages/AdminLayout'

// Deals module
import { DealsLayout } from '@/modules/deals/pages/DealsLayout'
import { DealsDashboardPage } from '@/modules/deals/pages/DashboardPage'
import { OpportunityListPage } from '@/modules/deals/pages/OpportunityListPage'
import { SettingsPage as DealsSettingsPage } from '@/modules/deals/pages/SettingsPage'
import { MandateListPage } from '@/modules/deals/pages/MandateListPage'
import { MandateDetailPage } from '@/modules/deals/pages/MandateDetailPage'
import { AssetManagerListPage } from '@/modules/deals/pages/AssetManagerListPage'
import { AssetManagerDetailPage } from '@/modules/deals/pages/AssetManagerDetailPage'
import { NewsPage } from '@/modules/deals/pages/NewsPage'
import { CompanyProfilePage } from '@/modules/admin/pages/CompanyProfilePage'
import { BrandingPage } from '@/modules/admin/pages/BrandingPage'
import { UsersPage } from '@/modules/admin/pages/UsersPage'
import { PreferencesPage } from '@/modules/admin/pages/PreferencesPage'

// My Account
import { AccountLayout } from '@/pages/AccountLayout'
import { ProfilePage } from '@/pages/ProfilePage'
import { SecurityPage } from '@/pages/SecurityPage'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function GuestGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (isAuthenticated) return <Navigate to="/home" replace />
  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <GuestGuard>
              <LoginPage />
            </GuestGuard>
          }
        />
        {/* Main app — with sidebar layout */}
        <Route
          path="/home"
          element={
            <AuthGuard>
              <AppShell />
            </AuthGuard>
          }
        >
          <Route index element={<ModulesHomePage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="meetings/:meetingId" element={<MeetingBriefPage />} />
          <Route path="agents" element={<AgentsPage />} />
          <Route path="agents/:workflow" element={<AgentDetailPage />} />
          <Route path="agents/:workflow/trigger" element={<TriggerPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="runs" element={<RunsPage />} />
          <Route path="runs/:runId" element={<RunDetailPage />} />

          {/* Administration module */}
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="company" replace />} />
            <Route path="company" element={<CompanyProfilePage />} />
            <Route path="branding" element={<BrandingPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="preferences" element={<PreferencesPage />} />
          </Route>

          {/* Deals module */}
          <Route path="deals" element={<DealsLayout />}>
            <Route index element={<DealsDashboardPage />} />
            <Route path="mandates" element={<MandateListPage />} />
            <Route path="mandates/:mandateId" element={<MandateDetailPage />} />
            <Route path="opportunities" element={<OpportunityListPage />} />
            <Route path="asset-managers" element={<AssetManagerListPage />} />
            <Route path="asset-managers/:assetManagerId" element={<AssetManagerDetailPage />} />
            <Route path="news" element={<NewsPage />} />
            <Route path="settings" element={<DealsSettingsPage />} />
          </Route>

          {/* My Account */}
          <Route path="account" element={<AccountLayout />}>
            <Route index element={<ProfilePage />} />
            <Route path="security" element={<SecurityPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
