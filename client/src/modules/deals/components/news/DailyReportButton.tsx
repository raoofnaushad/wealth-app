import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'

export function DailyReportButton() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button variant="outline" disabled>
              <Download className="mr-1.5 size-4" />
              Daily Report
            </Button>
          }
        />
        <TooltipContent>
          Coming soon — requires AI service integration
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
