import { useEffect } from 'react'
import { useDealsStore } from '../store'
import { PipelineSummary } from '../components/dashboard/PipelineSummary'
import { AllocationOverview } from '../components/dashboard/AllocationOverview'
import { RecentNews } from '../components/dashboard/RecentNews'
import { PipelineFunnel } from '../components/dashboard/PipelineFunnel'

export function DealsDashboardPage() {
  const { dashboardSummary, loadingDashboard, fetchDashboardSummary } = useDealsStore()

  useEffect(() => {
    fetchDashboardSummary()
  }, [fetchDashboardSummary])

  if (loadingDashboard || !dashboardSummary) {
    return <div className="text-muted-foreground">Loading dashboard...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Deals Dashboard</h1>

      <PipelineSummary
        pipelineCounts={dashboardSummary.pipelineCounts}
        totalOpportunities={dashboardSummary.totalOpportunities}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AllocationOverview mandateAllocations={dashboardSummary.mandateAllocations} />
        <PipelineFunnel pipelineCounts={dashboardSummary.pipelineCounts} />
      </div>

      <RecentNews newsItems={dashboardSummary.recentNews} />
    </div>
  )
}
