import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useDealsStore } from '../store'
import { dealsApi } from '../api'
import { EmailAccountList } from '../components/email/EmailAccountList'
import { ConnectGmailButton } from '../components/email/ConnectGmailButton'
import { EmailList } from '../components/email/EmailList'
import { EmailPreview } from '../components/email/EmailPreview'
import { ImportEmailDialog } from '../components/email/ImportEmailDialog'
import type { SyncedEmail } from '../types'

export function EmailHubPage() {
  const {
    emailAccounts,
    syncedEmails,
    selectedEmail,
    loadingEmails,
    fetchEmailAccounts,
    fetchEmails,
    selectEmail,
  } = useDealsStore()

  const [importingEmail, setImportingEmail] = useState<SyncedEmail | null>(null)

  useEffect(() => {
    fetchEmailAccounts()
    fetchEmails()
  }, [fetchEmailAccounts, fetchEmails])

  async function handleSync(accountId: string) {
    try {
      await dealsApi.triggerEmailSync(accountId)
      await fetchEmailAccounts()
      await fetchEmails()
      toast.success('Email sync triggered successfully.')
    } catch {
      toast.error('Failed to sync email account. Please try again.')
    }
  }

  async function handleDisconnect(accountId: string) {
    try {
      await dealsApi.disconnectEmailAccount(accountId)
      await fetchEmailAccounts()
    } catch {
      toast.error('Failed to disconnect email account.')
    }
  }

  async function handleIgnore() {
    if (!selectedEmail) return
    try {
      await dealsApi.ignoreEmail(selectedEmail.id)
      await fetchEmails()
      selectEmail(null)
    } catch {
      toast.error('Failed to ignore email.')
    }
  }

  async function handleUnignore() {
    if (!selectedEmail) return
    try {
      await dealsApi.unignoreEmail(selectedEmail.id)
      await fetchEmails()
      selectEmail(null)
      toast.success('Email restored to inbox.')
    } catch {
      toast.error('Failed to unignore email.')
    }
  }

  function handleImportClose() {
    setImportingEmail(null)
    fetchEmails()
    selectEmail(null)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Email Hub</h1>
        <ConnectGmailButton
          onConnected={fetchEmailAccounts}
          onError={() => toast.error('Failed to connect Gmail account. Please try again.')}
        />
      </div>

      {/* Connected accounts */}
      <EmailAccountList
        accounts={emailAccounts}
        onSync={handleSync}
        onDisconnect={handleDisconnect}
      />

      {/* Main area */}
      {loadingEmails ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Loading emails...
        </div>
      ) : (
        <div className="flex gap-6">
          <div className={selectedEmail ? 'w-[60%] min-w-0' : 'w-full'}>
            <EmailList
              emails={syncedEmails}
              selectedId={selectedEmail?.id ?? null}
              onSelect={selectEmail}
            />
          </div>
          {selectedEmail && (
            <div className="w-[40%] min-w-0">
              <EmailPreview
                email={selectedEmail}
                onImport={() => setImportingEmail(selectedEmail)}
                onIgnore={handleIgnore}
                onUnignore={handleUnignore}
                onClose={() => selectEmail(null)}
              />
            </div>
          )}
        </div>
      )}

      {/* Import dialog */}
      {importingEmail && (
        <ImportEmailDialog
          email={importingEmail}
          onClose={handleImportClose}
        />
      )}
    </div>
  )
}
