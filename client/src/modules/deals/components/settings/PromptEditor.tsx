import { useState } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { dealsApi } from '../../api'
import type { DocumentTemplate } from '../../types'

interface PromptEditorProps {
  template: DocumentTemplate
  onBack: () => void
  onSaved: () => void
}

export function PromptEditor({ template, onBack, onSaved }: PromptEditorProps) {
  const [promptTemplate, setPromptTemplate] = useState(template.promptTemplate)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await dealsApi.updateTemplate(template.id, { promptTemplate })
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
        <h2 className="text-xl font-semibold">{template.name}</h2>
      </div>

      <div className="space-y-2">
        <Textarea
          className="min-h-[400px] font-mono text-sm"
          value={promptTemplate}
          onChange={(e) => setPromptTemplate(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Use <code className="rounded bg-muted px-1 py-0.5">{'{{variable}}'}</code> placeholders
          to insert dynamic values from the snapshot data into the generated document.
        </p>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          <Save className="size-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
