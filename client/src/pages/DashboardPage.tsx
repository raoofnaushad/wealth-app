import { useEffect, useState } from 'react'
import { format, addDays } from 'date-fns'
import { Clock, CheckCircle2, Loader, Newspaper, Heart } from 'lucide-react'
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

export function DashboardPage() {
  const { user } = useAuthStore()
  const [summaries, setSummaries] = useState<DailySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [actionModal, setActionModal] = useState<ActionModalContext>({ type: null })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    summariesApi.list()
      .then((data) => {
        if (!cancelled) {
          setSummaries(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <LoadingScreen message="Loading your daily brief..." fullScreen={false} />
  }

  const today = summaries[0]
  if (!today) return null

  function getGreeting(): string {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning!'
    if (hour < 17) return 'Good Afternoon!'
    return 'Good Evening!'
  }

  const totalAlerts = today.sections.portfolioAlerts.length
  const totalActions = today.sections.actionItems.length
  const totalNews = today.sections.newsAlerts.length
  const totalMeetings = today.sections.meetings.length
  const totalPersonal = today.sections.personal.length

  const advisorName = user?.name || 'James Wilson'

  function injectName(text?: string): string | undefined {
    return text?.replace(/\{\{ADVISOR_NAME\}\}/g, advisorName)
  }

  function openAction(type: ActionModalType, clientName?: string, to?: string, subject?: string, description?: string) {
    setActionModal({ type, clientName: injectName(clientName), prefillTo: to, prefillSubject: injectName(subject), prefillDescription: injectName(description) })
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground mb-1">
          {format(addDays(new Date(), 1), "EEEE, do MMMM")}
        </p>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">
            {getGreeting()} {user?.name?.split(' ')[0] || 'James'},
          </h1>
        </div>

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
      <RelationshipPool pool={today.relationshipPool} />

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-6">
          <PortfolioAlerts alerts={today.sections.portfolioAlerts} onAction={openAction} />
          <ActionItems items={today.sections.actionItems} onAction={openAction} />
          <PersonalTouch items={today.sections.personal} onAction={openAction} />
        </div>
        <div className="space-y-6">
          <NewsAlerts alerts={today.sections.newsAlerts} onAction={openAction} />
          <Meetings meetings={today.sections.meetings} advisorName={advisorName} />
        </div>
      </div>

      {/* Action Modal */}
      <ActionModal context={actionModal} onClose={() => setActionModal({ type: null })} />
    </div>
  )
}
