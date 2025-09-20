import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertTriangle,
  Banknote,
  Clock,
  IndianRupee,
  TrendingUp,
  Users,
  Building2,
} from 'lucide-react'
import { useMemo, useCallback } from 'react'
import {
  useGetDashboardSummary,
  useGetDashboardStats,
  useGetRecentActivity,
} from '@/hooks/api/useDashboard'
import type { DashboardSummary, DashboardStats } from '@/services/api/dashboard.service'

interface UpcomingPayment {
  id: string
  type: 'loan' | 'fixed_income'
  borrowerName: string
  assetType: string
  dueDate: string
  daysSinceLastPayment: number
  accruedInterest: number
  realRemainingPrincipal?: number
  assetValue?: number
  currentBalance?: number
}

export default function Dashboard() {
  // Use the new TanStack Query hooks
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useGetDashboardSummary()
  const { data: stats, isLoading: statsLoading, error: statsError } = useGetDashboardStats()
  const {
    data: recentActivity,
    isLoading: activityLoading,
    error: activityError,
  } = useGetRecentActivity()

  const loading = summaryLoading || statsLoading || activityLoading
  const error = summaryError || statsError || activityError

  const formatCurrency = useMemo(() => {
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    })
    return (amount: number) => formatter.format(amount)
  }, [])

  const renderPaymentsTable = useCallback(
    (payments: UpcomingPayment[], emptyMessage: string) => {
      if (!payments || payments.length === 0) {
        return <p className="text-muted-foreground">{emptyMessage}</p>
      }

      return (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">Party</TableHead>
                <TableHead className="min-w-[100px]">Type</TableHead>
                <TableHead className="min-w-[120px]">Due Date</TableHead>
                <TableHead className="min-w-[100px] hidden sm:table-cell">
                  Days Since Last Payment
                </TableHead>
                <TableHead className="min-w-[120px]">Principal/Value</TableHead>
                <TableHead className="min-w-[120px]">Accrued Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.slice(0, 5).map((payment) => {
                const today = new Date().toISOString().split('T')[0]
                const isOverdue = payment.dueDate < today
                const dueDateObj = new Date(payment.dueDate)
                const isDueSoon =
                  !isOverdue && dueDateObj.getTime() - Date.now() <= 7 * 24 * 60 * 60 * 1000

                return (
                  <TableRow
                    key={`${payment.type}-${payment.id}`}
                    className={isOverdue ? 'bg-red-50' : isDueSoon ? 'bg-yellow-50' : ''}
                  >
                    <TableCell className="font-medium">{payment.borrowerName}</TableCell>
                    <TableCell>{payment.assetType}</TableCell>
                    <TableCell>
                      <div
                        className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-yellow-600' : ''}`}
                      >
                        {isOverdue && <AlertTriangle className="h-4 w-4" />}
                        {dueDateObj.toLocaleDateString()}
                        {isOverdue && <span className="text-xs">(Overdue)</span>}
                        {isDueSoon && <span className="text-xs">(Due Soon)</span>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {payment.daysSinceLastPayment || 0} days
                    </TableCell>
                    <TableCell>
                      {payment.type === 'loan' && payment.realRemainingPrincipal !== undefined
                        ? formatCurrency(payment.realRemainingPrincipal)
                        : formatCurrency(payment.assetValue || payment.currentBalance)}
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      {formatCurrency(payment.accruedInterest)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )
    },
    [formatCurrency]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-red-600">Failed to load dashboard: {error.message}</div>
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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Overview of your lending operations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
        <Card className="min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total Borrowers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{summary.totalBorrowers}</div>
          </CardContent>
        </Card>

        <Card className="min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Active Loans</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{summary.activeLoans}</div>
          </CardContent>
        </Card>

        <Card className="min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total Outstanding</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div
              className="text-sm sm:text-base lg:text-lg font-bold break-words"
              title={formatCurrency(summary.totalOutstandingBalance)}
            >
              {formatCurrency(summary.totalOutstandingBalance)}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Accrued Interest</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div
              className="text-sm sm:text-base lg:text-lg font-bold break-words"
              title={formatCurrency(summary.totalPaidAmount)}
            >
              {formatCurrency(summary.totalPaidAmount)}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium leading-tight">Fixed Income Assets</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{summary.totalFixedIncomes}</div>
            <p className="text-xs text-muted-foreground break-words" title={formatCurrency(0)}>
              {formatCurrency(0)} value
            </p>
          </CardContent>
        </Card>

        <Card className="min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Overdue Items</CardTitle>
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
            <CardTitle className="text-xs font-medium leading-tight">
              This Month's Payments
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div
              className="text-sm sm:text-base lg:text-lg font-bold break-words"
              title={formatCurrency(summary.totalPaidAmount)}
            >
              {formatCurrency(summary.totalPaidAmount)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Payments Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loan Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Upcoming Loan Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderPaymentsTable(
              summary.upcomingPayments || [],
              'No active loans with upcoming payments.'
            )}
            {(summary.upcomingPayments?.length || 0) > 5 && (
              <p className="text-sm text-muted-foreground mt-4">
                Showing 5 of {summary.upcomingPayments?.length || 0} items. View loans page for
                complete list.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Fixed Income Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Upcoming Fixed Income Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderPaymentsTable([], 'No active fixed income assets with upcoming payments.')}
            {0 > 5 && (
              <p className="text-sm text-muted-foreground mt-4">
                Showing 5 of {0} items. View fixed income page for complete list.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
