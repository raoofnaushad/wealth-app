import { useState } from 'react'
import { FileText } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PromptEditor } from './PromptEditor'
import { useDealsStore } from '../../store'
import type { DocumentTemplate } from '../../types'

export function TemplateList() {
  const { templates, investmentTypes, fetchTemplates } = useDealsStore()
  const [editing, setEditing] = useState<DocumentTemplate | null>(null)

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
      <p className="text-sm text-muted-foreground">
        Edit prompt templates used for AI-generated deal documents.
      </p>

      {Object.entries(grouped).map(([typeName, groupTemplates]) => (
        <div key={typeName} className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">{typeName}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groupTemplates.map((tpl) => (
              <Card
                key={tpl.id}
                className="cursor-pointer transition-colors hover:border-primary/40"
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
                    <Badge variant={tpl.isSystem ? 'secondary' : 'outline'}>
                      {tpl.isSystem ? 'System' : 'Custom'}
                    </Badge>
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
    </div>
  )
}
