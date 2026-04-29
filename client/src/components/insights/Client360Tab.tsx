import { RefreshCw, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useClient360Store } from '@/store/useClient360Store'
import { Client360StepProgress } from './Client360StepProgress'
import { Client360Results } from './Client360Results'

export function Client360Tab() {
  const { status, steps, output, error, trigger } = useClient360Store()

  if (status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="rounded-full bg-muted p-4">
          <BarChart3 className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Client 360 Overview</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Fetch live client and prospect KPIs from Engage, with an AI-generated summary.
          </p>
        </div>
        <Button onClick={trigger} size="sm">
          Generate Client 360
        </Button>
      </div>
    )
  }

  if (status === 'loading') {
    return <Client360StepProgress steps={steps} />
  }

  if (status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Something went wrong</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">{error}</p>
        </div>
        <Button onClick={() => trigger()} size="sm" variant="secondary">
          Try again
        </Button>
      </div>
    )
  }

  // status === 'complete'
  if (!output) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button
          onClick={() => trigger()}
          size="sm"
          variant="secondary"
          className="gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>
      <Client360Results output={output} />
    </div>
  )
}
