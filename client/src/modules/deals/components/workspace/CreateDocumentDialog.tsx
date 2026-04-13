import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { dealsApi } from '../../api'
import { useDealsStore } from '../../store'
import type { DocumentType } from '../../types'

interface CreateDocumentDialogProps {
  opportunityId: string
  opportunityName: string
  investmentTypeId: string | null
  onClose: () => void
}

const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: 'investment_memo', label: 'Investment Memo' },
  { value: 'pre_screening', label: 'Pre-Screening Report' },
  { value: 'ddq', label: 'DDQ' },
  { value: 'market_analysis', label: 'Market Analysis' },
  { value: 'news', label: 'News/Insights' },
  { value: 'custom', label: 'Custom' },
]

function getDefaultName(docType: DocumentType, opportunityName: string): string {
  switch (docType) {
    case 'investment_memo':
      return `Investment Memo — ${opportunityName}`
    case 'pre_screening':
      return `Pre-Screening Report — ${opportunityName}`
    case 'ddq':
      return `DDQ — ${opportunityName}`
    case 'market_analysis':
      return `Market Analysis — ${opportunityName}`
    case 'news':
      return `News/Insights — ${opportunityName}`
    case 'custom':
      return ''
  }
}

export function CreateDocumentDialog({
  opportunityId,
  opportunityName,
  investmentTypeId,
  onClose,
}: CreateDocumentDialogProps) {
  const [documentType, setDocumentType] = useState<DocumentType | ''>('')
  const [name, setName] = useState('')
  const [templateId, setTemplateId] = useState<string | ''>('')
  const [submitting, setSubmitting] = useState(false)

  const templates = useDealsStore((s) => s.templates)
  const fetchTemplates = useDealsStore((s) => s.fetchTemplates)
  const addWorkspaceDocument = useDealsStore((s) => s.addWorkspaceDocument)

  useEffect(() => {
    if (investmentTypeId) {
      fetchTemplates(investmentTypeId)
    }
  }, [investmentTypeId, fetchTemplates])

  function handleTypeChange(value: DocumentType) {
    setDocumentType(value)
    setName(getDefaultName(value, opportunityName))
    setTemplateId('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!documentType || !name.trim()) return

    setSubmitting(true)
    try {
      const payload: { name: string; documentType: string; templateId?: string } = {
        name: name.trim(),
        documentType,
      }
      if (templateId) {
        payload.templateId = templateId
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

  const filteredTemplates = templates.filter(
    (t) => !investmentTypeId || t.investmentTypeId === investmentTypeId
  )
  const showTemplateField = documentType !== '' && documentType !== 'custom'

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Document</DialogTitle>
            <DialogDescription>
              Create a new document for {opportunityName}. Select a type and optionally choose a template.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-type">Document Type</Label>
              <Select
                value={documentType}
                onValueChange={(val) => handleTypeChange(val as DocumentType)}
              >
                <SelectTrigger className="w-full" id="doc-type">
                  <SelectValue placeholder="Select a document type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-name">Name</Label>
              <Input
                id="doc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Document name"
                required
              />
            </div>

            {showTemplateField && filteredTemplates.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="doc-template">Template (optional)</Label>
                <Select
                  value={templateId}
                  onValueChange={(val) => setTemplateId(val ?? '')}
                >
                  <SelectTrigger className="w-full" id="doc-template">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !documentType || !name.trim()}>
              {submitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
