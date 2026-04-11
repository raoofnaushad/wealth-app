import { useEffect, useState } from 'react'
import { useAdminStore } from '@/store/useAdminStore'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'AED', 'SGD']
const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Zurich',
  'Asia/Singapore',
  'Asia/Dubai',
]

export function CompanyProfilePage() {
  const {
    orgProfile,
    loadingOrgProfile,
    fetchOrgProfile,
    updateOrgProfile,
  } = useAdminStore()

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchOrgProfile()
  }, [fetchOrgProfile])

  useEffect(() => {
    if (orgProfile) {
      setForm({
        name: orgProfile.name ?? '',
        companyNumber: orgProfile.companyNumber ?? '',
        websiteUrl: orgProfile.websiteUrl ?? '',
        supportEmail: orgProfile.supportEmail ?? '',
        currency: orgProfile.currency ?? 'USD',
        timezone: orgProfile.timezone ?? 'America/New_York',
        addressLine: orgProfile.address?.line ?? '',
        city: orgProfile.address?.city ?? '',
        state: orgProfile.address?.state ?? '',
        country: orgProfile.address?.country ?? '',
        zip: orgProfile.address?.zip ?? '',
      })
    }
  }, [orgProfile])

  function handleChange(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    await updateOrgProfile({
      name: form.name,
      companyNumber: form.companyNumber || null,
      websiteUrl: form.websiteUrl || null,
      supportEmail: form.supportEmail || null,
      currency: form.currency,
      timezone: form.timezone,
      address: {
        line: form.addressLine,
        city: form.city,
        state: form.state,
        country: form.country,
        zip: form.zip,
      },
    })
    setEditing(false)
  }

  function handleCancel() {
    if (orgProfile) {
      setForm({
        name: orgProfile.name ?? '',
        companyNumber: orgProfile.companyNumber ?? '',
        websiteUrl: orgProfile.websiteUrl ?? '',
        supportEmail: orgProfile.supportEmail ?? '',
        currency: orgProfile.currency ?? 'USD',
        timezone: orgProfile.timezone ?? 'America/New_York',
        addressLine: orgProfile.address?.line ?? '',
        city: orgProfile.address?.city ?? '',
        state: orgProfile.address?.state ?? '',
        country: orgProfile.address?.country ?? '',
        zip: orgProfile.address?.zip ?? '',
      })
    }
    setEditing(false)
  }

  if (loadingOrgProfile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Company Profile</h1>
        <div className="flex items-center gap-2">
          {orgProfile && (
            <Badge variant={orgProfile.isActive ? 'default' : 'secondary'}>
              {orgProfile.isActive ? 'Active' : 'Inactive'}
            </Badge>
          )}
          {editing ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name</Label>
              <Input
                id="name"
                value={form.name ?? ''}
                onChange={(e) => handleChange('name', e.target.value)}
                disabled={!editing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyNumber">Company Number</Label>
              <Input
                id="companyNumber"
                value={form.companyNumber ?? ''}
                onChange={(e) => handleChange('companyNumber', e.target.value)}
                disabled={!editing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website URL</Label>
              <Input
                id="websiteUrl"
                value={form.websiteUrl ?? ''}
                onChange={(e) => handleChange('websiteUrl', e.target.value)}
                disabled={!editing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input
                id="supportEmail"
                value={form.supportEmail ?? ''}
                onChange={(e) => handleChange('supportEmail', e.target.value)}
                disabled={!editing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Default Currency</Label>
              <Select
                value={form.currency ?? 'USD'}
                onValueChange={(v) => { if (v) handleChange('currency', v) }}
                disabled={!editing}
              >
                <SelectTrigger id="currency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={form.timezone ?? 'America/New_York'}
                onValueChange={(v) => { if (v) handleChange('timezone', v) }}
                disabled={!editing}
              >
                <SelectTrigger id="timezone" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="addressLine">Address Line</Label>
              <Input
                id="addressLine"
                value={form.addressLine ?? ''}
                onChange={(e) => handleChange('addressLine', e.target.value)}
                disabled={!editing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city ?? ''}
                onChange={(e) => handleChange('city', e.target.value)}
                disabled={!editing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={form.state ?? ''}
                onChange={(e) => handleChange('state', e.target.value)}
                disabled={!editing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={form.country ?? ''}
                onChange={(e) => handleChange('country', e.target.value)}
                disabled={!editing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP / Postal Code</Label>
              <Input
                id="zip"
                value={form.zip ?? ''}
                onChange={(e) => handleChange('zip', e.target.value)}
                disabled={!editing}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
