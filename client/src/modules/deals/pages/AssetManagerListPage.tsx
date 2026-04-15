import { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useDealsStore } from '../store'
import { dealsApi } from '../api'
import { AssetManagerTable } from '../components/asset-managers/AssetManagerTable'
import { AssetManagerForm } from '../components/asset-managers/AssetManagerForm'

const ASSET_MANAGER_TYPES = [
  'Venture Capital',
  'Private Equity',
  'Real Estate',
  'Hedge Fund',
  'Infrastructure',
  'Credit',
  'Other',
]

export function AssetManagerListPage() {
  const assetManagers = useDealsStore((s) => s.assetManagers)
  const loadingAssetManagers = useDealsStore((s) => s.loadingAssetManagers)
  const fetchAssetManagers = useDealsStore((s) => s.fetchAssetManagers)

  async function handleDelete(id: string) {
    try {
      await dealsApi.deleteAssetManager(id)
      await fetchAssetManagers()
      toast.success('Asset manager deleted.')
    } catch {
      toast.error('Failed to delete asset manager.')
    }
  }

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    fetchAssetManagers()
  }, [fetchAssetManagers])

  const filtered = assetManagers.filter((am) => {
    const matchesSearch = !search || am.name.toLowerCase().includes(search.toLowerCase())
    const matchesType = !typeFilter || am.type === typeFilter
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Asset Managers</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-1.5 size-4" />
          Add Asset Manager
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(!v || v === '__all__' ? '' : v)}>
          <SelectTrigger>
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All types</SelectItem>
            {ASSET_MANAGER_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loadingAssetManagers ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <AssetManagerTable assetManagers={filtered} onDelete={handleDelete} />
      )}

      <AssetManagerForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
