import { AlertTriangle, Banknote, Clock, IndianRupee, TrendingUp, Users } from 'lucide-react'
import { useMemo } from 'react'
import UpcomingPayments from '@/components/UpcomingPayments'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  useGetDashboardStats,
  useGetDashboardSummary,
  useGetRecentActivity,
} from '@/hooks/api/useDashboard'

export default function Dashboard() {
  // Use the new TanStack Query hooks
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useGetDashboardSummary()
  const { data: stats, isLoading: statsLoading, error: statsError } = useGetDashboardStats()
  const { isLoading: activityLoading, error: activityError } = useGetRecentActivity()

  const loading = summaryLoading || statsLoading || activityLoading
  const error = summaryError || statsError || activityError

  const formatCurrency = useMemo(() => {
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    })
    return (amount: number) => formatter.format(amount)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    )
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="text-lg text-red-600">Failed to load dashboard</div>
          <div className="text-sm text-gray-600 max-w-md">{errorMessage}</div>
          <Button
            variant="default"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!summary || !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">No dashboard data available</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Overview of your lending operations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
        <Card className="min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Borrowers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{summary.totalBorrowers ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{summary.activeLoans ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div
              className="text-sm sm:text-base lg:text-lg font-bold break-words"
              title={formatCurrency(summary.totalOutstandingBalance)}
            >
              {formatCurrency(summary.totalOutstandingBalance ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accrued Interest</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div
              className="text-sm sm:text-base lg:text-lg font-bold break-words"
              title={formatCurrency(summary.totalPaidAmount)}
            >
              {formatCurrency(summary.totalPaidAmount ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium leading-tight">Fixed Income Assets</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{summary.totalFixedIncomes ?? 0}</div>
            <p className="text-xs text-muted-foreground break-words" title={formatCurrency(0)}>
              {formatCurrency(0)} value
            </p>
          </CardContent>
        </Card>

        <Card className="min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Items</CardTitle>
            <AlertTriangle
              className={`h-4 w-4 flex-shrink-0 ${(stats?.loanStats?.defaulted || 0) > 0 ? 'text-red-500' : 'text-muted-foreground'}`}
            />
          </CardHeader>
          <CardContent>
            <div
              className={`text-xl font-bold ${(stats?.loanStats?.defaulted || 0) > 0 ? 'text-red-600' : ''}`}
            >
              {stats?.loanStats?.defaulted || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium leading-tight">
              This Month's Payments
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div
              className="text-sm sm:text-base lg:text-lg font-bold break-words"
              title={formatCurrency(summary.totalPaidAmount)}
            >
              {formatCurrency(summary.totalPaidAmount ?? 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Payments */}
      <UpcomingPayments
        title="Upcoming Payments"
        showPeriodSelector={false}
        maxItems={10}
        showRefreshButton={false}
        showFilters={true}
      />
    </div>
  )
}
