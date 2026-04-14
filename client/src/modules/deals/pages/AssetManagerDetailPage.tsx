import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { dealsApi } from '../api'
import { AssetManagerProfile } from '../components/asset-managers/AssetManagerProfile'
import { LinkedOpportunities } from '../components/asset-managers/LinkedOpportunities'
import type { AssetManager } from '../types'

export function AssetManagerDetailPage() {
  const { assetManagerId } = useParams<{ assetManagerId: string }>()
  const navigate = useNavigate()
  const [assetManager, setAssetManager] = useState<AssetManager | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!assetManagerId) return
    setLoading(true)
    dealsApi
      .getAssetManager(assetManagerId)
      .then(setAssetManager)
      .catch(() => {
        // TODO: handle not found
      })
      .finally(() => setLoading(false))
  }, [assetManagerId])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  if (!assetManager) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <Building2 className="size-10 text-muted-foreground/50" />
        <p className="font-medium">Asset manager not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/home/deals/asset-managers')}>
          <ArrowLeft className="mr-1 size-3.5" />
          Back to Asset Managers
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate('/home/deals/asset-managers')}
          aria-label="Back to asset managers"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{assetManager.name}</h1>
        {assetManager.type && (
          <Badge variant="secondary" className="shrink-0">
            {assetManager.type}
          </Badge>
        )}
      </div>

      <AssetManagerProfile assetManager={assetManager} onUpdate={setAssetManager} />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Linked Opportunities</h2>
        <LinkedOpportunities assetManagerId={assetManager.id} />
      </div>
    </div>
  )
}
