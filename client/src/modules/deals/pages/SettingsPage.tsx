import { useEffect, useState, useCallback } from 'react'
import { Loader2, Mail, HardDrive, Calendar, Trash2, Lock } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InvestmentTypeList } from '../components/settings/InvestmentTypeList'
import { TemplateList } from '../components/settings/TemplateList'
import { useDealsStore } from '../store'
import { useAuthStore } from '@/store/useAuthStore'
import { dealsApi } from '../api'
import type { EmailAccount, GoogleDriveAccount, GoogleCalendarAccount } from '../types'

export function SettingsPage() {
  const { fetchInvestmentTypes, fetchTemplates } = useDealsStore()
  const role = useAuthStore((s) => s.getModuleRole('deals'))

  if (role === 'analyst') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <Lock className="size-10 text-muted-foreground/50" />
        <p className="font-medium">Access Restricted</p>
        <p className="text-sm text-muted-foreground">Settings are only accessible to Managers and Owners.</p>
      </div>
    )
  }

  useEffect(() => {
    fetchInvestmentTypes()
    fetchTemplates()
  }, [fetchInvestmentTypes, fetchTemplates])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Deals Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage investment type snapshots, document templates, and integrations.
        </p>
      </div>

      <Tabs defaultValue="snapshots">
        <TabsList>
          <TabsTrigger value="snapshots">Snapshot Configuration</TabsTrigger>
          <TabsTrigger value="templates">Document Templates</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="snapshots">
          <InvestmentTypeList />
        </TabsContent>

        <TabsContent value="templates">
          <TemplateList />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function IntegrationsTab() {
  const {
    emailAccounts,
    googleDriveAccounts,
    fetchEmailAccounts,
    fetchGoogleDriveAccounts,
    loadingDrive,
  } = useDealsStore()

  const [loadingEmail, setLoadingEmail] = useState(false)
  const [connectingEmail, setConnectingEmail] = useState(false)
  const [connectingDrive, setConnectingDrive] = useState(false)
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null)

  // Google Calendar state
  const [calendarAccounts, setCalendarAccounts] = useState<GoogleCalendarAccount[]>([])
  const [loadingCalendar, setLoadingCalendar] = useState(false)
  const [connectingCalendar, setConnectingCalendar] = useState(false)

  useEffect(() => {
    setLoadingEmail(true)
    fetchEmailAccounts().finally(() => setLoadingEmail(false))
    fetchGoogleDriveAccounts()
    setLoadingCalendar(true)
    dealsApi.listCalendarAccounts().then(setCalendarAccounts).finally(() => setLoadingCalendar(false))
  }, [fetchEmailAccounts, fetchGoogleDriveAccounts])

  const handleConnectEmail = useCallback(async () => {
    setConnectingEmail(true)
    try {
      await dealsApi.connectEmailAccount({ emailAddress: 'analyst@watar.com' })
      await fetchEmailAccounts()
    } finally {
      setConnectingEmail(false)
    }
  }, [fetchEmailAccounts])

  const handleDisconnectEmail = useCallback(async (id: string) => {
    setDisconnectingId(id)
    try {
      await dealsApi.disconnectEmailAccount(id)
      await fetchEmailAccounts()
    } finally {
      setDisconnectingId(null)
    }
  }, [fetchEmailAccounts])

  const handleConnectDrive = useCallback(async () => {
    setConnectingDrive(true)
    try {
      await dealsApi.connectGoogleDrive({ emailAddress: 'analyst@watar.com' })
      await fetchGoogleDriveAccounts()
    } finally {
      setConnectingDrive(false)
    }
  }, [fetchGoogleDriveAccounts])

  const handleDisconnectDrive = useCallback(async (id: string) => {
    setDisconnectingId(id)
    try {
      await dealsApi.disconnectGoogleDrive(id)
      await fetchGoogleDriveAccounts()
    } finally {
      setDisconnectingId(null)
    }
  }, [fetchGoogleDriveAccounts])

  const handleConnectCalendar = useCallback(async () => {
    setConnectingCalendar(true)
    try {
      await dealsApi.connectCalendar({ emailAddress: 'analyst@watar.com' })
      const updated = await dealsApi.listCalendarAccounts()
      setCalendarAccounts(updated)
    } finally {
      setConnectingCalendar(false)
    }
  }, [])

  const handleDisconnectCalendar = useCallback(async (id: string) => {
    setDisconnectingId(id)
    try {
      await dealsApi.disconnectCalendar(id)
      const updated = await dealsApi.listCalendarAccounts()
      setCalendarAccounts(updated)
    } finally {
      setDisconnectingId(null)
    }
  }, [])

  return (
    <div className="space-y-6 pt-4">
      {/* Gmail Integration */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="size-5 text-muted-foreground" />
            <h3 className="text-base font-medium">Gmail</h3>
          </div>
          <Button size="sm" onClick={handleConnectEmail} disabled={connectingEmail}>
            {connectingEmail ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect Gmail'
            )}
          </Button>
        </div>

        {loadingEmail ? (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Loading accounts...
          </div>
        ) : emailAccounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No Gmail accounts connected.</p>
        ) : (
          <div className="space-y-2">
            {emailAccounts.map((account: EmailAccount) => (
              <div
                key={account.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm">{account.emailAddress}</span>
                  <EmailStatusBadge status={account.status} />
                  {account.lastSyncedAt && (
                    <span className="text-xs text-muted-foreground">
                      Last synced: {new Date(account.lastSyncedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDisconnectEmail(account.id)}
                  disabled={disconnectingId === account.id}
                >
                  {disconnectingId === account.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Google Drive Integration */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="size-5 text-muted-foreground" />
            <h3 className="text-base font-medium">Google Drive</h3>
          </div>
          <Button size="sm" onClick={handleConnectDrive} disabled={connectingDrive}>
            {connectingDrive ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect Google Drive'
            )}
          </Button>
        </div>

        {loadingDrive ? (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Loading accounts...
          </div>
        ) : googleDriveAccounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No Google Drive accounts connected.</p>
        ) : (
          <div className="space-y-2">
            {googleDriveAccounts.map((account: GoogleDriveAccount) => (
              <div
                key={account.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm">{account.emailAddress ?? 'Unknown'}</span>
                  <Badge variant={account.status === 'connected' ? 'default' : 'outline'}>
                    {account.status}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDisconnectDrive(account.id)}
                  disabled={disconnectingId === account.id}
                >
                  {disconnectingId === account.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Google Calendar Integration */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="size-5 text-muted-foreground" />
            <h3 className="text-base font-medium">Google Calendar</h3>
          </div>
          <Button size="sm" onClick={handleConnectCalendar} disabled={connectingCalendar}>
            {connectingCalendar ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect Calendar'
            )}
          </Button>
        </div>

        {loadingCalendar ? (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Loading accounts...
          </div>
        ) : calendarAccounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No Google Calendar accounts connected.</p>
        ) : (
          <div className="space-y-2">
            {calendarAccounts.map((account: GoogleCalendarAccount) => (
              <div
                key={account.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm">{account.emailAddress}</span>
                  <Badge variant={account.status === 'connected' ? 'default' : account.status === 'error' ? 'destructive' : 'outline'}>
                    {account.status}
                  </Badge>
                  {account.lastSyncedAt && (
                    <span className="text-xs text-muted-foreground">
                      Last synced: {new Date(account.lastSyncedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDisconnectCalendar(account.id)}
                  disabled={disconnectingId === account.id}
                >
                  {disconnectingId === account.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function EmailStatusBadge({ status }: { status: EmailAccount['status'] }) {
  const variantMap: Record<EmailAccount['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
    connected: 'default',
    syncing: 'secondary',
    error: 'destructive',
    disconnected: 'outline',
  }
  return <Badge variant={variantMap[status]}>{status}</Badge>
}
