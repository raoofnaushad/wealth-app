import { useState } from 'react'
import { Save } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { dealsApi } from '../../api'
import type { AssetManager } from '../../types'

interface AssetManagerProfileProps {
  assetManager: AssetManager
  onUpdate: (am: AssetManager) => void
}

export function AssetManagerProfile({ assetManager, onUpdate }: AssetManagerProfileProps) {
  const [draft, setDraft] = useState<Partial<AssetManager>>({})
  const [saving, setSaving] = useState(false)

  const merged = { ...assetManager, ...draft }
  const mergedFundInfo = { ...assetManager.fundInfo, ...draft.fundInfo }
  const mergedFirmInfo = { ...assetManager.firmInfo, ...draft.firmInfo }
  const mergedStrategy = { ...assetManager.strategy, ...draft.strategy }

  function updateField<K extends keyof AssetManager>(field: K, value: AssetManager[K]) {
    setDraft((prev) => ({ ...prev, [field]: value }))
  }

  function updateFundInfo(key: string, value: string) {
    setDraft((prev) => ({
      ...prev,
      fundInfo: { ...assetManager.fundInfo, ...prev.fundInfo, [key]: value },
    }))
  }

  function updateFirmInfo(key: string, value: string) {
    setDraft((prev) => ({
      ...prev,
      firmInfo: { ...assetManager.firmInfo, ...prev.firmInfo, [key]: value },
    }))
  }

  function updateStrategy(key: string, value: string) {
    setDraft((prev) => ({
      ...prev,
      strategy: { ...assetManager.strategy, ...prev.strategy, [key]: value },
    }))
  }

  async function handleSave() {
    if (Object.keys(draft).length === 0) return
    setSaving(true)
    try {
      const updated = await dealsApi.updateAssetManager(assetManager.id, draft)
      onUpdate(updated)
      setDraft({})
    } catch {
      // TODO: surface error
    } finally {
      setSaving(false)
    }
  }

  const isDirty = Object.keys(draft).length > 0

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Basic Information
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={merged.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Input
                value={merged.type ?? ''}
                onChange={(e) => updateField('type', e.target.value)}
                placeholder="e.g. Private Equity"
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={merged.location ?? ''}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="e.g. New York, NY"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={merged.description ?? ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Describe this asset manager..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Fund Information */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Fund Information
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <KeyValueField
              label="Fund Size"
              value={mergedFundInfo.fund_size}
              onChange={(v) => updateFundInfo('fund_size', v)}
              placeholder="e.g. $500M"
            />
            <KeyValueField
              label="Vintage Year"
              value={mergedFundInfo.vintage_year}
              onChange={(v) => updateFundInfo('vintage_year', v)}
              placeholder="e.g. 2024"
            />
            <KeyValueField
              label="Fund Raised Till Date"
              value={mergedFundInfo.fund_raised_till_date}
              onChange={(v) => updateFundInfo('fund_raised_till_date', v)}
              placeholder="e.g. $350M"
            />
            <KeyValueField
              label="Fund Closing Timeline"
              value={mergedFundInfo.fund_closing_timeline}
              onChange={(v) => updateFundInfo('fund_closing_timeline', v)}
              placeholder="e.g. Q4 2026"
            />
          </div>
        </CardContent>
      </Card>

      {/* Firm Information */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Firm Information
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <KeyValueField
              label="Firm AUM"
              value={mergedFirmInfo.firm_aum}
              onChange={(v) => updateFirmInfo('firm_aum', v)}
              placeholder="e.g. $10B"
            />
            <KeyValueField
              label="Years in Business"
              value={mergedFirmInfo.years_in_business}
              onChange={(v) => updateFirmInfo('years_in_business', v)}
              placeholder="e.g. 25"
            />
            <KeyValueField
              label="Number of Previous Funds"
              value={mergedFirmInfo.number_of_previous_funds}
              onChange={(v) => updateFirmInfo('number_of_previous_funds', v)}
              placeholder="e.g. 7"
            />
            <KeyValueField
              label="Investment Team Size"
              value={mergedFirmInfo.investment_team_size}
              onChange={(v) => updateFirmInfo('investment_team_size', v)}
              placeholder="e.g. 45"
            />
          </div>
        </CardContent>
      </Card>

      {/* Strategy & Positioning */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Strategy &amp; Positioning
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fund Strategy</Label>
              <Textarea
                value={mergedStrategy.fund_strategy ?? ''}
                onChange={(e) => updateStrategy('fund_strategy', e.target.value)}
                placeholder="Describe the fund strategy..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>USP &amp; Differentiator</Label>
              <Textarea
                value={mergedStrategy.usp_differentiator ?? ''}
                onChange={(e) => updateStrategy('usp_differentiator', e.target.value)}
                placeholder="What sets this fund apart..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Key Person Risk
                {!mergedStrategy.key_person_risk && (
                  <Badge variant="destructive" className="text-xs">N/A</Badge>
                )}
              </Label>
              <Textarea
                value={mergedStrategy.key_person_risk ?? ''}
                onChange={(e) => updateStrategy('key_person_risk', e.target.value)}
                placeholder="Describe key person risk..."
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metadata (read-only) */}
      <Card>
        <CardContent className="space-y-3 pt-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Metadata
          </h3>
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <span className="text-muted-foreground">Created Date</span>
              <p className="font-medium">{new Date(assetManager.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Created By</span>
              <p className="mt-1">
                <Badge variant={assetManager.createdByType === 'system' ? 'secondary' : 'outline'}>
                  {assetManager.createdByType === 'system' ? 'System' : 'Manual'}
                </Badge>
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Last Modified</span>
              <p className="font-medium">{new Date(assetManager.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!isDirty || saving}>
          <Save className="mr-1.5 size-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}

// ── Helper component for key-value fields ──

interface KeyValueFieldProps {
  label: string
  value: string | undefined
  onChange: (value: string) => void
  placeholder?: string
}

function KeyValueField({ label, value, onChange, placeholder }: KeyValueFieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'N/A'}
      />
    </div>
  )
}
