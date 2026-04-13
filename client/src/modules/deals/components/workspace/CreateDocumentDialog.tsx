import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { FileText, Plus, Search } from 'lucide-react'
import { dealsApi } from '../../api'
import { useDealsStore } from '../../store'
import type { DocumentType, DocumentTemplate } from '../../types'

interface CreateDocumentDialogProps {
  opportunityId: string
  opportunityName: string
  investmentTypeId: string | null
  onClose: () => void
}

function getDocTypeFromTemplate(templateName: string): DocumentType {
  const lower = templateName.toLowerCase()
  if (lower.includes('memo')) return 'investment_memo'
  if (lower.includes('screening')) return 'pre_screening'
  if (lower.includes('ddq') || lower.includes('diligence')) return 'ddq'
  if (lower.includes('market')) return 'market_analysis'
  if (lower.includes('news')) return 'news'
  return 'custom'
}

export function CreateDocumentDialog({
  opportunityId,
  opportunityName,
  investmentTypeId,
  onClose,
}: CreateDocumentDialogProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [customMode, setCustomMode] = useState(false)
  const [name, setName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const templates = useDealsStore((s) => s.templates)
  const investmentTypes = useDealsStore((s) => s.investmentTypes)
  const fetchTemplates = useDealsStore((s) => s.fetchTemplates)
  const addWorkspaceDocument = useDealsStore((s) => s.addWorkspaceDocument)

  useEffect(() => {
    if (investmentTypeId) {
      fetchTemplates(investmentTypeId)
    }
  }, [investmentTypeId, fetchTemplates])

  const filteredTemplates = useMemo(() => {
    const base = templates.filter(
      (t) => !investmentTypeId || t.investmentTypeId === investmentTypeId
    )
    if (!searchQuery.trim()) return base
    const q = searchQuery.toLowerCase()
    return base.filter((t) => t.name.toLowerCase().includes(q))
  }, [templates, investmentTypeId, searchQuery])

  const investmentTypeMap = useMemo(
    () => new Map(investmentTypes.map((t) => [t.id, t.name])),
    [investmentTypes]
  )

  function handleTemplateSelect(template: DocumentTemplate) {
    setSelectedTemplateId(template.id)
    setCustomMode(false)
    setName(`${template.name} — ${opportunityName}`)
  }

  function handleScratchSelect() {
    setCustomMode(true)
    setSelectedTemplateId(null)
    setName('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    if (!selectedTemplateId && !customMode) return

    setSubmitting(true)
    try {
      const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)
      const documentType: DocumentType = selectedTemplate
        ? getDocTypeFromTemplate(selectedTemplate.name)
        : 'custom'

      const payload: { name: string; documentType: string; templateId?: string } = {
        name: name.trim(),
        documentType,
      }
      if (selectedTemplateId) {
        payload.templateId = selectedTemplateId
      }
      const createdDoc = await dealsApi.createDocument(opportunityId, payload)
      addWorkspaceDocument(createdDoc)
      onClose()
    } catch {
      // TODO: surface error to user
    } finally {
      setSubmitting(false)
    }
  }

  const hasSelection = selectedTemplateId !== null || customMode
  const canSubmit = hasSelection && name.trim().length > 0

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Document</DialogTitle>
            <DialogDescription>
              Choose a template for {opportunityName}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="pl-9"
              />
            </div>

            {/* Template cards grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[360px] overflow-y-auto">
              {filteredTemplates.map((template) => {
                const isSelected = selectedTemplateId === template.id
                const typeName = investmentTypeMap.get(template.investmentTypeId) ?? 'Other'
                const description = template.promptTemplate
                  ? template.promptTemplate.slice(0, 60) + (template.promptTemplate.length > 60 ? '...' : '')
                  : ''

                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleTemplateSelect(template)}
                    className={`flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors ${
                      isSelected
                        ? 'ring-2 ring-primary border-primary'
                        : 'hover:border-foreground/20 cursor-pointer'
                    }`}
                  >
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{template.name}</span>
                    <div className="w-full border-t" />
                    <Badge variant="outline">{typeName}</Badge>
                    {description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {description}
                      </p>
                    )}
                  </button>
                )
              })}

              {/* Start from scratch card */}
              <button
                type="button"
                onClick={handleScratchSelect}
                className={`flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors ${
                  customMode
                    ? 'ring-2 ring-primary border-primary'
                    : 'hover:border-foreground/20 cursor-pointer'
                }`}
              >
                <Plus className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Start from scratch</span>
                <div className="w-full border-t" />
                <Badge variant="outline">Custom</Badge>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  Create a blank document from scratch.
                </p>
              </button>
            </div>

            {/* Document name */}
            <div className="space-y-2">
              <Label htmlFor="doc-name">Document Name</Label>
              <Input
                id="doc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Auto-generated or custom name"
                required
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !canSubmit}>
              {submitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
