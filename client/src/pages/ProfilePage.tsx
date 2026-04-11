import { useEffect, useState } from 'react'
import { accountApi } from '@/modules/admin/api'
import type { UserProfile } from '@/modules/admin/types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      try {
        const data = await accountApi.getProfile()
        setProfile(data)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        title: profile.title ?? '',
        phone: profile.phone ?? '',
        managerName: profile.managerName ?? '',
        email: profile.email ?? '',
        addressLine: profile.address?.line ?? '',
        city: profile.address?.city ?? '',
        state: profile.address?.state ?? '',
        country: profile.address?.country ?? '',
        zip: profile.address?.zip ?? '',
      })
    }
  }, [profile])

  function handleChange(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    const updated = await accountApi.updateProfile({
      firstName: form.firstName,
      lastName: form.lastName,
      title: form.title || null,
      phone: form.phone || null,
      managerName: form.managerName || null,
      address: {
        line: form.addressLine,
        city: form.city,
        state: form.state,
        country: form.country,
        zip: form.zip,
      },
    })
    setProfile(updated)
    setEditing(false)
  }

  function handleCancel() {
    if (profile) {
      setForm({
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        title: profile.title ?? '',
        phone: profile.phone ?? '',
        managerName: profile.managerName ?? '',
        email: profile.email ?? '',
        addressLine: profile.address?.line ?? '',
        city: profile.address?.city ?? '',
        state: profile.address?.state ?? '',
        country: profile.address?.country ?? '',
        zip: profile.address?.zip ?? '',
      })
    }
    setEditing(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  const initials = profile
    ? `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase()
    : ''

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar size="lg">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-semibold">
              {profile?.firstName} {profile?.lastName}
            </h1>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={form.firstName ?? ''}
              onChange={(e) => handleChange('firstName', e.target.value)}
              disabled={!editing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={form.lastName ?? ''}
              onChange={(e) => handleChange('lastName', e.target.value)}
              disabled={!editing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title ?? ''}
              onChange={(e) => handleChange('title', e.target.value)}
              disabled={!editing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={form.phone ?? ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              disabled={!editing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="managerName">Manager</Label>
            <Input
              id="managerName"
              value={form.managerName ?? ''}
              onChange={(e) => handleChange('managerName', e.target.value)}
              disabled={!editing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={form.email ?? ''} disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="col-span-full space-y-2">
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
  )
}
