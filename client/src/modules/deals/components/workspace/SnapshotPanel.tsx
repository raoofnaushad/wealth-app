import { useState } from 'react'
import { Save, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { dealsApi } from '../../api'
import { useUndoRedo } from './useUndoRedo'
import type { Opportunity, InvestmentType, SnapshotField } from '../../types'

interface SnapshotPanelProps {
  opportunity: Opportunity
  investmentTypes: InvestmentType[]
  onUpdate: (opportunity: Opportunity) => void
}

const fieldTypeBadgeMap: Record<string, string> = {
  text: 'Text',
  textarea: 'Text',
  number: '#',
  currency: '$',
  percentage: '%',
  date: 'Date',
  select: 'Select',
  'multi-select': 'Multi',
  boolean: 'Y/N',
}

const KPI_FIELD_TYPES = new Set(['currency', 'number', 'percentage'])

function formatKpiValue(value: unknown, fieldType: string, fieldName?: string): string {
  if (value == null || value === '') return '--'
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)

  if (fieldType === 'currency') {
    const abs = Math.abs(num)
    if (abs >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`
    if (abs >= 1_000_000) return `$${(num / 1_000_000).toFixed(0)}M`
    if (abs >= 1_000) return `$${(num / 1_000).toFixed(0)}K`
    return `$${num}`
  }

  if (fieldType === 'percentage') return `${num}%`

  if (fieldName && fieldName.toLowerCase().includes('year')) return String(Math.round(num))

  return String(num)
}

export function SnapshotPanel({ opportunity, investmentTypes, onUpdate }: SnapshotPanelProps) {
  const [draft, setDraft] = useState<Record<string, unknown>>({ ...opportunity.snapshotData })
  const [saving, setSaving] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const { pushChange } = useUndoRedo()

  const investmentType = investmentTypes.find((t) => t.id === opportunity.investmentTypeId)
  const sections = investmentType?.snapshotConfig?.sections ?? []
  const sortedSections = sections.slice().sort((a, b) => a.sortOrder - b.sortOrder)

  const isDirty = JSON.stringify(draft) !== JSON.stringify(opportunity.snapshotData)

  // Extract KPI fields from the first section
  const firstSection = sortedSections[0]
  const kpiFields = firstSection
    ? firstSection.fields.filter((f) => KPI_FIELD_TYPES.has(f.type))
    : []

  // Strategy value for tag display
  const strategyValue = draft['Strategy'] != null ? String(draft['Strategy']) : null

  function toggleSection(sectionName: string) {
    setCollapsedSections((prev) => ({ ...prev, [sectionName]: !prev[sectionName] }))
  }

  function updateField(fieldName: string, value: unknown) {
    const previousValue = draft[fieldName]
    if (previousValue === value) return
    pushChange({
      type: 'snapshot_field',
      targetId: opportunity.id,
      fieldName,
      previousValue,
      newValue: value,
    })
    setDraft((prev) => ({ ...prev, [fieldName]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await dealsApi.updateOpportunity(opportunity.id, { snapshotData: draft })
      onUpdate(updated)
    } catch {
      // TODO: surface error
    } finally {
      setSaving(false)
    }
  }

  function renderField(field: SnapshotField) {
    const rawValue = draft[field.name]
    const value = rawValue != null ? String(rawValue) : ''
    const isEmpty = value === ''
    const isRequired = field.required
    const isTextarea = field.type === 'textarea'

    const fieldContent = (
      <div key={field.name} className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Label className="text-sm">
            {field.name}
            {isRequired && <span className="text-destructive ml-0.5">*</span>}
          </Label>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
            {fieldTypeBadgeMap[field.type] ?? field.type}
          </Badge>
        </div>

        {isTextarea ? (
          <Textarea
            value={String(value)}
            onChange={(e) => updateField(field.name, e.target.value)}
            placeholder={field.instruction || `Enter ${field.name}...`}
            rows={3}
            className={isEmpty && isRequired ? 'border-destructive/50' : ''}
          />
        ) : field.type === 'boolean' ? (
          <select
            value={String(value)}
            onChange={(e) => updateField(field.name, e.target.value === 'true')}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">--</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        ) : field.type === 'select' && field.options ? (
          <select
            value={String(value)}
            onChange={(e) => updateField(field.name, e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Select...</option>
            {field.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <Input
            type={field.type === 'number' || field.type === 'currency' || field.type === 'percentage' ? 'number' : field.type === 'date' ? 'date' : 'text'}
            value={String(value)}
            onChange={(e) => updateField(field.name, field.type === 'number' || field.type === 'currency' || field.type === 'percentage' ? Number(e.target.value) : e.target.value)}
            placeholder={field.instruction || `Enter ${field.name}...`}
            className={isEmpty && isRequired ? 'border-destructive/50' : ''}
          />
        )}
      </div>
    )

    return fieldContent
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header with save */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Deal Snapshot</h2>
        <Button size="sm" onClick={handleSave} disabled={!isDirty || saving}>
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Investment type tags */}
      {investmentType && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="px-2.5 py-0.5">
            {investmentType.name}
          </Badge>
          {strategyValue && (
            <Badge variant="secondary" className="px-2.5 py-0.5">
              {strategyValue}
            </Badge>
          )}
        </div>
      )}

      {/* KPI cards row */}
      {kpiFields.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {kpiFields.map((field) => {
            const value = draft[field.name]
            return (
              <div key={field.name} className="flex-shrink-0 rounded-lg border bg-card p-3 min-w-[120px]">
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  {field.name}
                </div>
                <div className="text-lg font-bold mt-1">
                  {formatKpiValue(value, field.type, field.name)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {sections.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No snapshot configuration found for this investment type.
        </p>
      )}

      {/* Detailed sections */}
      {sortedSections.map((section) => {
        const isCollapsed = collapsedSections[section.name] ?? false
        const textareaFields = section.fields.filter((f) => f.type === 'textarea')
        const gridFields = section.fields.filter((f) => f.type !== 'textarea')

        return (
          <div key={section.name} className="space-y-4">
            <button
              type="button"
              onClick={() => toggleSection(section.name)}
              className="flex items-center gap-1.5 w-full text-left border-b pb-1.5 cursor-pointer"
            >
              {isCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {section.name}
              </h3>
            </button>
            {!isCollapsed && (
              <div className="space-y-4">
                {gridFields.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {gridFields.map(renderField)}
                  </div>
                )}
                {textareaFields.map(renderField)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
