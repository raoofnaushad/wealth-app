import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { dealsApi } from '../../api'
import type { GoogleDriveImportJob } from '../../types'

interface ImportProgressProps {
  jobId: string
  onComplete: () => void
}

export function ImportProgress({ jobId, onComplete }: ImportProgressProps) {
  const [job, setJob] = useState<GoogleDriveImportJob | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null

    async function poll() {
      try {
        const result = await dealsApi.getImportJob(jobId)
        setJob(result)
        if (result.status === 'completed' || result.status === 'failed') {
          if (intervalId) clearInterval(intervalId)
        }
      } catch {
        setError('Failed to fetch import status')
        if (intervalId) clearInterval(intervalId)
      }
    }

    // Initial fetch
    poll()
    intervalId = setInterval(poll, 3000)

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [jobId])

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <XCircle className="size-8 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={onComplete}>
          Close
        </Button>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading import status...
      </div>
    )
  }

  const isTerminal = job.status === 'completed' || job.status === 'failed'
  const progressPct = job.totalFiles > 0
    ? Math.round((job.processedFiles / job.totalFiles) * 100)
    : 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Import Status</span>
        <StatusBadge status={job.status} />
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {job.processedFiles} of {job.totalFiles} files processed
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Files processed: </span>
          <span className="font-medium">{job.processedFiles}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Opportunities created: </span>
          <span className="font-medium">{job.opportunitiesCreated}</span>
        </div>
      </div>

      {/* Completed state */}
      {job.status === 'completed' && (
        <div className="flex flex-col items-center gap-2 rounded-md bg-emerald-50 p-4 dark:bg-emerald-950/20">
          <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Import Complete
          </p>
          <p className="text-xs text-muted-foreground">
            {job.opportunitiesCreated} opportunities created from {job.processedFiles} files
          </p>
        </div>
      )}

      {/* Failed state */}
      {job.status === 'failed' && (
        <div className="flex flex-col gap-2 rounded-md bg-destructive/10 p-4">
          <div className="flex items-center gap-2">
            <XCircle className="size-5 text-destructive" />
            <p className="text-sm font-medium text-destructive">Import Failed</p>
          </div>
          {job.errorLog && (
            <pre className="max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
              {JSON.stringify(job.errorLog, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Close button for terminal states */}
      {isTerminal && (
        <Button variant="outline" size="sm" onClick={onComplete} className="self-end">
          Close
        </Button>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: GoogleDriveImportJob['status'] }) {
  const variantMap: Record<GoogleDriveImportJob['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'outline',
    processing: 'secondary',
    completed: 'default',
    failed: 'destructive',
  }

  return (
    <Badge variant={variantMap[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}
