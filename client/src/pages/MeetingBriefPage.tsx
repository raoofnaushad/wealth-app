import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Video, Phone, MapPin, Clock, Users, ExternalLink, Heart, Gift, Calendar, ArrowRight, FileText } from 'lucide-react'
import { ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuthStore } from '@/store/useAuthStore'
import { meetingBriefsApi } from '@/api/endpoints'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import type { MeetingBrief, CapitalFlowNotice, DailySummaryPersonalItem } from '@/api/types'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

const FORMAT_ICONS = {
  video: Video,
  phone: Phone,
  'in-person': MapPin,
}

const NOTICE_STATUS_COLORS: Record<string, string> = {
  overdue: 'text-red-600 dark:text-red-400',
  to_approve: 'text-amber-600 dark:text-amber-400',
  upcoming: 'text-blue-600 dark:text-blue-400',
  received: 'text-emerald-600 dark:text-emerald-400',
}

const NOTICE_STATUS_LABELS: Record<string, string> = {
  overdue: 'Overdue',
  to_approve: 'To approve',
  upcoming: 'Upcoming',
  received: 'Received',
}

const PERSONAL_TYPE_CONFIG: Record<string, { icon: LucideIcon; color: string; bgColor: string; label: string }> = {
  birthday: {
    icon: Gift,
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    label: 'Birthday',
  },
  anniversary: {
    icon: Calendar,
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-100 dark:bg-violet-900/30',
    label: 'Anniversary',
  },
  follow_up: {
    icon: ArrowRight,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'Follow-up',
  },
}

function NoticeRow({ notice }: { notice: CapitalFlowNotice }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-foreground">{notice.fund}</span>
      <div className="flex items-center gap-3">
        <span className={cn('text-xs font-medium', NOTICE_STATUS_COLORS[notice.status])}>
          {NOTICE_STATUS_LABELS[notice.status]}
        </span>
        <span className="font-medium w-16 text-right">{notice.amount}</span>
      </div>
    </div>
  )
}

function AssetBar({ name, percentage }: { name: string; percentage: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">{name}</span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-foreground rounded-full transition-all duration-500"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  )
}

