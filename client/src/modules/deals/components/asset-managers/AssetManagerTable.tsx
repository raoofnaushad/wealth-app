import { useNavigate } from 'react-router-dom'
import type { AssetManager } from '../../types'

interface AssetManagerTableProps {
  assetManagers: AssetManager[]
}

export function AssetManagerTable({ assetManagers }: AssetManagerTableProps) {
  const navigate = useNavigate()

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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
