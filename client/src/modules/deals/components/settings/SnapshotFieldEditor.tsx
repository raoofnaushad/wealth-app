import { useState } from 'react'
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { FieldConfigRow } from './FieldConfigRow'
import { dealsApi } from '../../api'
import type { InvestmentType, SnapshotField, SnapshotSection } from '../../types'

interface SnapshotFieldEditorProps {
  investmentType: InvestmentType
  onBack: () => void
  onSaved: () => void
}

export function SnapshotFieldEditor({ investmentType, onBack, onSaved }: SnapshotFieldEditorProps) {
  const [sections, setSections] = useState<SnapshotSection[]>(
    () => structuredClone(investmentType.snapshotConfig.sections)
  )
  const [saving, setSaving] = useState(false)

  function updateSection(index: number, updated: Partial<SnapshotSection>) {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...updated } : s))
    )
  }

  function removeSection(index: number) {
    setSections((prev) => prev.filter((_, i) => i !== index))
  }

  function addSection() {
    setSections((prev) => [
      ...prev,
      { name: '', sortOrder: prev.length, fields: [] },
    ])
  }

  function updateField(sectionIndex: number, fieldIndex: number, field: SnapshotField) {
    setSections((prev) =>
      prev.map((s, si) =>
        si === sectionIndex
          ? { ...s, fields: s.fields.map((f, fi) => (fi === fieldIndex ? field : f)) }
          : s
      )
    )
  }

  function removeField(sectionIndex: number, fieldIndex: number) {
    setSections((prev) =>
      prev.map((s, si) =>
        si === sectionIndex
          ? { ...s, fields: s.fields.filter((_, fi) => fi !== fieldIndex) }
          : s
      )
    )
  }

  function addField(sectionIndex: number) {
    setSections((prev) =>
      prev.map((s, si) =>
        si === sectionIndex
          ? {
              ...s,
              fields: [
                ...s.fields,
                { name: '', type: 'text' as const, required: false, instruction: '' },
              ],
            }
          : s
      )
    )
  }

  async function handleSave() {
    setSaving(true)
    try {
      await dealsApi.updateInvestmentType(investmentType.id, {
        snapshotConfig: { sections },
      })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <h2 className="text-xl font-semibold">{investmentType.name}</h2>
      </div>

      {sections.map((section, si) => (
        <Card key={si}>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <Input
              className="max-w-xs font-medium"
              placeholder="Section name"
              value={section.name}
              onChange={(e) => updateSection(si, { name: e.target.value })}
            />
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto size-8 text-muted-foreground hover:text-destructive"
              onClick={() => removeSection(si)}
            >
              <Trash2 className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {section.fields.map((field, fi) => (
              <FieldConfigRow
                key={fi}
                field={field}
                onChange={(updated) => updateField(si, fi, updated)}
                onRemove={() => removeField(si, fi)}
              />
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => addField(si)}
              className="gap-1.5"
            >
              <Plus className="size-3.5" />
              Add Field
            </Button>
          </CardContent>
        </Card>
      ))}

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={addSection} className="gap-1.5">
          <Plus className="size-4" />
          Add Section
        </Button>

        <Button onClick={handleSave} disabled={saving} className="ml-auto gap-1.5">
          <Save className="size-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
