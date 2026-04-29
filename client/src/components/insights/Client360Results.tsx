import { useState } from 'react'
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, AlertTriangle, Users, Wallet, Target, DollarSign, ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FlipCard } from './FlipCard'
import type { Client360Output, Client360Clients, Client360Prospects, Client360Planning, Client360ErrorEnvelope } from '@/api/types'

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

const PIPELINE_STAGES: Array<{ key: keyof Client360Prospects['pipeline']; label: string }> = [
  { key: 'newProspects', label: 'New' },
  { key: 'inProgress', label: 'In Progress' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'agreement', label: 'Agreement' },
  { key: 'engagementLetter', label: 'Eng. Letter' },
  { key: 'converted', label: 'Converted' },
]

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

  const totalClients = clients.count.clients

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Clients</h3>
      <WarningBanner warnings={warnings} />

      <div className="grid grid-cols-[3fr_7fr] gap-3 h-[140px]">
        {/* Flip card: front = total clients, back = top asset classes preview */}
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
                <p className="text-3xl font-bold tabular-nums">{totalClients}</p>
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
                        style={{
                          width: `${Math.min(100, entry.assetClassAumPercentage)}%`,
                          backgroundColor: GAP_COLORS[i % GAP_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }
        />

        {/* Total AUM FlipCard: front = AUM summary, back = full asset class breakdown */}
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
                        style={{
                          width: `${Math.min(100, entry.assetClassAumPercentage)}%`,
                          backgroundColor: GAP_COLORS[i % GAP_COLORS.length],
                        }}
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

  const totalProspects = prospects.pipeline.prospectTimelineCurrent

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Prospects</h3>
      <WarningBanner warnings={warnings} />

      <div className="grid grid-cols-[3fr_7fr] gap-3 h-[140px]">
        {/* Flip card: front = total prospects, back = pipeline stages */}
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
                <p className="text-3xl font-bold tabular-nums">{totalProspects}</p>
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

        {/* Potential Capital FlipCard: front = capital value, back = wealth segments */}
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
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Planning</h3>
      <WarningBanner warnings={warnings} />

      {/* IPS Metrics ribbon */}
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

      {/* Deployment summary FlipCard */}
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

      {/* Deployment by asset class (collapsible) */}
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
  )
}

interface Client360ResultsProps {
  output: Client360Output
}

export function Client360Results({ output }: Client360ResultsProps) {
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<'clients' | 'prospects' | 'planning'>('clients')

  const tabs: Array<{ key: typeof activeSection; label: string }> = [
    { key: 'clients', label: 'Clients' },
    { key: 'prospects', label: 'Prospects' },
    { key: 'planning', label: 'Planning' },
  ]

  return (
    <div className="space-y-6">
      {/* Section tab switcher */}
      <div className="flex items-center gap-1 border-b pb-2">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveSection(key)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              activeSection === key
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {activeSection === 'clients' && (
        <ClientsSection clients={output.clients} warnings={output.clients_warnings} />
      )}
      {activeSection === 'prospects' && (
        <ProspectsSection prospects={output.prospects} warnings={output.prospects_warnings} />
      )}
      {activeSection === 'planning' && (
        <PlanningSection planning={output.planning} warnings={output.planning_warnings} />
      )}

      {/* Collapsible run summary */}
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
          <div className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed border-t pt-3">
            {output.run_summary}
          </div>
        )}
      </div>
    </div>
  )
}
