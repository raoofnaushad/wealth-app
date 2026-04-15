import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/useAuthStore'
import type { AssetManager } from '../../types'

interface AssetManagerTableProps {
  assetManagers: AssetManager[]
  onDelete?: (id: string) => void
}

export function AssetManagerTable({ assetManagers, onDelete }: AssetManagerTableProps) {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.getModuleRole('deals'))
  const isOwner = role === 'owner'

  if (assetManagers.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed py-12 text-sm text-muted-foreground">
        No asset managers found.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-muted-foreground">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Location</th>
            <th className="px-4 py-3 font-medium">Firm AUM</th>
            <th className="px-4 py-3 font-medium">Last Modified</th>
            {isOwner && <th className="px-4 py-3 font-medium w-16" />}
          </tr>
        </thead>
        <tbody>
          {assetManagers.map((am) => (
            <tr
              key={am.id}
              className="cursor-pointer border-b transition-colors hover:bg-muted/50 last:border-b-0"
              onClick={() => navigate(`/home/deals/asset-managers/${am.id}`)}
            >
              <td className="px-4 py-3 font-medium">{am.name}</td>
              <td className="px-4 py-3">{am.type || <span className="text-muted-foreground">&mdash;</span>}</td>
              <td className="px-4 py-3">{am.location || <span className="text-muted-foreground">&mdash;</span>}</td>
              <td className="px-4 py-3">
                {am.firmInfo?.firm_aum || <span className="text-muted-foreground">&mdash;</span>}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(am.updatedAt).toLocaleDateString()}
              </td>
              {isOwner && (
                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete?.(am.id)
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
