import { Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SnapshotField, SnapshotFieldType } from '../../types'

const FIELD_TYPES: { value: SnapshotFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'multi-select', label: 'Multi Select' },
  { value: 'textarea', label: 'Textarea' },
]

interface FieldConfigRowProps {
  field: SnapshotField
  onChange: (updated: SnapshotField) => void
  onRemove: () => void
}

export function FieldConfigRow({ field, onChange, onRemove }: FieldConfigRowProps) {
  function handleChange(key: keyof SnapshotField, value: unknown) {
    onChange({ ...field, [key]: value })
  }

  return (
    <div className="flex items-start gap-3 rounded-md border border-border/50 bg-muted/30 p-3">
      <div className="grid flex-1 gap-3 sm:grid-cols-4">
        <Input
          placeholder="Field name"
          value={field.name}
          onChange={(e) => handleChange('name', e.target.value)}
        />

        <Select
          value={field.type}
          onValueChange={(val) => handleChange('type', val)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {FIELD_TYPES.map((ft) => (
              <SelectItem key={ft.value} value={ft.value}>
                {ft.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="AI instruction"
          value={field.instruction}
          onChange={(e) => handleChange('instruction', e.target.value)}
        />

        <div className="flex items-center gap-3">
          <Input
            placeholder="Description"
            value={field.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className="flex-1"
          />

          <Button
            variant="ghost"
            size="icon"
            className="ml-auto size-8 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
