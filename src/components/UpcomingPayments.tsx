import { Calendar, RefreshCw, User } from 'lucide-react'
import { useState } from 'react'
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
import {
  calculateAccruedIncome,
  calculateAccruedInterest,
  getDaysSinceLastIncomePayment,
  getDaysSinceLastPayment,
  getNextIncomePaymentDate,
  getNextPaymentDate,
  type UpcomingPayment,
} from '@/lib/finance'

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  // Calculate upcoming payments
  const calculateUpcomingPayments = (): UpcomingPayment[] => {
    const upcomingPayments: UpcomingPayment[] = []
    const today = new Date()

    // Process loans
    loans.forEach((loan) => {
      if (loan.status !== 'active') return

      const borrower = borrowers.find((b) => b.id === loan.borrower_id)
      if (!borrower) return

      // Get last payment for this loan
      const lastPayment = payments
        .filter((p) => p.loan_id === loan.id)
        .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0]

      // Calculate next payment date
      const nextDueDate = getNextPaymentDate(loan, lastPayment?.payment_date)
      const dueDateObj = new Date(nextDueDate)

      // Only include future payments
      if (dueDateObj >= today) {
        const daysSinceLastPayment = getDaysSinceLastPayment(loan, lastPayment?.payment_date)
        const accruedInterest = calculateAccruedInterest(loan)

        upcomingPayments.push({
          id: loan.id,
          type: 'loan',
          borrowerName: borrower.name,
          assetType: loan.loan_type,
          dueDate: nextDueDate,
          accruedInterest,
          daysSinceLastPayment,
          currentBalance: loan.current_balance,
          realRemainingPrincipal: loan.current_balance,
        })
      }
    })

    // Process fixed incomes
    fixedIncomes.forEach((fixedIncome) => {
      if (fixedIncome.status !== 'active') return

      // Get last income payment for this fixed income
      const lastIncomePayment = payments
        .filter((p) => p.loan_id === fixedIncome.id) // Assuming payments are linked to fixed income via loan_id
        .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0]

      // Calculate next payment date
      const nextDueDate = getNextIncomePaymentDate(fixedIncome, lastIncomePayment?.payment_date)
      const dueDateObj = new Date(nextDueDate)

      // Only include future payments
      if (dueDateObj >= today) {
        const daysSinceLastPayment = getDaysSinceLastIncomePayment(
          fixedIncome,
          lastIncomePayment?.payment_date
        )
        const accruedIncome = calculateAccruedIncome(fixedIncome)

        upcomingPayments.push({
          id: fixedIncome.id,
          type: 'fixed_income',
          borrowerName: fixedIncome.tenant_name,
          assetType: fixedIncome.income_type,
          dueDate: nextDueDate,
          accruedInterest: accruedIncome,
          daysSinceLastPayment,
          currentBalance: 0, // Fixed income doesn't have a balance
          assetValue: fixedIncome.principal_amount,
        })
      }
    })

    return upcomingPayments.sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    )
  }

  const upcomingPayments = calculateUpcomingPayments()

  // Filter upcoming payments by selected period (only if period selector is shown)
  const filteredPayments = showPeriodSelector
    ? upcomingPayments.filter((payment) => {
        const today = new Date()
        const futureDate = new Date(today)
        futureDate.setMonth(today.getMonth() + selectedPeriod)

        const dueDate = new Date(payment.dueDate)
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

  const handleRefresh = () => {
    refetchPayments()
    refetchLoans()
    refetchBorrowers()
    refetchFixedIncomes()
    onRefresh?.()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center gap-2">
            {showRefreshButton && (
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
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
                  <TableCell className="font-medium">{formatDate(payment.dueDate)}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(payment.accruedInterest)}
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
