import { useEffect, useState } from 'react'
import { useDealsStore } from '../store'
import { useAuthStore } from '@/store/useAuthStore'
import { PipelineSummary } from '../components/dashboard/PipelineSummary'
import { AllocationOverview } from '../components/dashboard/AllocationOverview'
import { RecentNews } from '../components/dashboard/RecentNews'
import { PipelineFunnel } from '../components/dashboard/PipelineFunnel'
import { TeamActivity } from '../components/dashboard/TeamActivity'
import { DateRangePicker } from '@/components/ui/date-range-picker'

export function DealsDashboardPage() {
  const { dashboardSummary, loadingDashboard, fetchDashboardSummary } = useDealsStore()
  const [dateFilter, setDateFilter] = useState('This Month')
  const role = useAuthStore((s) => s.getModuleRole('deals'))
  const isManagerOrOwner = role === 'manager' || role === 'owner'

  useEffect(() => {
    fetchDashboardSummary()
  }, [fetchDashboardSummary, dateFilter])

  if (loadingDashboard || !dashboardSummary) {
    return <div className="text-muted-foreground">Loading dashboard...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Deals Dashboard</h1>
        <DateRangePicker
          currentFilter={dateFilter}
          onFilterChange={setDateFilter}
        />
      </div>

      <PipelineSummary
        pipelineCounts={dashboardSummary.pipelineCounts}
        totalOpportunities={dashboardSummary.totalOpportunities}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AllocationOverview mandateAllocations={dashboardSummary.mandateAllocations} />
        <PipelineFunnel pipelineCounts={dashboardSummary.pipelineCounts} />
      </div>

      {isManagerOrOwner && <TeamActivity />}

      <RecentNews newsItems={dashboardSummary.recentNews} />
    </div>
  )
}
