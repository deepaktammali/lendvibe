import { Calendar, RefreshCw, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useGetPaymentsWithDetails } from '@/hooks/api/usePayments'
import { getPaymentSchedulesByLoan } from '@/lib/database'
import { paymentService } from '@/services/api/payments.service'
import {
  calculateAccruedIncome,
  calculateAccruedInterest,
  calculateExpectedPaymentAmount,
  calculatePaymentStatus,
  getDaysSinceLastIncomePayment,
  getDaysSinceLastPayment,
  getNextIncomePaymentDate,
  getNextPaymentDate,
  type UpcomingPayment,
} from '@/lib/finance'
import { formatDate, parseDate } from '@/lib/utils'

interface UpcomingPaymentsProps {
  title?: string
  showPeriodSelector?: boolean
  maxItems?: number
  showRefreshButton?: boolean
  onRefresh?: () => void
}

export default function UpcomingPayments({
  title = 'Upcoming Payments',
  showPeriodSelector = true,
  maxItems,
  showRefreshButton = true,
  onRefresh,
}: UpcomingPaymentsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1) // months
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Use the new TanStack Query hooks
  const { data: payments = [], refetch: refetchPayments } = useGetPaymentsWithDetails()
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
  const calculateUpcomingPayments = async (): Promise<UpcomingPayment[]> => {
    const upcomingPayments: UpcomingPayment[] = []
    const today = new Date()

    // Process loans
    for (const loan of loans) {
      if (loan.status !== 'active') continue

      const borrower = borrowers.find((b) => b.id === loan.borrower_id)
      if (!borrower) continue

      try {
        // Ensure payment schedules exist for this loan
        await paymentService.ensurePaymentSchedulesExist(loan.id)

        // Get payment schedules for this loan
        const schedules = await getPaymentSchedulesByLoan(loan.id)

        // Find first unpaid schedule
        const nextSchedule = schedules.find(s => s.status !== 'paid')

        if (nextSchedule) {
          // Use payment schedule
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
          // Fall back to simple calculation
          const startDate = new Date(loan.start_date)
          const paymentsMade = payments.filter(p => p.loan_id === loan.id).length
          const nextDueDate = new Date(startDate)
          nextDueDate.setMonth(startDate.getMonth() + paymentsMade + 1)
          const monthlyInterest = (loan.current_balance * loan.interest_rate) / 100

          upcomingPayments.push({
            id: loan.id,
            type: 'loan',
            borrowerName: borrower.name,
            assetType: loan.loan_type,
            dueDate: formatDate(nextDueDate, 'iso'),
            accruedInterest: monthlyInterest,
            expectedPaymentAmount: monthlyInterest,
            daysSinceLastPayment: Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
            currentBalance: loan.current_balance,
            paymentStatus: nextDueDate < today ? 'overdue' : 'pending',
          })
        }
      } catch (error) {
        console.error('Error fetching payment schedules for loan:', loan.id, error)
        // Fall back to simple calculation on error
        const startDate = new Date(loan.start_date)
        const paymentsMade = payments.filter(p => p.loan_id === loan.id).length
        const nextDueDate = new Date(startDate)
        nextDueDate.setMonth(startDate.getMonth() + paymentsMade + 1)
        const monthlyInterest = (loan.current_balance * loan.interest_rate) / 100

        upcomingPayments.push({
          id: loan.id,
          type: 'loan',
          borrowerName: borrower.name,
          assetType: loan.loan_type,
          dueDate: formatDate(nextDueDate, 'iso'),
          accruedInterest: monthlyInterest,
          expectedPaymentAmount: monthlyInterest,
          daysSinceLastPayment: Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
          currentBalance: loan.current_balance,
          paymentStatus: nextDueDate < today ? 'overdue' : 'pending',
        })
      }
    }

    // Process fixed incomes - ultra simple
    fixedIncomes.forEach((fixedIncome) => {
      if (fixedIncome.status !== 'active') return

      // Find the next unpaid payment
      const startDate = new Date(fixedIncome.start_date)
      const paymentsMade = payments.filter(p => p.loan_id === fixedIncome.id).length

      // Next payment = start_date + (payments_made + 1) months
      const nextDueDate = new Date(startDate)
      nextDueDate.setMonth(startDate.getMonth() + paymentsMade + 1)

      // Income amount for the period
      const monthlyIncome = (fixedIncome.principal_amount * fixedIncome.income_rate) / 100

      upcomingPayments.push({
        id: fixedIncome.id,
        type: 'fixed_income',
        borrowerName: fixedIncome.tenant_name,
        assetType: fixedIncome.income_type,
        dueDate: formatDate(nextDueDate, 'iso'),
        accruedInterest: monthlyIncome,
        expectedPaymentAmount: monthlyIncome,
        daysSinceLastPayment: Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
        currentBalance: 0,
        assetValue: fixedIncome.principal_amount,
        paymentStatus: nextDueDate < today ? 'overdue' : 'pending',
      })
    })
    return upcomingPayments.sort(
      (a, b) => parseDate(a.dueDate).getTime() - parseDate(b.dueDate).getTime()
    )
  }

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
  }, [loans, borrowers, payments, fixedIncomes])

  // Filter upcoming payments by selected period (only if period selector is shown)
  const filteredPayments = showPeriodSelector
    ? upcomingPayments.filter((payment) => {
        const today = new Date()
        const futureDate = new Date(today)
        futureDate.setMonth(today.getMonth() + selectedPeriod)

        const dueDate = parseDate(payment.dueDate)
        return dueDate >= today && dueDate <= futureDate
      })
    : upcomingPayments

  // Apply maxItems limit if specified
  const displayPayments = maxItems ? filteredPayments.slice(0, maxItems) : filteredPayments

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
        refetchPayments(),
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
                <TableHead>Party</TableHead>
                <TableHead className="hidden sm:table-cell">Type</TableHead>
                <TableHead className="hidden md:table-cell">Asset Type</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount</TableHead>
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
