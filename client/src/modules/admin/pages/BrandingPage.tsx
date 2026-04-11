import { useEffect, useState, useRef } from 'react'
import { useAdminStore } from '@/store/useAdminStore'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Upload, X } from 'lucide-react'
import type { OrgBranding } from '../types'

export function BrandingPage() {
  const { branding, loadingBranding, fetchBranding, updateBranding } =
    useAdminStore()

  const [editing, setEditing] = useState(false)
  const [headerLogo, setHeaderLogo] = useState<'small' | 'large'>('small')
  const [brandColor, setBrandColor] = useState('#000000')
  const [emailFooter, setEmailFooter] = useState('')
  const [smallLogoPreview, setSmallLogoPreview] = useState<string | null>(null)
  const [largeLogoPreview, setLargeLogoPreview] = useState<string | null>(null)

  const smallLogoRef = useRef<HTMLInputElement>(null)
  const largeLogoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchBranding()
  }, [fetchBranding])

  useEffect(() => {
    if (branding) {
      setHeaderLogo(branding.headerLogo)
      setBrandColor(branding.brandColor)
      setEmailFooter(branding.emailFooter)
      setSmallLogoPreview(branding.smallLogoUrl)
      setLargeLogoPreview(branding.largeLogoUrl)
    }
  }, [branding])

  function handleFileSelect(
    e: React.ChangeEvent<HTMLInputElement>,
    setPreview: (url: string | null) => void,
  ) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    const data: Partial<OrgBranding> = {
      headerLogo,
      brandColor,
      emailFooter,
      smallLogoUrl: smallLogoPreview,
      largeLogoUrl: largeLogoPreview,
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
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
        <CardContent className="space-y-6">
          <div className="flex items-start gap-8">
            {/* Small Logo */}
            <div className="space-y-2">
              <Label>Small Logo (48x48)</Label>
              <div className="relative group">
                {smallLogoPreview ? (
                  <div className="relative h-16 w-16">
                    <img
                      src={smallLogoPreview}
                      alt="Small logo"
                      className="h-16 w-16 rounded-lg border object-contain bg-white p-1"
                    />
                    {editing && (
                      <button
                        onClick={() => { setSmallLogoPreview(null); if (smallLogoRef.current) smallLogoRef.current.value = '' }}
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 text-xs text-muted-foreground">
                    48×48
                  </div>
                )}
              </div>
              <input
                ref={smallLogoRef}
                type="file"
                accept="image/png,image/svg+xml,image/jpeg"
                className="hidden"
                onChange={(e) => handleFileSelect(e, setSmallLogoPreview)}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={!editing}
                onClick={() => smallLogoRef.current?.click()}
              >
                <Upload className="h-3 w-3 mr-1.5" />
                Upload
              </Button>
            </div>

            {/* Large Logo */}
            <div className="space-y-2">
              <Label>Large Logo (200x48)</Label>
              <div className="relative group">
                {largeLogoPreview ? (
                  <div className="relative h-16 w-[200px]">
                    <img
                      src={largeLogoPreview}
                      alt="Large logo"
                      className="h-16 w-[200px] rounded-lg border object-contain bg-white p-1"
                    />
                    {editing && (
                      <button
                        onClick={() => { setLargeLogoPreview(null); if (largeLogoRef.current) largeLogoRef.current.value = '' }}
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex h-16 w-[200px] items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 text-xs text-muted-foreground">
                    200×48
                  </div>
                )}
              </div>
              <input
                ref={largeLogoRef}
                type="file"
                accept="image/png,image/svg+xml,image/jpeg"
                className="hidden"
                onChange={(e) => handleFileSelect(e, setLargeLogoPreview)}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={!editing}
                onClick={() => largeLogoRef.current?.click()}
              >
                <Upload className="h-3 w-3 mr-1.5" />
                Upload
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
            <label className="relative h-10 w-10 cursor-pointer">
              <div
                className="h-10 w-10 rounded-lg border-2 border-border"
                style={{ backgroundColor: brandColor }}
              />
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                disabled={!editing}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
            <Input
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              disabled={!editing}
              className="w-32 font-mono text-sm"
              placeholder="#1E3A5F"
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
