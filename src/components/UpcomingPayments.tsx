import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useGetBorrowers } from '@/hooks/api/useBorrowers'
import { useGetFixedIncomesWithTenants } from '@/hooks/api/useFixedIncome'
import { useGetLoans } from '@/hooks/api/useLoans'
import { getPaymentSchedulesByLoan } from '@/lib/database'
import type {
  UpcomingPayment,
} from '@/lib/finance'
import { formatDate, parseDate } from '@/lib/utils'
import { paymentService } from '@/services/api/payments.service'
import { ArrowUpDown, Calendar, RefreshCw, Search, User, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface UpcomingPaymentsProps {
  title?: string
  showPeriodSelector?: boolean
  maxItems?: number
  showRefreshButton?: boolean
  onRefresh?: () => void
  showFilters?: boolean
}

type SortField = 'date' | 'amount' | 'borrower'
type SortOrder = 'asc' | 'desc'

export default function UpcomingPayments({
  title = 'Upcoming Payments',
  showPeriodSelector = true,
  maxItems,
  showRefreshButton = true,
  onRefresh,
  showFilters = true,
}: UpcomingPaymentsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1) // months
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Filter states
  const [borrowerFilter, setBorrowerFilter] = useState<string>('all')
  const [intervalFilter, setIntervalFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Sort states
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  // Use the new TanStack Query hooks
  // const { data: payments = [], refetch: refetchPayments } = useGetPaymentsWithDetails()
  const { data: loans = [], refetch: refetchLoans } = useGetLoans()
  const { data: borrowers = [], refetch: refetchBorrowers } = useGetBorrowers()
  const { data: fixedIncomes = [], refetch: refetchFixedIncomes } = useGetFixedIncomesWithTenants()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount)
  }

  // Calculate upcoming payments using payment schedules
  const calculateUpcomingPayments = useCallback(async (): Promise<UpcomingPayment[]> => {
    const upcomingPayments: UpcomingPayment[] = []
    const today = new Date()

    // Process loans
    for (const loan of loans) {
      if (loan.status !== 'active') continue
      if (loan.loan_type === 'bullet') continue

      const borrower = borrowers.find((b) => b.id === loan.borrower_id)
      if (!borrower) continue

      try {
        // Ensure payment schedules exist for this loan
        await paymentService.ensurePaymentSchedulesExist(loan.id)

        // Get payment schedules for this loan
        const schedules = await getPaymentSchedulesByLoan(loan.id)

        // Find first unpaid schedule
        const nextSchedule = schedules.find(s => s.status !== 'paid')

        if (nextSchedule && (nextSchedule.total_interest_due > 0 || nextSchedule.total_principal_due > 0)) {
          // Use payment schedule only if it has non-zero amounts
          const dueDate = new Date(nextSchedule.due_date)
          const remainingInterest = nextSchedule.total_interest_due - nextSchedule.total_interest_paid
          const remainingPrincipal = nextSchedule.total_principal_due - nextSchedule.total_principal_paid

          upcomingPayments.push({
            id: loan.id,
            type: 'loan',
            borrowerName: borrower.name,
            assetType: loan.loan_type,
            dueDate: formatDate(dueDate, 'iso'),
            accruedInterest: remainingInterest,
            expectedPaymentAmount: remainingInterest + remainingPrincipal,
            daysSinceLastPayment: Math.floor((today.getTime() - new Date(loan.start_date).getTime()) / (1000 * 60 * 60 * 24)),
            currentBalance: loan.current_balance,
            paymentStatus: nextSchedule.status === 'overdue' ? 'overdue' :
                          nextSchedule.status === 'partially_paid' ? 'partial' : 'pending',
          })
        } else {
          // Fall back to simple calculation based on loan interval
          const startDate = new Date(loan.start_date)
          const intervalUnit = loan.repayment_interval_unit || 'months'
          const intervalValue = loan.repayment_interval_value || 1

          // Calculate next due date based on loan start date and interval
          const today = new Date()
          let nextDueDate = new Date(startDate)

          // Find the next payment due date after today
          while (nextDueDate <= today) {
            switch (intervalUnit) {
              case 'days':
                nextDueDate.setDate(nextDueDate.getDate() + intervalValue)
                break
              case 'weeks':
                nextDueDate.setDate(nextDueDate.getDate() + intervalValue * 7)
                break
              case 'months':
                nextDueDate.setMonth(nextDueDate.getMonth() + intervalValue)
                break
              case 'years':
                nextDueDate.setFullYear(nextDueDate.getFullYear() + intervalValue)
                break
            }
          }

          // Calculate period interest
          // Use the full interest rate for each interval payment
          const periodInterest = (loan.current_balance * loan.interest_rate) / 100

          // For installment loans, payment includes both principal and interest
          // This is a simplified calculation - actual installment calculation would be more complex
          const expectedPayment = periodInterest + (loan.current_balance * 0.1) // Simple 10% principal

          upcomingPayments.push({
            id: loan.id,
            type: 'loan',
            borrowerName: borrower.name,
            assetType: loan.loan_type,
            dueDate: formatDate(nextDueDate, 'iso'),
            accruedInterest: periodInterest,
            expectedPaymentAmount: expectedPayment,
            daysSinceLastPayment: Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
            currentBalance: loan.current_balance,
            paymentStatus: nextDueDate < today ? 'overdue' : 'pending',
          })
        }
      } catch (error) {
        console.error('Error fetching payment schedules for loan:', loan.id, error)
        // Fall back to simple calculation on error
        const startDate = new Date(loan.start_date)
        const intervalUnit = loan.repayment_interval_unit || 'months'
        const intervalValue = loan.repayment_interval_value || 1

        // Calculate next due date based on loan start date and interval
        const today = new Date()
        let nextDueDate = new Date(startDate)

        // Find the next payment due date after today
        while (nextDueDate <= today) {
          switch (intervalUnit) {
            case 'days':
              nextDueDate.setDate(nextDueDate.getDate() + intervalValue)
              break
            case 'weeks':
              nextDueDate.setDate(nextDueDate.getDate() + intervalValue * 7)
              break
            case 'months':
              nextDueDate.setMonth(nextDueDate.getMonth() + intervalValue)
              break
            case 'years':
              nextDueDate.setFullYear(nextDueDate.getFullYear() + intervalValue)
              break
          }
        }

        // Calculate period interest
        // Use the full interest rate for each interval payment
        const periodInterest = (loan.current_balance * loan.interest_rate) / 100

        // For installment loans, payment includes both principal and interest
        // This is a simplified calculation - actual installment calculation would be more complex
        const expectedPayment = periodInterest + (loan.current_balance * 0.1) // Simple 10% principal

        upcomingPayments.push({
          id: loan.id,
          type: 'loan',
          borrowerName: borrower.name,
          assetType: loan.loan_type,
          dueDate: formatDate(nextDueDate, 'iso'),
          accruedInterest: periodInterest,
          expectedPaymentAmount: expectedPayment,
          daysSinceLastPayment: Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
          currentBalance: loan.current_balance,
          paymentStatus: nextDueDate < today ? 'overdue' : 'pending',
        })
      }
    }

    // Process fixed incomes
    fixedIncomes.forEach((fixedIncome) => {
      if (fixedIncome.status !== 'active') return

      // Calculate next payment date based on interval
      const startDate = new Date(fixedIncome.start_date)
      const intervalUnit = fixedIncome.payment_interval_unit || 'months'
      const intervalValue = fixedIncome.payment_interval_value || 1

      // Calculate next due date based on fixed income start date and interval
      let nextDueDate = new Date(startDate)

      // Calculate how many intervals have passed since start
      let intervalsPassed = 0

      switch (intervalUnit) {
        case 'days':
          intervalsPassed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
          intervalsPassed = Math.floor(intervalsPassed / intervalValue)
          nextDueDate.setDate(startDate.getDate() + (intervalsPassed + 1) * intervalValue)
          break
        case 'weeks':
          intervalsPassed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7))
          intervalsPassed = Math.floor(intervalsPassed / intervalValue)
          nextDueDate.setDate(startDate.getDate() + (intervalsPassed + 1) * intervalValue * 7)
          break
        case 'months':
          intervalsPassed = (today.getFullYear() - startDate.getFullYear()) * 12 + (today.getMonth() - startDate.getMonth())
          intervalsPassed = Math.floor(intervalsPassed / intervalValue)
          nextDueDate.setMonth(startDate.getMonth() + (intervalsPassed + 1) * intervalValue)
          break
        case 'years':
          intervalsPassed = today.getFullYear() - startDate.getFullYear()
          intervalsPassed = Math.floor(intervalsPassed / intervalValue)
          nextDueDate.setFullYear(startDate.getFullYear() + (intervalsPassed + 1) * intervalValue)
          break
      }

      // Use the simplified amount as the expected payment
      const periodIncome = fixedIncome.amount

      upcomingPayments.push({
        id: fixedIncome.id,
        type: 'fixed_income',
        borrowerName: fixedIncome.tenant_name,
        assetType: fixedIncome.label || 'Fixed Income',
        dueDate: formatDate(nextDueDate, 'iso'),
        accruedInterest: periodIncome,
        expectedPaymentAmount: periodIncome,
        daysSinceLastPayment: Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
        currentBalance: 0,
        assetValue: fixedIncome.amount,
        paymentStatus: nextDueDate < today ? 'overdue' : 'pending',
      })
    })
    return upcomingPayments.sort(
      (a, b) => parseDate(a.dueDate).getTime() - parseDate(b.dueDate).getTime()
    )
  }, [loans, borrowers, fixedIncomes])

  // Calculate upcoming payments when data changes
  useEffect(() => {
    if (loans.length === 0 || borrowers.length === 0) return

    const loadUpcomingPayments = async () => {
      setIsLoading(true)
      try {
        const payments = await calculateUpcomingPayments()
        setUpcomingPayments(payments)
      } catch (error) {
        console.error('Error calculating upcoming payments:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUpcomingPayments()
  }, [loans, borrowers, calculateUpcomingPayments])

  // Get unique borrowers and interval types for filter dropdowns
  const uniqueBorrowers = Array.from(new Set(upcomingPayments.map(p => p.borrowerName))).sort()
  const uniqueIntervals = Array.from(new Set([
    ...loans.map(loan => loan.repayment_interval_unit || 'months'),
    ...fixedIncomes.map(fixedIncome => fixedIncome.payment_interval_unit || 'months')
  ])).sort()

  // Helper functions for filters
  const hasActiveFilters = searchTerm || borrowerFilter !== 'all' || intervalFilter !== 'all' || statusFilter !== 'all'

  const clearAllFilters = () => {
    setSearchTerm('')
    setBorrowerFilter('all')
    setIntervalFilter('all')
    setStatusFilter('all')
  }

  // Apply all filters and sorting
  let filteredPayments = upcomingPayments

  // Period filter (only if period selector is shown)
  if (showPeriodSelector) {
    filteredPayments = filteredPayments.filter((payment) => {
      const today = new Date()
      const futureDate = new Date(today)
      futureDate.setMonth(today.getMonth() + selectedPeriod)

      const dueDate = parseDate(payment.dueDate)
      return dueDate >= today && dueDate <= futureDate
    })
  }

  // Borrower filter
  if (borrowerFilter !== 'all') {
    filteredPayments = filteredPayments.filter(payment => payment.borrowerName === borrowerFilter)
  }

  // Interval type filter
  if (intervalFilter !== 'all') {
    filteredPayments = filteredPayments.filter(payment => {
      if (payment.type === 'loan') {
        const loan = loans.find(l => l.id === payment.id)
        return loan && (loan.repayment_interval_unit || 'months') === intervalFilter
      } else {
        const fixedIncome = fixedIncomes.find(fi => fi.id === payment.id)
        return fixedIncome && fixedIncome.payment_interval_unit === intervalFilter
      }
    })
  }

  // Status filter
  if (statusFilter !== 'all') {
    filteredPayments = filteredPayments.filter(payment => payment.paymentStatus === statusFilter)
  }

  // Search filter
  if (searchTerm) {
    filteredPayments = filteredPayments.filter(payment =>
      payment.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.assetType.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  // Sort payments
  filteredPayments.sort((a, b) => {
    let aValue: string | number
    let bValue: string | number

    switch (sortField) {
      case 'date':
        aValue = parseDate(a.dueDate).getTime()
        bValue = parseDate(b.dueDate).getTime()
        break
      case 'amount':
        aValue = a.expectedPaymentAmount
        bValue = b.expectedPaymentAmount
        break
      case 'borrower':
        aValue = a.borrowerName.toLowerCase()
        bValue = b.borrowerName.toLowerCase()
        break
      default:
        return 0
    }

    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  // Apply maxItems limit if specified
  const displayPayments = maxItems ? filteredPayments.slice(0, maxItems) : filteredPayments

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const getPeriodLabel = (months: number) => {
    if (months === 1) return 'This Month'
    if (months === 3) return 'Next 3 Months'
    if (months === 6) return 'Next 6 Months'
    if (months === 12) return 'Next Year'
    return `Next ${months} Months`
  }

  const getStatusBadge = (status: UpcomingPayment['paymentStatus']) => {
    const variants = {
      pending: 'secondary',
      partial: 'outline',
      paid: 'default',
      overdue: 'destructive',
    } as const

    const labels = {
      pending: 'Pending',
      partial: 'Partial',
      paid: 'Paid',
      overdue: 'Overdue',
    }

    return <Badge variant={variants[status || 'pending']}>{labels[status || 'pending']}</Badge>
  }

  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        // refetchPayments(),
        refetchLoans(),
        refetchBorrowers(),
        refetchFixedIncomes()
      ])
      // The useEffect will automatically recalculate when data changes
      onRefresh?.()
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center gap-2">
            {showRefreshButton && (
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Loading...' : 'Refresh'}
              </Button>
            )}
            {showPeriodSelector && (
              <Select
                value={selectedPeriod.toString()}
                onValueChange={(value) => setSelectedPeriod(parseInt(value, 10))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">This Month</SelectItem>
                  <SelectItem value="3">Next 3 Months</SelectItem>
                  <SelectItem value="6">Next 6 Months</SelectItem>
                  <SelectItem value="12">Next Year</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>

      {showFilters && (
        <div className="px-6 pb-4">
          <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-lg border">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by borrower or asset type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={borrowerFilter} onValueChange={setBorrowerFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All Borrowers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Borrowers</SelectItem>
                {uniqueBorrowers.map(borrower => (
                  <SelectItem key={borrower} value={borrower}>{borrower}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={intervalFilter} onValueChange={setIntervalFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All Intervals" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Intervals</SelectItem>
                {uniqueIntervals.map(interval => (
                  <SelectItem key={interval} value={interval}>
                    {`${interval.charAt(0).toUpperCase()}${interval.slice(1)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
      <CardContent>
        {displayPayments.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No upcoming payments found</p>
            <p className="text-sm text-gray-400">
              {showPeriodSelector
                ? `All payments are up to date for ${getPeriodLabel(selectedPeriod).toLowerCase()}`
                : 'No upcoming payments at this time'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('borrower')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Party
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="hidden sm:table-cell">Type</TableHead>
                <TableHead className="hidden md:table-cell">Asset Type</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('date')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Due Date
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('amount')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Amount
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="hidden lg:table-cell">Days Since</TableHead>
                <TableHead className="hidden lg:table-cell">Balance/Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayPayments.map((payment) => (
                <TableRow key={`${payment.type}-${payment.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{payment.borrowerName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={payment.type === 'loan' ? 'default' : 'secondary'}>
                      {payment.type === 'loan' ? 'Loan' : 'Fixed Income'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell capitalize">
                    {payment.assetType.replace('_', ' ')}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatDate(payment.dueDate, 'medium')}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(payment.expectedPaymentAmount)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {getStatusBadge(payment.paymentStatus)}
                    {payment.paymentStatus === 'partial' &&
                      payment.paidInterestAmount &&
                      payment.remainingInterestAmount && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatCurrency(payment.paidInterestAmount)} paid,{' '}
                          {formatCurrency(payment.remainingInterestAmount)} remaining
                        </div>
                      )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                    {payment.daysSinceLastPayment} days
                  </TableCell>
                  <TableCell className="hidden lg:table-cell font-medium">
                    {payment.type === 'loan'
                      ? formatCurrency(payment.currentBalance)
                      : formatCurrency(payment.assetValue || 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {maxItems && filteredPayments.length > maxItems && (
          <p className="text-sm text-muted-foreground mt-4">
            Showing {maxItems} of {filteredPayments.length} items.
            {showPeriodSelector ? ` View payments page for complete list.` : ''}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
