import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { HardDrive, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useDealsStore } from '../../store'
import { dealsApi } from '../../api'
import { FolderBrowser } from './FolderBrowser'
import { ImportProgress } from './ImportProgress'

interface GoogleDriveImportDialogProps {
  onClose: () => void
}

type Step = 'connect' | 'browse' | 'importing' | 'done'

export function GoogleDriveImportDialog({ onClose }: GoogleDriveImportDialogProps) {
  const navigate = useNavigate()
  const { googleDriveAccounts, fetchGoogleDriveAccounts, loadingDrive } = useDealsStore()

  const [step, setStep] = useState<Step>('connect')
  const [connecting, setConnecting] = useState(false)
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([])
  const [importJobId, setImportJobId] = useState<string | null>(null)
  const [importSummary, setImportSummary] = useState<{ files: number; opportunities: number } | null>(null)
  const [starting, setStarting] = useState(false)

  const activeAccount = googleDriveAccounts.find((a) => a.status === 'connected') ?? null

  useEffect(() => {
    fetchGoogleDriveAccounts()
  }, [fetchGoogleDriveAccounts])

  useEffect(() => {
    if (!loadingDrive && activeAccount) {
      setStep('browse')
    } else if (!loadingDrive && !activeAccount) {
      setStep('connect')
    }
  }, [loadingDrive, activeAccount])

  async function handleConnect() {
    setConnecting(true)
    try {
      await dealsApi.connectGoogleDrive({ emailAddress: 'analyst@watar.com' })
      await fetchGoogleDriveAccounts()
      setStep('browse')
    } finally {
      setConnecting(false)
    }
  }

  async function handleStartImport() {
    if (!activeAccount || selectedFolderIds.length === 0) return
    setStarting(true)
    try {
      const job = await dealsApi.startGoogleDriveImport(activeAccount.id, {
        folderIds: selectedFolderIds,
      })
      setImportJobId(job.id)
      setStep('importing')
    } finally {
      setStarting(false)
    }
  }

  function handleImportComplete() {
    // Fetch final job to get summary
    if (importJobId) {
      dealsApi.getImportJob(importJobId).then((job) => {
        setImportSummary({
          files: job.processedFiles,
          opportunities: job.opportunitiesCreated,
        })
        setStep('done')
      })
    } else {
      setStep('done')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="size-4" />
            Import from Google Drive
          </DialogTitle>
          <DialogDescription>
            {step === 'connect' && 'Connect your Google Drive account to import deal documents.'}
            {step === 'browse' && 'Select folders to import documents from.'}
            {step === 'importing' && 'Importing documents from Google Drive...'}
            {step === 'done' && 'Import completed successfully.'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[200px]">
          {/* Step 1: Connect */}
          {step === 'connect' && (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              {loadingDrive ? (
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <p className="text-center text-sm text-muted-foreground">
                    No Google Drive account connected. Connect one to browse and import deal documents.
                  </p>
                  <Button onClick={handleConnect} disabled={connecting}>
                    {connecting ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Connect Google Drive'
                    )}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Step 2: Browse & Select */}
          {step === 'browse' && activeAccount && (
            <div className="flex flex-col gap-3">
              <FolderBrowser
                accountId={activeAccount.id}
                selectedFolderIds={selectedFolderIds}
                onSelectionChange={setSelectedFolderIds}
              />
              {selectedFolderIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedFolderIds.length} folder{selectedFolderIds.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}

          {/* Step 3: Importing */}
          {step === 'importing' && importJobId && (
            <ImportProgress jobId={importJobId} onComplete={handleImportComplete} />
          )}

          {/* Step 4: Done */}
          {step === 'done' && importSummary && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-950/30">
                <HardDrive className="size-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {importSummary.opportunities} opportunities created from {importSummary.files} files
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    onClose()
                    navigate('/home/deals/opportunities')
                  }}
                >
                  View Opportunities
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer for browse step */}
        {step === 'browse' && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleStartImport}
              disabled={selectedFolderIds.length === 0 || starting}
            >
              {starting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Starting...
                </>
              ) : (
                `Import Selected (${selectedFolderIds.length})`
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
