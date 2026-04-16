import { useState } from 'react'
import { FileText, Plus, Trash2 } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PromptEditor } from './PromptEditor'
import { useDealsStore } from '../../store'
import { useAuthStore } from '@/store/useAuthStore'
import { dealsApi } from '../../api'
import type { DocumentTemplate } from '../../types'

export function TemplateList() {
  const { templates, investmentTypes, fetchTemplates } = useDealsStore()
  const [editing, setEditing] = useState<DocumentTemplate | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const role = useAuthStore((s) => s.getModuleRole('deals'))
  const isOwner = role === 'owner'

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await dealsApi.deleteTemplate(id)
      await fetchTemplates()
    } finally {
      setDeletingId(null)
    }
  }

  if (editing) {
    return (
      <PromptEditor
        template={editing}
        onBack={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          fetchTemplates()
        }}
      />
    )
  }

  // Group templates by investment type
  const typeMap = new Map(investmentTypes.map((t) => [t.id, t.name]))
  const grouped = templates.reduce<Record<string, DocumentTemplate[]>>((acc, tpl) => {
    const typeName = typeMap.get(tpl.investmentTypeId) ?? 'Other'
    if (!acc[typeName]) acc[typeName] = []
    acc[typeName].push(tpl)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Edit prompt templates used for AI-generated deal documents.
        </p>
        {isOwner && (
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
            <Plus className="size-3.5" />
            New Template
          </Button>
        )}
      </div>

      {Object.entries(grouped).map(([typeName, groupTemplates]) => (
        <div key={typeName} className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">{typeName}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groupTemplates.map((tpl) => (
              <Card
                key={tpl.id}
                className="group cursor-pointer transition-colors hover:border-primary/40"
                onClick={() => setEditing(tpl)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <FileText className="mt-0.5 size-4 text-muted-foreground" />
                      <div className="space-y-1">
                        <CardTitle className="text-base">{tpl.name}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {tpl.promptTemplate.slice(0, 80)}
                          {tpl.promptTemplate.length > 80 ? '...' : ''}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={tpl.isSystem ? 'secondary' : 'outline'}>
                        {tpl.isSystem ? 'System' : 'Custom'}
                      </Badge>
                      {!tpl.isSystem && isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(tpl.id)
                          }}
                          disabled={deletingId === tpl.id}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {templates.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No document templates configured yet.
        </p>
      )}

      {showCreate && isOwner && (
        <CreateTemplateDialog
          investmentTypes={investmentTypes.map(t => ({ id: t.id, name: t.name }))}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            fetchTemplates()
          }}
        />
      )}
    </div>
  )
}

interface CreateTemplateDialogProps {
  investmentTypes: { id: string; name: string }[]
  onClose: () => void
  onCreated: () => void
}

function CreateTemplateDialog({ investmentTypes, onClose, onCreated }: CreateTemplateDialogProps) {
  const [name, setName] = useState('')
  const [investmentTypeId, setInvestmentTypeId] = useState(investmentTypes[0]?.id ?? '')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!name.trim() || !investmentTypeId) return
    setSubmitting(true)
    try {
      await dealsApi.createTemplate({
        name: name.trim(),
        investmentTypeId,
        promptTemplate: `Generate a ${name.trim()} for the following opportunity:\n\n{{snapshot_data}}`,
      })
      onCreated()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Template Name</Label>
            <Input
              placeholder="e.g. Due Diligence Report"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Investment Type</Label>
            <Select value={investmentTypeId} onValueChange={(val) => { if (val) setInvestmentTypeId(val) }}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {investmentTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || submitting}>
            {submitting ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
