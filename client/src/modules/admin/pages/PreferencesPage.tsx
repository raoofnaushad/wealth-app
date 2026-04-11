import { useEffect } from 'react'
import { useAdminStore } from '@/store/useAdminStore'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { OrgPreferences } from '../types'

const DATE_FORMATS: OrgPreferences['dateFormat'][] = [
  'DD/MM/YYYY',
  'MM/DD/YYYY',
  'YYYY-MM-DD',
]

const NUMBER_FORMATS: OrgPreferences['numberFormat'][] = [
  '1,000.00',
  '1.000,00',
]

export function PreferencesPage() {
  const { preferences, loadingPreferences, fetchPreferences, updatePreferences } =
    useAdminStore()

  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

  function handleDateFormatChange(value: string | null) {
    if (value) {
      updatePreferences({ dateFormat: value as OrgPreferences['dateFormat'] })
    }
  }

  function handleNumberFormatChange(value: string | null) {
    if (value) {
      updatePreferences({ numberFormat: value as OrgPreferences['numberFormat'] })
    }
  }

  if (loadingPreferences) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Preferences</h1>

      <Card>
        <CardHeader>
          <CardTitle>Display Formats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dateFormat">Date Format</Label>
            <Select
              value={preferences?.dateFormat ?? 'DD/MM/YYYY'}
              onValueChange={handleDateFormatChange}
            >
              <SelectTrigger id="dateFormat" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMATS.map((fmt) => (
                  <SelectItem key={fmt} value={fmt}>
                    {fmt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="numberFormat">Number Format</Label>
            <Select
              value={preferences?.numberFormat ?? '1,000.00'}
              onValueChange={handleNumberFormatChange}
            >
              <SelectTrigger id="numberFormat" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NUMBER_FORMATS.map((fmt) => (
                  <SelectItem key={fmt} value={fmt}>
                    {fmt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
