import { useState } from 'react'
import { Plus, Settings2 } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SnapshotFieldEditor } from './SnapshotFieldEditor'
import { useDealsStore } from '../../store'
import type { InvestmentType } from '../../types'

export function InvestmentTypeList() {
  const { investmentTypes, fetchInvestmentTypes } = useDealsStore()
  const [editing, setEditing] = useState<InvestmentType | null>(null)

  if (editing) {
    return (
      <SnapshotFieldEditor
        investmentType={editing}
        onBack={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          fetchInvestmentTypes()
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Configure snapshot fields for each investment type.
        </p>
        <Button variant="outline" className="gap-1.5">
          <Plus className="size-4" />
          Add Investment Type
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {investmentTypes.map((type) => {
          const sectionCount = type.snapshotConfig.sections.length
          const fieldCount = type.snapshotConfig.sections.reduce(
            (sum, s) => sum + s.fields.length,
            0
          )

          return (
            <Card
              key={type.id}
              className="cursor-pointer transition-colors hover:border-primary/40"
              onClick={() => setEditing(type)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{type.name}</CardTitle>
                    <CardDescription>
                      {sectionCount} section{sectionCount !== 1 ? 's' : ''},{' '}
                      {fieldCount} field{fieldCount !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={type.isSystem ? 'secondary' : 'outline'}>
                      {type.isSystem ? 'System' : 'Custom'}
                    </Badge>
                    <Settings2 className="size-4 text-muted-foreground" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
