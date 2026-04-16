import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useDealsStore } from '../store'
import { useAuthStore } from '@/store/useAuthStore'
import { MandateCard } from '../components/mandates/MandateCard'
import { MandateForm } from '../components/mandates/MandateForm'
import type { MandateStatus } from '../types'

type TabValue = 'all' | MandateStatus

export function MandateListPage() {
  const navigate = useNavigate()
  const { mandates, loadingMandates, fetchMandates } = useDealsStore()
  const [tab, setTab] = useState<TabValue>('all')
  const [formOpen, setFormOpen] = useState(false)
  const role = useAuthStore((s) => s.getModuleRole('deals'))
  const canCreateMandate = role === 'owner' || role === 'manager'

  useEffect(() => {
    fetchMandates()
  }, [fetchMandates])

  const filtered = tab === 'all' ? mandates : mandates.filter((m) => m.status === tab)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Mandates</h1>
        {canCreateMandate && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-1.5 size-4" />
            Create Mandate
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList variant="line">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {loadingMandates ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-36 animate-pulse rounded-xl bg-muted"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
              <FileText className="size-10 text-muted-foreground/50" />
              <div>
                <p className="font-medium">No mandates found</p>
                <p className="text-sm text-muted-foreground">
                  {tab === 'all'
                    ? 'Create your first mandate to get started.'
                    : `No ${tab} mandates yet.`}
                </p>
              </div>
              {tab === 'all' && canCreateMandate && (
                <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
                  <Plus className="mr-1 size-3.5" />
                  Create Mandate
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((mandate) => (
                <MandateCard
                  key={mandate.id}
                  mandate={mandate}
                  onClick={() => navigate(`/home/deals/mandates/${mandate.id}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {canCreateMandate && <MandateForm open={formOpen} onOpenChange={setFormOpen} />}
    </div>
  )
}
