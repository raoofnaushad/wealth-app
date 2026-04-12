import { useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InvestmentTypeList } from '../components/settings/InvestmentTypeList'
import { TemplateList } from '../components/settings/TemplateList'
import { useDealsStore } from '../store'

export function SettingsPage() {
  const { fetchInvestmentTypes, fetchTemplates } = useDealsStore()

  useEffect(() => {
    fetchInvestmentTypes()
    fetchTemplates()
  }, [fetchInvestmentTypes, fetchTemplates])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Deals Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage investment type snapshots and document templates.
        </p>
      </div>

      <Tabs defaultValue="snapshots">
        <TabsList>
          <TabsTrigger value="snapshots">Snapshot Configuration</TabsTrigger>
          <TabsTrigger value="templates">Document Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="snapshots">
          <InvestmentTypeList />
        </TabsContent>

        <TabsContent value="templates">
          <TemplateList />
        </TabsContent>
      </Tabs>
    </div>
  )
}
