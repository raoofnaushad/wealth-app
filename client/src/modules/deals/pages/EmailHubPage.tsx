import { useEffect, useState } from 'react'
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
    } catch {
      // TODO: surface error
    }
  }

  async function handleDisconnect(accountId: string) {
    try {
      await dealsApi.disconnectEmailAccount(accountId)
      await fetchEmailAccounts()
    } catch {
      // TODO: surface error
    }
  }

  async function handleIgnore() {
    if (!selectedEmail) return
    try {
      await dealsApi.ignoreEmail(selectedEmail.id)
      await fetchEmails()
      selectEmail(null)
    } catch {
      // TODO: surface error
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
        <ConnectGmailButton onConnected={fetchEmailAccounts} />
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
