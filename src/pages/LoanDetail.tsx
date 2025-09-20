import { useForm } from '@tanstack/react-form'
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Clock,
  Edit,
  IndianRupee,
  TrendingUp,
  User,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
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
import { useGetBorrower } from '@/hooks/api/useBorrowers'
import { useGetLoan, useUpdateLoan } from '@/hooks/api/useLoans'
import { useGetPaymentsByLoan } from '@/hooks/api/usePayments'
import {
  calculateAccruedInterest,
  getDaysSinceLastPayment,
  getNextPaymentDate,
} from '@/lib/finance'
import { getLoanTypeLabel, getLoanTypesByCategory, isFixedIncomeType, isTraditionalLoanType } from '@/lib/loans'
import { type LoanFormData, loanSchema } from '@/lib/validation'
import type { Loan } from '@/types/api/loans'
import type { Payment } from '@/types/api/payments'

export default function LoanDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Use the new TanStack Query hooks
  const { data: loan, isLoading: loanLoading, error: loanError } = useGetLoan(id || '')
  const { data: borrower, isLoading: borrowerLoading } = useGetBorrower(loan?.borrower_id || '')
  const { data: borrowers = [] } = useGetBorrowers()
  const { data: payments = [], isLoading: paymentsLoading } = useGetPaymentsByLoan(id || '')
  const updateLoanMutation = useUpdateLoan()

  const loading = loanLoading || borrowerLoading || paymentsLoading
  const error = loanError

  // Edit form
  const editForm = useForm({
    defaultValues: {
      borrower_id: loan?.borrower_id || '',
      loan_type: loan?.loan_type || 'installment' as const,
      principal_amount: loan?.principal_amount || 0,
      interest_rate: loan?.interest_rate || 0,
      start_date: loan?.start_date || new Date().toISOString().split('T')[0],
      hasEndDate: !!loan?.end_date,
      end_date: loan?.end_date || '',
      repayment_interval_unit: loan?.repayment_interval_unit || 'months' as const,
      repayment_interval_value: loan?.repayment_interval_value || 1,
    } as LoanFormData,
    validators: {
      onBlur: loanSchema,
    },
    onSubmit: async ({ value }) => {
      if (!loan) return

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

        await updateLoanMutation.mutateAsync({ id: loan.id, updates: loanData })
        setIsEditDialogOpen(false)
      } catch (error) {
        console.error('Failed to update loan:', error)
      }
    },
  })

  // Update form values when loan data changes or dialog opens
  useEffect(() => {
    if (loan && isEditDialogOpen) {
      editForm.reset({
        borrower_id: loan.borrower_id,
        loan_type: loan.loan_type,
        principal_amount: loan.principal_amount,
        interest_rate: loan.interest_rate,
        start_date: loan.start_date,
        hasEndDate: !!loan.end_date,
        end_date: loan.end_date || '',
        repayment_interval_unit: loan.repayment_interval_unit,
        repayment_interval_value: loan.repayment_interval_value,
      })
    }
  }, [loan, isEditDialogOpen, editForm])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getPaymentTypeBadge = (type: Payment['payment_type']) => {
    const variants = {
      principal: 'default',
      interest: 'secondary',
      mixed: 'outline',
    } as const

    const labels = {
      principal: 'Principal',
      interest: 'Interest',
      mixed: 'Mixed',
    }

    return <Badge variant={variants[type]}>{labels[type]}</Badge>
  }

  const getLoanTypeBadge = (type: string) => {
    const variants = {
      installment: 'default',
      bullet: 'secondary',
      land_lease: 'outline',
      rent_agreement: 'outline',
      fixed_deposit_income: 'outline',
    } as const

    return (
      <Badge variant={variants[type as keyof typeof variants] || 'default'}>
        {getLoanTypeLabel(type as Loan['loan_type'])}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading loan details...</div>
      </div>
    )
  }

  if (error || !loan) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-red-600">Failed to load loan details</div>
      </div>
    )
  }

  if (!borrower) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-red-600">Borrower not found</div>
      </div>
    )
  }

  // Calculate loan statistics
  const totalPrincipalPaid = payments.reduce((sum, payment) => sum + payment.principal_amount, 0)
  const totalInterestPaid = payments.reduce((sum, payment) => sum + payment.interest_amount, 0)
  const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0)
  const remainingPrincipal = loan.principal_amount - totalPrincipalPaid
  const accruedInterest = calculateAccruedInterest(loan)
  const lastPayment = payments[0] // Payments are ordered by date DESC
  const nextDueDate = getNextPaymentDate(loan, lastPayment?.payment_date)
  const daysSinceLastPayment = getDaysSinceLastPayment(loan, lastPayment?.payment_date)
  const isOverdue = nextDueDate < new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/loans')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Loans
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Loan Details</h1>
            <p className="text-gray-600 mt-2">Comprehensive loan information and payment history</p>
          </div>
        </div>
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Loan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Loan</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                editForm.handleSubmit()
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <editForm.Field name="borrower_id">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="edit-loan-borrower">Borrower *</Label>
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
                      <p className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</p>
                    )}
                  </div>
                )}
              </editForm.Field>

              <editForm.Field name="loan_type">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="edit-loan-type">Loan Type *</Label>
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
                              <div className="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Traditional Loan
                              </div>
                              {traditional_loan.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {getLoanTypeLabel(type)}
                                </SelectItem>
                              ))}
                              <div className="px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide mt-2">
                                Fixed Income
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
              </editForm.Field>

              <editForm.Field name="principal_amount">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="edit-loan-principal">Principal Amount *</Label>
                    <Input
                      id="edit-loan-principal"
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
                      <p className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</p>
                    )}
                  </div>
                )}
              </editForm.Field>

              <editForm.Field name="interest_rate">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="edit-loan-rate">Interest Rate (%)</Label>
                    <Input
                      id="edit-loan-rate"
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
                      <p className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</p>
                    )}
                  </div>
                )}
              </editForm.Field>

              <editForm.Field name="repayment_interval_unit">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="edit-repayment-unit">Repayment Unit *</Label>
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
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="weeks">Weeks</SelectItem>
                        <SelectItem value="months">Months</SelectItem>
                        <SelectItem value="years">Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </editForm.Field>

              <editForm.Subscribe selector={(state) => state.values.repayment_interval_unit}>
                {(unit) => {
                  const unitName = unit || 'interval'
                  const capitalizedUnit = unitName.charAt(0).toUpperCase() + unitName.slice(1)
                  const labelText = `Number of ${capitalizedUnit}`

                  return (
                    <editForm.Field name="repayment_interval_value">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor="edit-repayment-value">{labelText} *</Label>
                          <Input
                            id="edit-repayment-value"
                            type="number"
                            min="1"
                            value={field.state.value || ''}
                            onChange={(e) => field.handleChange(parseInt(e.target.value, 10) || 1)}
                            onBlur={field.handleBlur}
                          />
                        </div>
                      )}
                    </editForm.Field>
                  )
                }}
              </editForm.Subscribe>

              <editForm.Field name="start_date">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="edit-loan-startDate">Start Date *</Label>
                    <Input
                      id="edit-loan-startDate"
                      type="date"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</p>
                    )}
                  </div>
                )}
              </editForm.Field>

              <editForm.Field name="hasEndDate">
                {(field) => (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        id="edit-loan-hasEndDate"
                        type="checkbox"
                        checked={field.state.value}
                        onChange={(e) => field.handleChange(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="edit-loan-hasEndDate">Has End Date</Label>
                    </div>
                  </div>
                )}
              </editForm.Field>

              <editForm.Subscribe selector={(state) => state.values.hasEndDate}>
                {(hasEndDate) => {
                  if (hasEndDate) {
                    return (
                      <editForm.Field name="end_date">
                        {(field) => (
                          <div className="space-y-2">
                            <Label htmlFor="edit-loan-endDate">End Date *</Label>
                            <Input
                              id="edit-loan-endDate"
                              type="date"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              onBlur={field.handleBlur}
                            />
                            {field.state.meta.errors.length > 0 && (
                              <p className="text-sm text-red-600">
                                {field.state.meta.errors[0]?.message}
                              </p>
                            )}
                          </div>
                        )}
                      </editForm.Field>
                    )
                  }
                  return null
                }}
              </editForm.Subscribe>

              <div className="flex justify-end space-x-2 pt-4 md:col-span-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    editForm.reset()
                    setIsEditDialogOpen(false)
                  }}
                >
                  Cancel
                </Button>
                <editForm.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                  {([canSubmit, isSubmitting]) => (
                    <Button type="submit" disabled={!canSubmit || isSubmitting}>
                      {isSubmitting ? 'Updating...' : 'Update Loan'}
                    </Button>
                  )}
                </editForm.Subscribe>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loan Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Borrower</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{borrower.name}</div>
            <p className="text-xs text-muted-foreground">{borrower.phone}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loan Type</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">{getLoanTypeBadge(loan.loan_type)}</div>
            <p className="text-xs text-muted-foreground mt-1">{loan.interest_rate}% annual rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Principal Amount</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(loan.principal_amount)}</div>
            <p className="text-xs text-muted-foreground">Original amount</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Principal</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(remainingPrincipal)}</div>
            <p className="text-xs text-muted-foreground">
              {((remainingPrincipal / loan.principal_amount) * 100).toFixed(1)}% remaining
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPayments)}</div>
            <p className="text-xs text-muted-foreground">{payments.length} payments made</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Principal Paid</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPrincipalPaid)}</div>
            <p className="text-xs text-muted-foreground">
              {((totalPrincipalPaid / loan.principal_amount) * 100).toFixed(1)}% of principal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interest Earned</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalInterestPaid)}
            </div>
            <p className="text-xs text-muted-foreground">Interest collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accrued Interest</CardTitle>
            <Clock className={`h-4 w-4 ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isOverdue ? 'text-red-600' : ''}`}>
              {formatCurrency(accruedInterest)}
            </div>
            <p className={`text-xs ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
              {isOverdue ? 'Overdue' : 'Current period'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Next Payment Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Payment Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium">Next Due Date</Label>
              <div className={`flex items-center gap-2 mt-1 ${isOverdue ? 'text-red-600' : ''}`}>
                {isOverdue && <AlertTriangle className="h-4 w-4" />}
                <span className="font-medium">{formatDate(nextDueDate)}</span>
                {isOverdue && <Badge variant="destructive">Overdue</Badge>}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Days Since Last Payment</Label>
              <div className="font-medium mt-1">{daysSinceLastPayment} days</div>
            </div>
            <div>
              <Label className="text-sm font-medium">Repayment Interval</Label>
              <div className="font-medium mt-1">
                Every {loan.repayment_interval_value} {loan.repayment_interval_unit}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History ({payments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No payments recorded yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {formatDate(payment.payment_date)}
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>
                      {payment.principal_amount > 0
                        ? formatCurrency(payment.principal_amount)
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {payment.interest_amount > 0 ? formatCurrency(payment.interest_amount) : '-'}
                    </TableCell>
                    <TableCell>{getPaymentTypeBadge(payment.payment_type)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
