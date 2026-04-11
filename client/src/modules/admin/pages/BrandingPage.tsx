import { useEffect, useState } from 'react'
import { useAdminStore } from '@/store/useAdminStore'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import type { OrgBranding } from '../types'

export function BrandingPage() {
  const { branding, loadingBranding, fetchBranding, updateBranding } =
    useAdminStore()

  const [editing, setEditing] = useState(false)
  const [headerLogo, setHeaderLogo] = useState<'small' | 'large'>('small')
  const [brandColor, setBrandColor] = useState('#000000')
  const [emailFooter, setEmailFooter] = useState('')

  useEffect(() => {
    fetchBranding()
  }, [fetchBranding])

  useEffect(() => {
    if (branding) {
      setHeaderLogo(branding.headerLogo)
      setBrandColor(branding.brandColor)
      setEmailFooter(branding.emailFooter)
    }
  }, [branding])

  async function handleSave() {
    const data: Partial<OrgBranding> = {
      headerLogo,
      brandColor,
      emailFooter,
    }
    await updateBranding(data)
    setEditing(false)
  }

  if (loadingBranding) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Branding</h1>
        {editing ? (
          <Button onClick={handleSave}>Save</Button>
        ) : (
          <Button variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-6">
            <div className="space-y-2">
              <Label>Small Logo (48x48)</Label>
              <div className="flex h-12 w-12 items-center justify-center rounded border-2 border-dashed border-muted-foreground/25 text-xs text-muted-foreground">
                48
              </div>
              <Button variant="outline" size="sm" disabled>
                Upload (v2)
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Large Logo (200x48)</Label>
              <div className="flex h-12 w-[200px] items-center justify-center rounded border-2 border-dashed border-muted-foreground/25 text-xs text-muted-foreground">
                200 x 48
              </div>
              <Button variant="outline" size="sm" disabled>
                Upload (v2)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Header Logo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Button
              variant={headerLogo === 'small' ? 'default' : 'outline'}
              size="sm"
              onClick={() => editing && setHeaderLogo('small')}
              disabled={!editing}
            >
              Small
            </Button>
            <Button
              variant={headerLogo === 'large' ? 'default' : 'outline'}
              size="sm"
              onClick={() => editing && setHeaderLogo('large')}
              disabled={!editing}
            >
              Large
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brand Color</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded border"
              style={{ backgroundColor: brandColor }}
            />
            <Input
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              disabled={!editing}
              className="w-32"
              placeholder="#000000"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Footer</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={emailFooter}
            onChange={(e) => setEmailFooter(e.target.value)}
            disabled={!editing}
            rows={4}
            placeholder="Footer text for outgoing emails..."
          />
        </CardContent>
      </Card>
    </div>
  )
}
