import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Users,
  Wallet,
  Target,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
  ExternalLink,
  Calendar,
  ShieldAlert,
  CheckCircle2,
  Newspaper,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FlipCard } from './FlipCard'
import type {
  Client360Output,
  Client360Clients,
  Client360Prospects,
  Client360Planning,
  Client360ErrorEnvelope,
  Client360NewsAlert,
  Client360ActionItem,
  Client360ActionItemUrgency,
  Client360PortfolioAlert,
  Client360Discrepancy,
  Client360Meeting,
} from '@/api/types'

const CARD = 'rounded-xl bg-white dark:bg-card border border-border/60 shadow-sm'
const GAP_COLORS = ['#6366f1', '#3b82f6', '#14b8a6', '#f59e0b', '#f43f5e', '#8b5cf6', '#10b981']

function isErrorEnvelope(v: unknown): v is Client360ErrorEnvelope {
  return typeof v === 'object' && v !== null && 'error' in v
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

function TrendBadge({ value, suffix = '%' }: { value: number; suffix?: string }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
        0{suffix}
      </span>
    )
  }
  const positive = value > 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium',
        positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
      )}
    >
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? '+' : ''}{value.toFixed(1)}{suffix}
    </span>
  )
}

function WarningBanner({ warnings }: { warnings: Array<{ field: string; message: string }> }) {
  if (!warnings.length) return null
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-3 mb-4">
      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
      <div className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5">
        {warnings.map((w, i) => (
          <p key={i}><span className="font-medium">{w.field}:</span> {w.message}</p>
        ))}
      </div>
    </div>
  )
}

function SectionHeading({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {count !== undefined && count > 0 && (
        <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-muted text-xs font-medium text-muted-foreground tabular-nums">
          {count}
        </span>
      )}
    </div>
  )
}

const PIPELINE_STAGES: Array<{ key: keyof Client360Prospects['pipeline']; label: string }> = [
  { key: 'newProspects', label: 'New' },
  { key: 'inProgress', label: 'In Progress' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'agreement', label: 'Agreement' },
  { key: 'engagementLetter', label: 'Eng. Letter' },
  { key: 'converted', label: 'Converted' },
]

// ── Action Items ──────────────────────────────────────────────────────────────

function urgencyClasses(urgency: Client360ActionItemUrgency) {
  if (urgency === 'critical') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  if (urgency === 'high') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
}