function PersonalTouchBanner({ items }: { items: DailySummaryPersonalItem[] }) {
  if (items.length === 0) return null

  return (
    <div className="mb-6 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
          <Heart className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Personal Touch</h3>
      </div>
      <div className="space-y-2">
        {items.map((item) => {
          const cfg = PERSONAL_TYPE_CONFIG[item.type] || PERSONAL_TYPE_CONFIG.follow_up
          const ItemIcon = cfg.icon

          return (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 bg-white/60 dark:bg-white/5 border border-amber-100 dark:border-amber-900/30"
            >
              <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', cfg.bgColor)}>
                <ItemIcon className={cn('h-3.5 w-3.5', cfg.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{item.clientName}</span>
                  <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', cfg.bgColor, cfg.color)}>
                    {cfg.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{item.note}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatNav(value: number): string {
  return `$${value.toFixed(1)}M`
}

function NavEvolutionChart({ data }: { data: { year: number; nav: number; twr?: number }[] }) {
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Net Asset Value Evolution
        </h3>
        <div className="h-[240px] text-foreground">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 5, left: 5, bottom: 0 }}>
              <XAxis
                dataKey="year"
                tick={{ fill: 'currentColor', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'currentColor', strokeOpacity: 0.15 }}
              />
              <YAxis
                tick={{ fill: 'currentColor', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v}M`}
                width={55}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'var(--color-foreground)',
                }}
                formatter={(value) => [formatNav(Number(value)), 'NAV']}
                labelFormatter={(label) => `Year ${label}`}
              />
              <Bar dataKey="nav" fill="currentColor" radius={[3, 3, 0, 0]} maxBarSize={32} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <a
          href="https://staging.asbitech.ai/dashboard/1"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium mt-3"
        >
          Check the Data Aggregation to view more
          <ExternalLink className="h-3 w-3" />
        </a>
      </CardContent>
    </Card>
  )
}

const ACTION_STATUS_STYLES: Record<string, string> = {
  Completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  'In Progress': 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  Pending: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
}

function MeetingMinutesModal({
  open,
  onOpenChange,
  minutes,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  minutes: MeetingBrief['meetingMinutes']
}) {
  const [tab, setTab] = useState<'details' | 'summary'>('details')

  if (!minutes) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{minutes.subject}</DialogTitle>
          <p className="text-xs text-muted-foreground">{minutes.date} · {minutes.time} · {minutes.format} · <span className="text-emerald-600 dark:text-emerald-400 font-medium">{minutes.status}</span></p>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border -mx-4 px-4">
          {(['details', 'summary'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors relative capitalize',
                tab === t
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t === 'details' ? 'Details' : 'Summary & Decisions'}
              {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 -mx-4 px-4 py-3">
          {tab === 'details' && (
            <div className="space-y-5 text-sm">
              {/* Attendees */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Attendees</h4>
                <div className="space-y-1.5">
                  {minutes.attendees.map((a) => (
                    <div key={a.name} className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{a.name}</span>
                      <span className="text-muted-foreground">— {a.role}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agenda */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Agenda</h4>
                <ol className="list-decimal list-inside space-y-1.5 text-foreground">
                  {minutes.agenda.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ol>
              </div>

              {/* Action Items */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Action Items</h4>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left px-3 py-2 font-semibold text-xs">Action</th>
                        <th className="text-left px-3 py-2 font-semibold text-xs w-36">Owner</th>
                        <th className="text-left px-3 py-2 font-semibold text-xs w-28">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {minutes.actionItems.map((a, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2">{a.item}</td>
                          <td className="px-3 py-2 text-muted-foreground">{a.owner}</td>
                          <td className="px-3 py-2">
                            <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', ACTION_STATUS_STYLES[a.status] || ACTION_STATUS_STYLES.Pending)}>
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'summary' && (
            <div className="space-y-5 text-sm">
              {/* Key Decisions */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Key Decisions</h4>
                <ul className="space-y-2">
                  {minutes.keyDecisions.map((d, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
                      <span className="text-foreground">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Meeting Notes */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Meeting Notes</h4>
                <div className="text-foreground whitespace-pre-line leading-relaxed rounded-lg bg-muted/30 p-4 border border-border/50">
                  {minutes.notes}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function MeetingBriefPage() {
  const { meetingId } = useParams<{ meetingId: string }>()
  const { user } = useAuthStore()
  const [brief, setBrief] = useState<MeetingBrief | null>(null)
  const [loading, setLoading] = useState(true)
  const [minutesOpen, setMinutesOpen] = useState(false)

  useEffect(() => {
    if (!meetingId) return
    meetingBriefsApi.get(meetingId).then((data) => {
      setBrief(data)
      setLoading(false)
    })
  }, [meetingId])

  if (loading || !brief) {
    return <LoadingScreen message="Loading meeting brief..." fullScreen={false} />
  }

  const FormatIcon = FORMAT_ICONS[brief.format]
  const capitalCallNotices = brief.capitalFlows.notices.filter((n) => n.type === 'capital_call')
  const distributionNotices = brief.capitalFlows.notices.filter((n) => n.type === 'distribution')

  return (
    <div className="p-6">
      {/* Back link */}
      <Link
        to="/home"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Home
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{brief.clientName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Meeting Brief · {brief.date} · {brief.time}
          </p>
        </div>
        <div className="text-right text-sm text-muted-foreground space-y-0.5">
          <div className="flex items-center gap-1.5 justify-end">
            <Users className="h-3.5 w-3.5" />
            {brief.attendees
              .map((a) => a.role === 'Relationship Manager' && user ? user.name : a.name)
              .join(' + ')}
          </div>
          <div className="flex items-center gap-1.5 justify-end">
            <FormatIcon className="h-3.5 w-3.5" />
            <span className="capitalize">{brief.format}</span>
            <span className="mx-1">·</span>
            <Clock className="h-3.5 w-3.5" />
            {brief.duration}
          </div>
          {brief.zoomLink && (
            <div className="flex items-center gap-1.5 justify-end pt-1">
              <a
                href={brief.zoomLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Video className="h-3.5 w-3.5" />
                Join Zoom Meeting
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Personal Touch Banner */}
      {brief.personalTouch && brief.personalTouch.length > 0 && (
        <PersonalTouchBanner items={brief.personalTouch} />
      )}

      {/* Three-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_1fr] gap-5">
        {/* Column 1: Meeting Summary + News Alerts + Pending Tasks + Quick Links */}
        <div className="space-y-5">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Meeting Summary</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p>
                    <strong>Goal:</strong> {brief.summary.goal}{' '}
                    {brief.meetingMinutes && (
                      <button
                        onClick={() => setMinutesOpen(true)}
                        className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium align-baseline transition-colors"
                        title="View Meeting Minutes"
                      >
                        <FileText className="h-3.5 w-3.5 inline" />
                      </button>
                    )}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Main topics:</p>
                  <ul className="mt-1 space-y-1 text-muted-foreground">
                    {brief.summary.mainTopics.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
                {brief.summary.secondaryTopics.length > 0 && (
                  <div>
                    <p className="font-medium">Secondary topics:</p>
                    <ul className="mt-1 space-y-1 text-muted-foreground">
                      {brief.summary.secondaryTopics.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {brief.keyNews.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">News Alerts</h3>
                <div className="space-y-3">
                  {brief.keyNews.map((news) => (
                    <div key={news.id}>
                      <p className="text-sm font-medium inline-flex items-center gap-1.5 flex-wrap">
                        {news.headline}
                        {news.sourceUrl ? (
                          <a
                            href={news.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}
                        <span className="text-[10px] text-muted-foreground font-normal">[{news.source}]</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{news.summary}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {brief.pendingItems.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Pending Tasks
                </h3>
                <div className="space-y-2">
                  {brief.pendingItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm">
                      {item.href ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-1"
                        >
                          {item.title}
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      ) : (
                        <span>{item.title}</span>
                      )}
                      {item.status && (
                        <span className="text-[10px] text-muted-foreground ml-auto">{item.status}</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {brief.quickLinks && brief.quickLinks.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Quick Links</h3>
                <div className="space-y-2">
                  {brief.quickLinks.map((link, i) =>
                    link.href === '__MEETING_MINUTES__' && brief.meetingMinutes ? (
                      <button
                        key={i}
                        onClick={() => setMinutesOpen(true)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-md border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors w-full text-left"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        {link.label}
                        <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />
                      </button>
                    ) : (
                      <a
                        key={i}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-md border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        {link.label}
                        <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />
                      </a>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Column 2: Returns + NAV + Portfolio Performance */}
        <div className="space-y-5">
          {brief.returnsExpectation && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Returns, Target Vs Actual
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { label: 'Annual Return', data: brief.returnsExpectation.annualReturn, suffix: '%', higherIsBetter: true },
                    { label: 'Yield', data: brief.returnsExpectation.yield, suffix: '%', higherIsBetter: true },
                    { label: 'Standard Deviation', data: brief.returnsExpectation.standardDeviation, suffix: '%', higherIsBetter: false },
                    { label: 'Sharpe Ratio', data: brief.returnsExpectation.sharpeRatio, suffix: 'x', higherIsBetter: true },
                  ] as const).map(({ label, data, suffix, higherIsBetter }) => {
                    const delta = data.actual - data.target
                    const isPositive = higherIsBetter ? delta >= 0 : delta <= 0

                    return (
                      <div key={label} className="p-3 rounded-lg bg-muted/50">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-2">{label}</p>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-lg font-bold">{data.actual.toFixed(2)}{suffix}</p>
                            <p className="text-[10px] text-muted-foreground">Target: {data.target.toFixed(2)}{suffix}</p>
                          </div>
                          <span className={cn(
                            'text-xs font-semibold px-1.5 py-0.5 rounded',
                            isPositive
                              ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20'
                              : 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/20'
                          )}>
                            {delta >= 0 ? '+' : ''}{delta.toFixed(2)}{suffix}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {brief.navEvolution && brief.navEvolution.length > 0 && (
            <NavEvolutionChart data={brief.navEvolution} />
          )}

          {brief.performance.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Portfolio Performance</h3>
                <p className="text-sm font-medium mb-2">Top 5 NAV movements (QoQ)</p>
                <div className="divide-y divide-border">
                  {brief.performance.map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium">{p.fund}</p>
                        <p className="text-[10px] text-muted-foreground">{p.navDate}</p>
                      </div>
                      <span
                        className={cn(
                          'text-sm font-semibold',
                          p.qoqChange >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        )}
                      >
                        {p.qoqChange >= 0 ? '+' : ''}{p.qoqChange}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Column 3: Deployment Tracker + Capital Flows + Pipeline */}
        <div className="space-y-5">
          {brief.deployment.target > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Deployment Tracker (Current Year)
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Deployed</p>
                    <p className="text-lg font-bold">${brief.deployment.deployed}M</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Target</p>
                    <p className="text-lg font-bold">${brief.deployment.target}M</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Year-to-date deployment{' '}
                  {brief.deployment.deployed < brief.deployment.target
                    ? 'remains behind target'
                    : 'is on track'}
                  .
                </p>
                <div className="space-y-2.5">
                  {brief.deployment.byAssetClass.map((ac) => (
                    <AssetBar key={ac.name} name={ac.name} percentage={ac.percentage} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(brief.capitalFlows.funded !== '$0' || brief.capitalFlows.notices.length > 0) && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Capital Flows (Last 90 Days)
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Total funded</p>
                    <p className="text-lg font-bold">{brief.capitalFlows.funded}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Total distributed</p>
                    <p className="text-lg font-bold">{brief.capitalFlows.distributed}</p>
                  </div>
                </div>

                {capitalCallNotices.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-1.5">Capital calls</p>
                    <div className="divide-y divide-border">
                      {capitalCallNotices.map((n, i) => (
                        <NoticeRow key={i} notice={n} />
                      ))}
                    </div>
                  </div>
                )}

                {distributionNotices.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Distributions</p>
                    <div className="divide-y divide-border">
                      {distributionNotices.map((n, i) => (
                        <NoticeRow key={i} notice={n} />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {brief.pipeline.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Pipeline</h3>
                <div className="space-y-3">
                  {brief.pipeline.map((deal, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{deal.name}</span>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {deal.category}
                        </span>
                        {deal.icMemoUrl && (
                          <a
                            href={deal.icMemoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="IC Memo"
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{deal.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Meeting Minutes Modal */}
      {brief.meetingMinutes && (
        <MeetingMinutesModal
          open={minutesOpen}
          onOpenChange={setMinutesOpen}
          minutes={brief.meetingMinutes}
        />
      )}
    </div>
  )
}
