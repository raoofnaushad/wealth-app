import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Clock, CheckCircle2, Loader, Newspaper, Heart, ChevronLeft, ChevronRight, RefreshCw, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { summariesApi } from '@/api/endpoints'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import { RelationshipPool } from '@/components/insights/RelationshipPool'
import { PortfolioAlerts } from '@/components/insights/PortfolioAlerts'
import { NewsAlerts } from '@/components/insights/NewsAlerts'
import { ActionItems } from '@/components/insights/ActionItems'
import { Meetings } from '@/components/insights/Meetings'
import { PersonalTouch } from '@/components/insights/PersonalTouch'
import { ActionModal } from '@/components/insights/ActionModal'
import type { DailySummary, ActionModalContext, ActionModalType } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'

export function DashboardPage() {
  const { user } = useAuthStore()
  const [summaries, setSummaries] = useState<DailySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [actionModal, setActionModal] = useState<ActionModalContext>({ type: null })
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    summariesApi
      .list()
      .then((data) => {
        if (cancelled) return
        setSummaries(data)
        setSelectedDate([...data].sort((a, b) => b.date.localeCompare(a.date))[0]?.date ?? null)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const sortedSummaries = useMemo(
    () => [...summaries].sort((a, b) => b.date.localeCompare(a.date)),
    [summaries]
  )

  if (loading) {
    return <LoadingScreen message="Loading your daily brief..." fullScreen={false} />
  }

  const currentIndex = sortedSummaries.findIndex((s) => s.date === selectedDate)
  const current = currentIndex >= 0 ? sortedSummaries[currentIndex] : sortedSummaries[0]
  if (!current) return null
  const isToday = current.date === sortedSummaries[0]?.date
  const canGoPrev = currentIndex >= 0 && currentIndex < sortedSummaries.length - 1
  const canGoNext = currentIndex > 0

  function getGreeting(): string {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning!'
    if (hour < 17) return 'Good Afternoon!'
    return 'Good Evening!'
  }

  const totalAlerts = current.sections.portfolioAlerts.length
  const totalActions = current.sections.actionItems.length
  const totalNews = current.sections.newsAlerts.length
  const totalMeetings = current.sections.meetings.length
  const totalPersonal = current.sections.personal.length

  const advisorName = user?.name || 'James Wilson'

  function injectName(text?: string): string | undefined {
    return text?.replace(/\{\{ADVISOR_NAME\}\}/g, advisorName)
  }

  function goPrev() {
    if (canGoPrev) setSelectedDate(sortedSummaries[currentIndex + 1].date)
  }
  function goNext() {
    if (canGoNext) setSelectedDate(sortedSummaries[currentIndex - 1].date)
  }
  function goToday() {
    if (sortedSummaries[0]) setSelectedDate(sortedSummaries[0].date)
  }

  async function handleGenerate() {
    setGenerating(true)
    setGenerateError(null)
    try {
      await summariesApi.generate()
      const data = await summariesApi.list()
      const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date))
      setSummaries(sorted)
      if (sorted[0]) setSelectedDate(sorted[0].date)
    } catch {
      setGenerateError("Couldn't start generation. Try again.")
    } finally {
      setGenerating(false)
    }
  }

  function openAction(type: ActionModalType, clientName?: string, to?: string, subject?: string, description?: string) {
    setActionModal({ type, clientName: injectName(clientName), prefillTo: to, prefillSubject: injectName(subject), prefillDescription: injectName(description) })
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <button
            type="button"
            onClick={goPrev}
            disabled={!canGoPrev}
            aria-label="Previous day"
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-sm text-muted-foreground tabular-nums min-w-[180px] text-center">
            {format(parseISO(current.date), "EEEE, do MMMM")}
          </p>
          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext}
            aria-label="Next day"
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <Button
            type="button"
            onClick={goToday}
            disabled={isToday}
            variant="secondary"
            size="sm"
            className="ml-2 h-7"
          >
            Today
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    onClick={handleGenerate}
                    disabled={!isToday || generating}
                    variant="default"
                    size="sm"
                    className="ml-1 h-7 gap-1.5"
                  >
                    {generating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    {generating ? 'Generating…' : "Generate today's brief"}
                  </Button>
                }
              />
              {!isToday && (
                <TooltipContent side="bottom">Available on today's brief only</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">
            {getGreeting()} {user?.name?.split(' ')[0] || 'James'},
          </h1>
        </div>
        {generateError && (
          <p className="text-xs text-destructive mt-1">{generateError}</p>
        )}

        {/* Stats ribbon */}
        <div className="flex items-center gap-6 mt-4 py-3 px-5 rounded-xl bg-white dark:bg-card border border-border/60 shadow-sm w-fit">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">{totalAlerts}</span>
            <span className="text-sm text-muted-foreground">Alerts</span>
          </div>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">{totalActions}</span>
            <span className="text-sm text-muted-foreground">Action Items</span>
          </div>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">{totalNews}</span>
            <span className="text-sm text-muted-foreground">News Alerts</span>
          </div>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-2">
            <Loader className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">{totalMeetings}</span>
            <span className="text-sm text-muted-foreground">Meetings</span>
          </div>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">{totalPersonal}</span>
            <span className="text-sm text-muted-foreground">Personal Touch</span>
          </div>
        </div>
      </div>

      {/* Relationship Pool */}
      <RelationshipPool pool={current.relationshipPool} />

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-6">
          <PortfolioAlerts alerts={current.sections.portfolioAlerts} onAction={openAction} />
          <ActionItems items={current.sections.actionItems} onAction={openAction} />
          <PersonalTouch items={current.sections.personal} onAction={openAction} />
        </div>
        <div className="space-y-6">
          <NewsAlerts alerts={current.sections.newsAlerts} onAction={openAction} />
          <Meetings meetings={current.sections.meetings} advisorName={advisorName} />
        </div>
      </div>

      {/* Action Modal */}
      <ActionModal context={actionModal} onClose={() => setActionModal({ type: null })} />
    </div>
  )
}