function ActionItemRow({ item }: { item: Client360ActionItem }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <span className={cn('shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded', urgencyClasses(item.urgency))}>
          {item.urgency}
        </span>
        <span className="flex-1 text-sm font-medium text-foreground truncate">{item.title}</span>
        <span className="shrink-0 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded hidden sm:inline">
          {item.category.replace(/_/g, ' ')}
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 bg-muted/20">
          <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
          <div className="border-t border-border/50 pt-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Recommended next step</p>
            <p className="text-xs text-foreground leading-relaxed">{item.recommended_next_step}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function ActionItemsSection({ items }: { items: Client360ActionItem[] }) {
  if (!items.length) return null
  const sorted = [...items].sort((a, b) => a.priority - b.priority)
  return (
    <div>
      <SectionHeading title="Action Items" count={items.length} />
      <div className={cn(CARD, 'overflow-hidden')}>
        {sorted.map((item, i) => (
          <ActionItemRow key={i} item={item} />
        ))}
      </div>
    </div>
  )
}

// ── Portfolio Alerts ──────────────────────────────────────────────────────────

function PortfolioAlertCard({ alert }: { alert: Client360PortfolioAlert }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={cn(CARD, 'p-4 space-y-3')}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{alert.category}</p>
          <p className={cn('text-xs text-foreground leading-relaxed', !open && 'line-clamp-2')}>{alert.issue}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {alert.clients.map((c, i) => (
          <span key={i} className="inline-flex text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded truncate max-w-[200px]">
            {c}
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
      >
        {open ? 'Hide details' : 'Show recommended action'}
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && (
        <div className="border-t border-border/50 pt-3 space-y-3">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Recommended Action</p>
            <p className="text-xs text-foreground leading-relaxed">{alert.action}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Reasoning</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{alert.reasoning}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function PortfolioAlertsSection({ alerts }: { alerts: Client360PortfolioAlert[] }) {
  if (!alerts.length) return null
  return (
    <div>
      <SectionHeading title="Portfolio Alerts" count={alerts.length} />
      <div className="space-y-3">
        {alerts.map((alert, i) => (
          <PortfolioAlertCard key={i} alert={alert} />
        ))}
      </div>
    </div>
  )
}

// ── Clients ───────────────────────────────────────────────────────────────────

function ClientsSection({
  clients,
  warnings,
}: {
  clients: Client360Clients | Client360ErrorEnvelope
  warnings: Array<{ field: string; message: string }>
}) {
  if (isErrorEnvelope(clients)) {
    return (
      <div className={cn(CARD, 'p-4 border-destructive/30 bg-destructive/5')}>
        <p className="text-sm font-medium text-destructive">Client data unavailable</p>
        <p className="text-xs mt-1 text-destructive/70">{clients.message}</p>
      </div>
    )
  }

  const nonZeroAssetClasses = clients.aum_by_asset_class
    .filter((e) => e.assetClassAumPercentage > 0)
    .sort((a, b) => b.assetClassAumPercentage - a.assetClassAumPercentage)

  return (
    <div>
      <SectionHeading title="Clients" />
      <WarningBanner warnings={warnings} />
      <div className="grid grid-cols-[3fr_7fr] gap-3 h-[140px]">
        <FlipCard
          className="h-full"
          front={
            <div className={cn(CARD, 'h-full p-4 flex flex-col justify-between')}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total Clients</span>
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-3.5 w-3.5 text-primary" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold tabular-nums">{clients.count.clients}</p>
                <TrendBadge value={clients.count.newClientsGrowth} suffix="% new this month" />
              </div>
              <p className="text-[10px] text-muted-foreground">Tap for breakdown</p>
            </div>
          }
          back={
            <div className={cn(CARD, 'h-full p-4 flex flex-col')}>
              <p className="text-[10px] text-muted-foreground mb-2 font-medium uppercase tracking-wide">Top Asset Classes</p>
              <div className="flex-1 space-y-1.5 overflow-hidden">
                {nonZeroAssetClasses.slice(0, 3).map((entry, i) => (
                  <div key={entry.assetClassName}>
                    <div className="flex items-center justify-between text-[10px] mb-0.5">
                      <span className="text-foreground truncate max-w-[80px]">{entry.assetClassName}</span>
                      <span className="text-muted-foreground tabular-nums ml-1">{entry.assetClassAumPercentage}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, entry.assetClassAumPercentage)}%`, backgroundColor: GAP_COLORS[i % GAP_COLORS.length] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }
        />

        <FlipCard
          className="h-full"
          front={
            <div className={cn(CARD, 'h-full p-4 flex flex-col justify-between')}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total AUM</span>
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-3.5 w-3.5 text-primary" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{formatCurrency(clients.aum.clientsAum)}</p>
                <TrendBadge value={clients.aum.clientsAumGrowth} suffix="% MoM" />
              </div>
              <p className="text-[10px] text-muted-foreground">Tap for asset class breakdown</p>
            </div>
          }
          back={
            <div className={cn(CARD, 'h-full p-4 flex flex-col')}>
              <p className="text-[10px] text-muted-foreground mb-2 font-medium uppercase tracking-wide">AUM by Asset Class</p>
              <div className="flex-1 space-y-1.5 overflow-y-auto">
                {nonZeroAssetClasses.map((entry, i) => (
                  <div key={entry.assetClassName}>
                    <div className="flex items-center justify-between text-[10px] mb-0.5">
                      <span className="text-foreground truncate max-w-[160px]">{entry.assetClassName}</span>
                      <span className="text-muted-foreground tabular-nums ml-2">{formatCurrency(entry.assetClassAum)} · {entry.assetClassAumPercentage}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, entry.assetClassAumPercentage)}%`, backgroundColor: GAP_COLORS[i % GAP_COLORS.length] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }
        />
      </div>
    </div>
  )
}

// ── Prospects ─────────────────────────────────────────────────────────────────

function ProspectsSection({
  prospects,
  warnings,
}: {
  prospects: Client360Prospects | Client360ErrorEnvelope
  warnings: Array<{ field: string; message: string }>
}) {
  if (isErrorEnvelope(prospects)) {
    return (
      <div className={cn(CARD, 'p-4 border-destructive/30 bg-destructive/5')}>
        <p className="text-sm font-medium text-destructive">Prospect data unavailable</p>
        <p className="text-xs mt-1 text-destructive/70">{prospects.message}</p>
      </div>
    )
  }

  return (
    <div>
      <SectionHeading title="Prospects" />
      <WarningBanner warnings={warnings} />
      <div className="grid grid-cols-[3fr_7fr] gap-3 h-[140px]">
        <FlipCard
          className="h-full"
          front={
            <div className={cn(CARD, 'h-full p-4 flex flex-col justify-between')}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total Prospects</span>
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Target className="h-3.5 w-3.5 text-primary" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold tabular-nums">{prospects.pipeline.prospectTimelineCurrent}</p>
                <p className="text-[10px] text-muted-foreground">across all pipeline stages</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Tap for stage breakdown</p>
            </div>
          }
          back={
            <div className={cn(CARD, 'h-full p-4 flex flex-col')}>
              <p className="text-[10px] text-muted-foreground mb-2 font-medium uppercase tracking-wide">Pipeline Stages</p>
              <div className="flex-1 grid grid-cols-4 gap-x-2 gap-y-1 content-start">
                {PIPELINE_STAGES.map(({ key, label }) => {
                  const value = prospects.pipeline[key] as number
                  return (
                    <div key={key} className="text-center">
                      <p className="text-sm font-bold tabular-nums leading-tight">{value}</p>
                      <p className="text-[9px] text-muted-foreground leading-tight">{label}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          }
        />

        <FlipCard
          className="h-full"
          front={
            <div className={cn(CARD, 'h-full p-4 flex flex-col justify-between')}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Potential Capital</span>
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-3.5 w-3.5 text-primary" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {formatCurrency(prospects.pipeline.potentialInvestableCapitalCurrent)}
                </p>
                <p className="text-[10px] text-muted-foreground">investable capital</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Tap for wealth segments</p>
            </div>
          }
          back={
            <div className={cn(CARD, 'h-full p-4 flex flex-col')}>
              <p className="text-[10px] text-muted-foreground mb-2 font-medium uppercase tracking-wide">Wealth Segments</p>
              <div className="flex-1 space-y-1 overflow-y-auto">
                {prospects.segments.map((seg) => (
                  <div key={seg.segmentName} className="flex items-center justify-between text-[10px]">
                    <span className={cn('truncate max-w-[160px]', seg.prospectsCount > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                      {seg.segmentName}
                    </span>
                    <span className={cn('tabular-nums font-medium ml-2', seg.prospectsCount > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                      {seg.prospectsCount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          }
        />
      </div>
    </div>
  )
}

// ── Planning ──────────────────────────────────────────────────────────────────

function PlanningSection({
  planning,
  warnings,
}: {
  planning: Client360Planning | Client360ErrorEnvelope
  warnings: Array<{ field: string; message: string }>
}) {
  const [deploymentOpen, setDeploymentOpen] = useState(false)

  if (isErrorEnvelope(planning)) {
    return (
      <div className={cn(CARD, 'p-4 border-destructive/30 bg-destructive/5')}>
        <p className="text-sm font-medium text-destructive">Planning data unavailable</p>
        <p className="text-xs mt-1 text-destructive/70">{planning.message}</p>
      </div>
    )
  }

  const nonTrivialEntries = planning.deploymentByAssetClass.filter(
    (e) => e.deployment_gap > 0 || e.commitment_gap < 0,
  )

  return (
    <div>
      <SectionHeading title="Planning" />
      <WarningBanner warnings={warnings} />
      <div className="space-y-4">
        <div className={cn(CARD, 'p-4')}>
          <p className="text-[10px] text-muted-foreground mb-3 font-medium uppercase tracking-wide">IPS Metrics</p>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums">{planning.ipsMetrics.total}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Total</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{planning.ipsMetrics.signed}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Signed</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{planning.ipsMetrics.pending}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Pending</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">{planning.ipsMetrics.inProgress}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">In Progress</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[3fr_7fr] gap-3 h-[120px]">
          <FlipCard
            className="h-full"
            front={
              <div className={cn(CARD, 'h-full p-4 flex flex-col justify-between')}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Deployment Gap</span>
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(planning.deployment_gap)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">remaining to deploy</p>
                </div>
                <p className="text-[10px] text-muted-foreground">Tap for summary</p>
              </div>
            }
            back={
              <div className={cn(CARD, 'h-full p-4 flex flex-col justify-between')}>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Deployment Summary</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Total Commitments</span>
                    <span className="font-medium tabular-nums">{formatCurrency(planning.deploymentSummary.totalCommitments)}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Total Deployed</span>
                    <span className="font-medium tabular-nums">{formatCurrency(planning.deploymentSummary.totalDeployed)}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Target Deployment</span>
                    <span className="font-medium tabular-nums">{formatCurrency(planning.deploymentSummary.totalTargetDeployment)}</span>
                  </div>
                </div>
              </div>
            }
          />

          <div className={cn(CARD, 'h-full p-4 flex flex-col justify-between')}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Commitment Gap</span>
              <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center">
                <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">
                {formatCurrency(Math.abs(planning.commitment_gap))}
              </p>
              <p className="text-[10px] text-muted-foreground">uncommitted capital</p>
            </div>
            <p className="text-[10px] text-muted-foreground invisible">placeholder</p>
          </div>
        </div>

        {nonTrivialEntries.length > 0 && (
          <div className={cn(CARD)}>
            <button
              type="button"
              onClick={() => setDeploymentOpen((v) => !v)}
              aria-expanded={deploymentOpen}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Deployment by Asset Class
              {deploymentOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {deploymentOpen && (
              <div className="px-4 pb-4 border-t pt-3 space-y-2">
                {nonTrivialEntries.map((entry) => (
                  <div key={entry.assetClassName} className="flex items-center justify-between text-xs">
                    <span className="text-foreground truncate max-w-[180px]">{entry.assetClassName}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      {entry.commitment_gap < 0 && (
                        <span className="text-red-600 dark:text-red-400 tabular-nums">
                          {formatCurrency(Math.abs(entry.commitment_gap))} committed
                        </span>
                      )}
                      {entry.deployment_gap > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {formatCurrency(entry.deployment_gap)} to deploy
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── News Alerts ───────────────────────────────────────────────────────────────

function NewsAlertCard({ alert }: { alert: Client360NewsAlert }) {
  const [clientsOpen, setClientsOpen] = useState(false)
  return (
    <div className={cn(CARD, 'p-4 space-y-2')}>
      <div className="flex items-start justify-between gap-2">
        <a
          href={alert.url}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-foreground hover:text-primary hover:underline leading-snug flex-1"
        >
          {alert.title}
          <ExternalLink className="inline h-3 w-3 ml-1 text-muted-foreground" />
        </a>
        <span className="shrink-0 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{alert.source}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{alert.summary}</p>
      {alert.affected_clients.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setClientsOpen((v) => !v)}
            className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            {alert.affected_clients.length} affected client{alert.affected_clients.length !== 1 ? 's' : ''}
            {clientsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {clientsOpen && (
            <div className="border-t border-border/50 pt-2 space-y-2">
              {alert.affected_clients.map((c, i) => (
                <div key={i} className="space-y-0.5">
                  <p className="text-[11px] font-medium text-foreground">{c.client_name}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">{c.impact}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function NewsAlertsSection({ alerts }: { alerts: Client360NewsAlert[] }) {
  if (!alerts.length) return null
  return (
    <div>
      <SectionHeading title="News Alerts" count={alerts.length} />
      <div className="space-y-3">
        {alerts.map((alert, i) => (
          <NewsAlertCard key={i} alert={alert} />
        ))}
      </div>
    </div>
  )
}

// ── Discrepancies ─────────────────────────────────────────────────────────────

function DiscrepancyRow({ item }: { item: Client360Discrepancy }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground mt-0.5">
          {item.type}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground truncate">{item.clients.join(', ')}</p>
          <p className="text-xs text-foreground leading-snug mt-0.5 line-clamp-2">{item.issue}</p>
        </div>
        {open ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />}
      </button>
      {open && (
        <div className="px-4 pb-3 bg-muted/20 border-t border-border/50 pt-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Reasoning</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{item.reasoning}</p>
        </div>
      )}
    </div>
  )
}

function DiscrepanciesSection({ items }: { items: Client360Discrepancy[] }) {
  if (!items.length) return null
  return (
    <div>
      <SectionHeading title="Data Discrepancies" count={items.length} />
      <div className={cn(CARD, 'overflow-hidden')}>
        {items.map((item, i) => (
          <DiscrepancyRow key={i} item={item} />
        ))}
      </div>
    </div>
  )
}

// ── Meetings ──────────────────────────────────────────────────────────────────

function MeetingRow({ meeting }: { meeting: Client360Meeting }) {
  const start = format(parseISO(meeting.start), 'h:mm a')
  const end = format(parseISO(meeting.end), 'h:mm a')
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0">
      <div className="shrink-0 w-7 h-7 rounded-lg bg-muted flex items-center justify-center mt-0.5">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground leading-snug">{meeting.title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{start} – {end} · {meeting.organizer}</p>
      </div>
      {meeting.meeting_link && (
        <a
          href={meeting.meeting_link}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
        >
          Join <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  )
}

function MeetingsSection({
  today,
  tomorrow,
  internalToday,
  internalTomorrow,
}: {
  today: Client360Meeting[]
  tomorrow: Client360Meeting[]
  internalToday: Client360Meeting[]
  internalTomorrow: Client360Meeting[]
}) {
  const tomorrowAll = [...tomorrow, ...internalTomorrow].sort((a, b) =>
    a.start.localeCompare(b.start),
  )
  const todayAll = [...today, ...internalToday].sort((a, b) =>
    a.start.localeCompare(b.start),
  )

  if (!tomorrowAll.length && !todayAll.length) return null

  return (
    <div>
      <SectionHeading title="Meetings" />
      <div className={cn(CARD, 'overflow-hidden')}>
        {todayAll.length > 0 && (
          <>
            <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Today</p>
            {todayAll.map((m, i) => <MeetingRow key={`today-${i}`} meeting={m} />)}
          </>
        )}
        {tomorrowAll.length > 0 && (
          <>
            <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tomorrow</p>
            {tomorrowAll.map((m, i) => <MeetingRow key={`tomorrow-${i}`} meeting={m} />)}
          </>
        )}
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

interface Client360ResultsProps {
  output: Client360Output
}

export function Client360Results({ output }: Client360ResultsProps) {
  const [summaryOpen, setSummaryOpen] = useState(false)

  const portfolioAlerts = output.portfolio_alerts ?? []
  const actionItems = output.action_items ?? []
  const newsAlerts = output.news_alerts ?? []
  const meetingsAll = [
    ...(output.meetings_today ?? []),
    ...(output.meetings_tomorrow ?? []),
    ...(output.internal_meetings_today ?? []),
    ...(output.internal_meetings_tomorrow ?? []),
  ]

  return (
    <div className="space-y-8">
      {/* Stats ribbon — mirrors Your Daily */}
      <div className="flex items-center gap-6 py-3 px-5 rounded-xl bg-white dark:bg-card border border-border/60 shadow-sm w-fit">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{portfolioAlerts.length}</span>
          <span className="text-sm text-muted-foreground">Alerts</span>
        </div>
        <div className="w-px h-5 bg-border" />
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{actionItems.length}</span>
          <span className="text-sm text-muted-foreground">Action Items</span>
        </div>
        <div className="w-px h-5 bg-border" />
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{newsAlerts.length}</span>
          <span className="text-sm text-muted-foreground">News Alerts</span>
        </div>
        <div className="w-px h-5 bg-border" />
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{meetingsAll.length}</span>
          <span className="text-sm text-muted-foreground">Meetings</span>
        </div>
      </div>

      <ClientsSection clients={output.clients} warnings={output.clients_warnings} />
      <ProspectsSection prospects={output.prospects} warnings={output.prospects_warnings} />
      <PlanningSection planning={output.planning} warnings={output.planning_warnings} />
      <PortfolioAlertsSection alerts={portfolioAlerts} />
      <ActionItemsSection items={actionItems} />
      <NewsAlertsSection alerts={newsAlerts} />
      <DiscrepanciesSection items={output.discrepancies ?? []} />
      <MeetingsSection
        today={output.meetings_today ?? []}
        tomorrow={output.meetings_tomorrow ?? []}
        internalToday={output.internal_meetings_today ?? []}
        internalTomorrow={output.internal_meetings_tomorrow ?? []}
      />

      <div className={cn(CARD)}>
        <button
          type="button"
          onClick={() => setSummaryOpen((v) => !v)}
          aria-expanded={summaryOpen}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          View run summary
          {summaryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {summaryOpen && (
          <div className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed border-t pt-3 whitespace-pre-wrap">
            {output.run_summary}
          </div>
        )}
      </div>
    </div>
  )
}
