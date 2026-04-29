import { useState } from 'react'
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Client360Output, Client360Clients, Client360Prospects, Client360ErrorEnvelope } from '@/api/types'

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
      <span className="inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
        0{suffix}
      </span>
    )
  }
  const positive = value > 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full',
        positive
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
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

function ClientsSection({
  clients,
  warnings,
}: {
  clients: Client360Clients | Client360ErrorEnvelope
  warnings: Array<{ field: string; message: string }>
}) {
  if (isErrorEnvelope(clients)) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        <p className="font-medium">Client data unavailable</p>
        <p className="text-xs mt-1 opacity-80">{clients.message}</p>
      </div>
    )
  }

  const nonZeroAssetClasses = clients.aum_by_asset_class.filter(
    (e) => e.assetClassAumPercentage > 0,
  )

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Clients</h3>
      <WarningBanner warnings={warnings} />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Total Clients</p>
          <p className="text-2xl font-bold tabular-nums">{clients.count.clients}</p>
          <TrendBadge value={clients.count.newClientsGrowth} suffix="% new this month" />
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Total AUM</p>
          <p className="text-2xl font-bold tabular-nums">{formatCurrency(clients.aum.clientsAum)}</p>
          <TrendBadge value={clients.aum.clientsAumGrowth} suffix="% MoM" />
        </div>
      </div>

      {/* AUM by asset class */}
      {nonZeroAssetClasses.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-3">AUM by Asset Class</p>
          <div className="space-y-2">
            {nonZeroAssetClasses
              .sort((a, b) => b.assetClassAumPercentage - a.assetClassAumPercentage)
              .map((entry) => (
                <div key={entry.assetClassName}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="text-foreground">{entry.assetClassName}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatCurrency(entry.assetClassAum)} · {entry.assetClassAumPercentage}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${Math.min(100, entry.assetClassAumPercentage)}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
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

function ProspectsSection({
  prospects,
  warnings,
}: {
  prospects: Client360Prospects | Client360ErrorEnvelope
  warnings: Array<{ field: string; message: string }>
}) {
  if (isErrorEnvelope(prospects)) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        <p className="font-medium">Prospect data unavailable</p>
        <p className="text-xs mt-1 opacity-80">{prospects.message}</p>
      </div>
    )
  }

  const nonZeroSegments = prospects.segments.filter((s) => s.prospectsCount > 0)

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Prospects</h3>
      <WarningBanner warnings={warnings} />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Total Prospects</p>
          <p className="text-2xl font-bold tabular-nums">
            {prospects.pipeline.newProspects + prospects.pipeline.inProgress + prospects.pipeline.qualified +
             prospects.pipeline.proposal + prospects.pipeline.agreement + prospects.pipeline.engagementLetter +
             prospects.pipeline.converted + prospects.pipeline.preApproved}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Potential Capital</p>
          <p className="text-2xl font-bold tabular-nums">
            {formatCurrency(prospects.pipeline.potentialInvestableCapitalCurrent)}
          </p>
        </div>
      </div>

      {/* Pipeline stage breakdown */}
      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs text-muted-foreground mb-3">Pipeline Stages</p>
        <div className="grid grid-cols-4 gap-2">
          {PIPELINE_STAGES.map(({ key, label }) => {
            const value = prospects.pipeline[key] as number
            return (
              <div key={key} className="text-center">
                <p className="text-lg font-bold tabular-nums">{value}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Segments — only if any have counts */}
      {nonZeroSegments.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-3">Wealth Segments</p>
          <div className="space-y-2">
            {nonZeroSegments.map((seg) => (
              <div key={seg.segmentName} className="flex items-center justify-between text-xs">
                <span className="text-foreground">{seg.segmentName}</span>
                <span className="tabular-nums font-medium">{seg.prospectsCount}</span>
              </div>
            ))}
          </div>
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

  return (
    <div className="space-y-8">
      <ClientsSection clients={output.clients} warnings={output.clients_warnings} />
      <ProspectsSection prospects={output.prospects} warnings={output.prospects_warnings} />

      {/* Collapsible run summary */}
      <div className="rounded-xl border bg-card">
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
