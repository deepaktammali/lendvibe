import {
  AlertTriangle,
  Banknote,
  Building2,
  Clock,
  IndianRupee,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useCallback, useMemo } from 'react'
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
  useGetDashboardStats,
  useGetDashboardSummary,
  useGetRecentActivity,
} from '@/hooks/api/useDashboard'
import type { LoanWithBorrowerAndDueDate, FixedIncomeWithTenantAndDueDate } from '@/types/api/dashboard'

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

  const renderLoanPaymentsTable = useCallback(
    (payments: LoanWithBorrowerAndDueDate[], emptyMessage: string) => {
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
                  Days Until Due
                </TableHead>
                <TableHead className="min-w-[120px]">Principal/Value</TableHead>
                <TableHead className="min-w-[120px]">Interest Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.slice(0, 5).map((payment) => {
                const today = new Date().toISOString().split('T')[0]
                const dueDate = payment.end_date || payment.start_date
                const isOverdue = dueDate < today
                const dueDateObj = new Date(dueDate)
                const isDueSoon =
                  !isOverdue && dueDateObj.getTime() - Date.now() <= 7 * 24 * 60 * 60 * 1000

                return (
                  <TableRow
                    key={`${payment.loan_type}-${payment.id}`}
                    className={isOverdue ? 'bg-red-50' : isDueSoon ? 'bg-yellow-50' : ''}
                  >
                    <TableCell className="font-medium">{payment.borrower_name}</TableCell>
                    <TableCell>{payment.loan_type}</TableCell>
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
                      {payment.days_until_due || 0} days
                    </TableCell>
                    <TableCell>
                      {formatCurrency(payment.current_balance)}
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      {payment.interest_rate}%
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

  const renderFixedIncomePaymentsTable = useCallback(
    (payments: FixedIncomeWithTenantAndDueDate[], emptyMessage: string) => {
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
                  Days Until Due
                </TableHead>
                <TableHead className="min-w-[120px]">Asset Value</TableHead>
                <TableHead className="min-w-[120px]">Income Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.slice(0, 5).map((payment) => {
                const today = new Date().toISOString().split('T')[0]
                const dueDate = payment.end_date || payment.start_date
                const isOverdue = dueDate < today
                const dueDateObj = new Date(dueDate)
                const isDueSoon =
                  !isOverdue && dueDateObj.getTime() - Date.now() <= 7 * 24 * 60 * 60 * 1000

                return (
                  <TableRow
                    key={`${payment.income_type}-${payment.id}`}
                    className={isOverdue ? 'bg-red-50' : isDueSoon ? 'bg-yellow-50' : ''}
                  >
                    <TableCell className="font-medium">{payment.tenant_name}</TableCell>
                    <TableCell>{payment.income_type}</TableCell>
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
                      {payment.days_until_due || 0} days
                    </TableCell>
                    <TableCell>
                      {formatCurrency(payment.principal_amount)}
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      {payment.income_rate}%
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="text-lg text-red-600">Failed to load dashboard</div>
          <div className="text-sm text-gray-600 max-w-md">
            {errorMessage}
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
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
            <div className="text-xl font-bold">{summary.totalBorrowers ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Active Loans</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{summary.activeLoans ?? 0}</div>
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
              {formatCurrency(summary.totalOutstandingBalance ?? 0)}
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
              {formatCurrency(summary.totalPaidAmount ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium leading-tight">Fixed Income Assets</CardTitle>
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
              {formatCurrency(summary.totalPaidAmount ?? 0)}
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
            {renderLoanPaymentsTable(
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
            {renderFixedIncomePaymentsTable(
              summary.upcomingFixedIncomePayments || [],
              'No active fixed income assets with upcoming payments.'
            )}
            {(summary.upcomingFixedIncomePayments?.length || 0) > 5 && (
              <p className="text-sm text-muted-foreground mt-4">
                Showing 5 of {summary.upcomingFixedIncomePayments?.length || 0} items. View fixed income page for
                complete list.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
