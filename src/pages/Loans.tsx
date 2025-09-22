import { useForm } from '@tanstack/react-form'
import {
  AlertCircle,
  ArrowUpDown,
  Calendar,
  Eye,
  IndianRupee,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  useCreateLoan,
  useDeleteLoan,
  useGetLoansWithCalculatedBalances,
  useUpdateLoanStatus,
} from '@/hooks/api/useLoans'
import {
  getLoanTypeLabel,
  getLoanTypesByCategory,
  isFixedIncomeType,
  isTraditionalLoanType,
  LOAN_CATEGORY_LABELS,
} from '@/lib/loans'
import { getCurrentDateISO } from '@/lib/utils'
import { type LoanFormData, loanSchema } from '@/lib/validation'
import type { Loan } from '@/types/api/loans'

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount)
}

type SortField = 'borrower' | 'amount' | 'remaining' | 'startDate' | 'interestRate'
type SortOrder = 'asc' | 'desc'

export default function Loans() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loanTypeFilter, setLoanTypeFilter] = useState<string>('all')
  const [intervalFilter, setIntervalFilter] = useState<string>('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [deleteLoanId, setDeleteLoanId] = useState<string | null>(null)

  // Sort states
  const [sortField, setSortField] = useState<SortField>('startDate')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Use the new TanStack Query hooks
  const {
    data: loans = [],
    isLoading: loading,
    refetch: refetchLoans,
  } = useGetLoansWithCalculatedBalances()
  const { data: borrowers = [], refetch: refetchBorrowers } = useGetBorrowers()
  const createLoanMutation = useCreateLoan()
  const deleteLoanMutation = useDeleteLoan()
  const updateLoanStatusMutation = useUpdateLoanStatus()

  const loanForm = useForm({
    defaultValues: {
      borrower_id: '',
      loan_type: 'installment' as const,
      principal_amount: 0,
      interest_rate: 0,
      start_date: getCurrentDateISO(),
      hasEndDate: false,
      end_date: '',
      repayment_interval_unit: 'months' as const,
      repayment_interval_value: 1,
      notes: '',
    } as LoanFormData,
    validators: {
      onBlur: loanSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const loanData = {
          borrower_id: value.borrower_id,
          loan_type: value.loan_type,
          principal_amount: value.principal_amount,
          interest_rate: value.interest_rate,
          start_date: value.start_date,
          end_date: value.end_date || undefined,
          repayment_interval_unit: value.repayment_interval_unit,
          repayment_interval_value: value.repayment_interval_value,
        }

        await createLoanMutation.mutateAsync(loanData)
        setIsAddDialogOpen(false)
        loanForm.reset()
      } catch (error) {
        console.error('Failed to create loan:', error)
      }
    },
  })

  const handleStatusChange = async (loanId: string, newStatus: Loan['status']) => {
    try {
      await updateLoanStatusMutation.mutateAsync({ id: loanId, status: newStatus })
    } catch (error) {
      console.error('Failed to update loan status:', error)
    }
  }

  const handleDelete = (id: string) => {
    setDeleteLoanId(id)
  }

  const confirmDelete = async () => {
    if (!deleteLoanId) return

    try {
      await deleteLoanMutation.mutateAsync(deleteLoanId)
      setDeleteLoanId(null)
    } catch (error) {
      console.error('Failed to delete loan:', error)
    }
  }

  // Get unique values for filter dropdowns
  const uniqueLoanTypes = Array.from(new Set(loans.map((loan) => loan.loan_type))).sort()
  const uniqueIntervals = Array.from(
    new Set(loans.map((loan) => loan.repayment_interval_unit || 'months'))
  ).sort()

  // Helper functions for filters
  const hasActiveFilters =
    searchTerm || statusFilter !== 'all' || loanTypeFilter !== 'all' || intervalFilter !== 'all'

  const clearAllFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setLoanTypeFilter('all')
    setIntervalFilter('all')
  }

  // Apply all filters
  const filteredLoans = loans.filter((loan) => {
    const matchesSearch =
      loan.borrower_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getLoanTypeLabel(loan.loan_type).toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter
    const matchesLoanType = loanTypeFilter === 'all' || loan.loan_type === loanTypeFilter
    const matchesInterval =
      intervalFilter === 'all' || (loan.repayment_interval_unit || 'months') === intervalFilter

    return matchesSearch && matchesStatus && matchesLoanType && matchesInterval
  })

  // Sort loans
  filteredLoans.sort((a, b) => {
    let aValue: string | number
    let bValue: string | number

    switch (sortField) {
      case 'borrower':
        aValue = a.borrower_name.toLowerCase()
        bValue = b.borrower_name.toLowerCase()
        break
      case 'amount':
        aValue = a.principal_amount
        bValue = b.principal_amount
        break
      case 'remaining':
        aValue = a.real_remaining_principal
        bValue = b.real_remaining_principal
        break
      case 'startDate':
        aValue = new Date(a.start_date).getTime()
        bValue = new Date(b.start_date).getTime()
        break
      case 'interestRate':
        aValue = a.interest_rate
        bValue = b.interest_rate
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading loans...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Loans</h1>
          <p className="text-muted-foreground mt-2">Manage your loans</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Loan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Loan</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                loanForm.handleSubmit()
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <loanForm.Field name="borrower_id">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="loan-borrower">Borrower *</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a borrower" />
                      </SelectTrigger>
                      <SelectContent>
                        {borrowers.map((borrower) => (
                          <SelectItem key={borrower.id} value={borrower.id}>
                            {borrower.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors[0]?.message}
                      </p>
                    )}
                  </div>
                )}
              </loanForm.Field>

              <loanForm.Field name="loan_type">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="loan-type">Loan Type *</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) =>
                        field.handleChange(value as LoanFormData['loan_type'])
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a loan type" />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const { traditional_loan, fixed_income } = getLoanTypesByCategory()
                          return (
                            <>
                              <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                {LOAN_CATEGORY_LABELS.traditional_loan}
                              </div>
                              {traditional_loan.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {getLoanTypeLabel(type)}
                                </SelectItem>
                              ))}
                              <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide mt-2">
                                {LOAN_CATEGORY_LABELS.fixed_income}
                              </div>
                              {fixed_income.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {getLoanTypeLabel(type)}
                                </SelectItem>
                              ))}
                            </>
                          )
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </loanForm.Field>

              <loanForm.Field name="principal_amount">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="loan-principal">Principal Amount *</Label>
                    <Input
                      id="loan-principal"
                      type="number"
                      step="0.01"
                      min="0"
                      value={field.state.value || ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0
                        field.handleChange(value)
                      }}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors[0]?.message}
                      </p>
                    )}
                  </div>
                )}
              </loanForm.Field>

              <loanForm.Field name="interest_rate">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="loan-rate">Interest Rate (%)</Label>
                    <Input
                      id="loan-rate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={field.state.value || ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0
                        field.handleChange(value)
                      }}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors[0]?.message}
                      </p>
                    )}
                  </div>
                )}
              </loanForm.Field>

              <loanForm.Field name="repayment_interval_unit">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="repayment-unit">Repayment Unit *</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) =>
                        field.handleChange(value as LoanFormData['repayment_interval_unit'])
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="months">Months</SelectItem>
                        <SelectItem value="years">Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </loanForm.Field>

              <loanForm.Subscribe selector={(state) => state.values.repayment_interval_unit}>
                {(unit) => {
                  const unitName = unit || 'interval'
                  const capitalizedUnit = unitName.charAt(0).toUpperCase() + unitName.slice(1)
                  const labelText = `Number of ${capitalizedUnit}`

                  return (
                    <loanForm.Field name="repayment_interval_value">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor="repayment-value">{labelText} *</Label>
                          <Input
                            id="repayment-value"
                            type="number"
                            min="1"
                            value={field.state.value || ''}
                            onChange={(e) => field.handleChange(parseInt(e.target.value, 10) || 1)}
                            onBlur={field.handleBlur}
                          />
                        </div>
                      )}
                    </loanForm.Field>
                  )
                }}
              </loanForm.Subscribe>

              <loanForm.Field name="start_date">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="loan-startDate">Start Date *</Label>
                    <Input
                      id="loan-startDate"
                      type="date"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors[0]?.message}
                      </p>
                    )}
                  </div>
                )}
              </loanForm.Field>

              <loanForm.Field name="hasEndDate">
                {(field) => (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        id="loan-hasEndDate"
                        type="checkbox"
                        checked={field.state.value}
                        onChange={(e) => field.handleChange(e.target.checked)}
                        className="rounded border-input"
                      />
                      <Label htmlFor="loan-hasEndDate">Has End Date</Label>
                    </div>
                  </div>
                )}
              </loanForm.Field>

              <loanForm.Subscribe selector={(state) => state.values.hasEndDate}>
                {(hasEndDate) => {
                  if (hasEndDate) {
                    return (
                      <loanForm.Field name="end_date">
                        {(field) => (
                          <div className="space-y-2">
                            <Label htmlFor="loan-endDate">End Date *</Label>
                            <Input
                              id="loan-endDate"
                              type="date"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              onBlur={field.handleBlur}
                            />
                            {field.state.meta.errors.length > 0 && (
                              <p className="text-sm text-destructive">
                                {field.state.meta.errors[0]?.message}
                              </p>
                            )}
                          </div>
                        )}
                      </loanForm.Field>
                    )
                  }
                  return null
                }}
              </loanForm.Subscribe>

              <loanForm.Field name="notes">
                {(field) => (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="loan-notes">Notes</Label>
                    <Input
                      id="loan-notes"
                      value={field.state.value || ''}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Optional notes about this loan..."
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors[0]?.message}
                      </p>
                    )}
                  </div>
                )}
              </loanForm.Field>

              <loanForm.Subscribe selector={(state) => state.values}>
                {(values) => {
                  if (values.principal_amount > 0 && values.interest_rate > 0) {
                    // Calculate interest per interval period using rate per interval
                    let intervalLabel = 'month'
                    if (values.repayment_interval_unit && values.repayment_interval_value) {
                      switch (values.repayment_interval_unit) {
                        case 'days':
                          intervalLabel = `${values.repayment_interval_value} day${values.repayment_interval_value > 1 ? 's' : ''}`
                          break
                        case 'weeks':
                          intervalLabel = `${values.repayment_interval_value} week${values.repayment_interval_value > 1 ? 's' : ''}`
                          break
                        case 'months':
                          intervalLabel = `${values.repayment_interval_value} month${values.repayment_interval_value > 1 ? 's' : ''}`
                          break
                        case 'years':
                          intervalLabel = `${values.repayment_interval_value} year${values.repayment_interval_value > 1 ? 's' : ''}`
                          break
                      }
                    }

                    const intervalInterest = values.principal_amount * (values.interest_rate / 100)

                    // Calculate term preview
                    let term_preview = 0
                    if (values.hasEndDate && values.end_date && values.start_date) {
                      const start = new Date(values.start_date)
                      const end = new Date(values.end_date)
                      const diffMs = end.getTime() - start.getTime()
                      term_preview = Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30))
                    }

                    return (
                      <div className="p-3 bg-muted/50 rounded-lg space-y-1 md:col-span-2">
                        <p className="text-sm font-medium text-foreground">
                          Expected Interest per {intervalLabel}: {formatCurrency(intervalInterest)}
                        </p>
                        {isTraditionalLoanType(values.loan_type) && term_preview > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Total Loan Period: {term_preview} months
                          </p>
                        )}
                        {isFixedIncomeType(values.loan_type) && (
                          <p className="text-xs text-muted-foreground">
                            Fixed Income: Interest-only payments, no principal reduction by default
                          </p>
                        )}
                      </div>
                    )
                  }
                  return null
                }}
              </loanForm.Subscribe>

              <div className="flex justify-end space-x-2 pt-4 md:col-span-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    loanForm.reset()
                    setIsAddDialogOpen(false)
                  }}
                >
                  Cancel
                </Button>
                <loanForm.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                  {([canSubmit, isSubmitting]) => (
                    <Button type="submit" disabled={!canSubmit || isSubmitting}>
                      {isSubmitting ? 'Creating...' : 'Create Loan'}
                    </Button>
                  )}
                </loanForm.Subscribe>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-card p-3 rounded-lg border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by borrower name, loan ID, or loan type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paid_off">Paid Off</SelectItem>
            <SelectItem value="defaulted">Defaulted</SelectItem>
          </SelectContent>
        </Select>
        <Select value={loanTypeFilter} onValueChange={setLoanTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {uniqueLoanTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {getLoanTypeLabel(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={intervalFilter} onValueChange={setIntervalFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All Intervals" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Intervals</SelectItem>
            {uniqueIntervals.map((interval) => (
              <SelectItem key={interval} value={interval}>
                {`${interval.charAt(0).toUpperCase()}${interval.slice(1)}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearAllFilters} className="shrink-0">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="h-20">
          <CardContent className="p-3 h-full flex items-center">
            <div className="flex items-center">
              <IndianRupee className="h-6 w-6 text-primary" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Total Active</p>
                <p className="text-base font-bold">
                  {formatCurrency(
                    filteredLoans
                      .filter((loan) => loan.status === 'active')
                      .reduce((sum, loan) => sum + loan.real_remaining_principal, 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-20">
          <CardContent className="p-3 h-full flex items-center">
            <div className="flex items-center">
              <Calendar className="h-6 w-6 text-secondary" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Active Loans</p>
                <p className="text-base font-bold">
                  {filteredLoans.filter((loan) => loan.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-20">
          <CardContent className="p-3 h-full flex items-center">
            <div className="flex items-center">
              <Percent className="h-6 w-6 text-accent-foreground" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Avg. Interest</p>
                <p className="text-base font-bold">
                  {filteredLoans.length > 0
                    ? `${(
                        filteredLoans.reduce((sum, loan) => sum + loan.interest_rate, 0) /
                          filteredLoans.length
                      ).toFixed(1)}%`
                    : '0%'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-20">
          <CardContent className="p-3 h-full flex items-center">
            <div className="flex items-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Defaulted</p>
                <p className="text-base font-bold">
                  {filteredLoans.filter((loan) => loan.status === 'defaulted').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loans Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Loans ({filteredLoans.length})</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchLoans()
                refetchBorrowers()
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLoans.length === 0 ? (
            <div className="text-center py-8">
              <IndianRupee className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No loans found</p>
              <p className="text-sm text-muted-foreground/70">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter'
                  : 'Create your first loan to get started'}
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
                      Borrower
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
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('remaining')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Remaining
                      <ArrowUpDown className="ml-1 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('interestRate')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Rate
                      <ArrowUpDown className="ml-1 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Type</TableHead>
                  <TableHead className="hidden lg:table-cell">Interval</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('startDate')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Start Date
                      <ArrowUpDown className="ml-1 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLoans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{loan.borrower_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(loan.principal_amount)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(loan.real_remaining_principal)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{loan.interest_rate}%</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="text-sm">{getLoanTypeLabel(loan.loan_type)}</div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="text-sm text-muted-foreground">
                        {loan.repayment_interval_value || 1}{' '}
                        {loan.repayment_interval_unit || 'months'}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(loan.start_date).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell>
                      <Select
                        value={loan.status}
                        onValueChange={(value: Loan['status']) =>
                          handleStatusChange(loan.id, value)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="paid_off">Paid Off</SelectItem>
                          <SelectItem value="defaulted">Defaulted</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/loans/${loan.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(loan.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteLoanId} onOpenChange={() => setDeleteLoanId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Loan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this loan? This action cannot be undone.
              {deleteLoanId &&
                (() => {
                  const loan = loans.find((l) => l.id === deleteLoanId)
                  if (loan) {
                    return (
                      <div className="mt-3 p-3 bg-muted/50 rounded-md">
                        <p>
                          <strong>Borrower:</strong> {loan.borrower_name}
                        </p>
                        <p>
                          <strong>Amount:</strong> {formatCurrency(loan.principal_amount)}
                        </p>
                        <p>
                          <strong>Type:</strong> {getLoanTypeLabel(loan.loan_type)}
                        </p>
                        <p>
                          <strong>Status:</strong> {loan.status}
                        </p>
                      </div>
                    )
                  }
                  return null
                })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Loan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
