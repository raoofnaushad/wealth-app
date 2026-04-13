import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

const ASSET_MANAGER_TYPES = [
  'Venture Capital',
  'Private Equity',
  'Real Estate',
  'Hedge Fund',
  'Infrastructure',
  'Credit',
  'Other',
]

interface AssetManagerFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AssetManagerForm({ open, onOpenChange }: AssetManagerFormProps) {
  const navigate = useNavigate()
  const fetchAssetManagers = useDealsStore((s) => s.fetchAssetManagers)
  const [name, setName] = useState('')
  const [type, setType] = useState<string>('')
  const [location, setLocation] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setSubmitting(true)
    try {
      const am = await dealsApi.createAssetManager({
        name: name.trim(),
        type: type || undefined,
        location: location.trim() || undefined,
      })
      await fetchAssetManagers()
      onOpenChange(false)
      setName('')
      setType('')
      setLocation('')
      navigate(`/home/deals/asset-managers/${am.id}`)
    } catch {
      // TODO: surface error to user
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Asset Manager</DialogTitle>
            <DialogDescription>
              Create a new asset manager. You can fill in additional details after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="am-name">Name</Label>
              <Input
                id="am-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Blackstone Real Estate"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v ?? '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_MANAGER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="am-location">Location</Label>
              <Input
                id="am-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. New York, NY"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
