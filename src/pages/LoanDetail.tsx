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
import { useGetBorrower, useGetBorrowers } from '@/hooks/api/useBorrowers'
import { useDeleteAllPaymentSchedulesAndPayments, useGetLoan, useGetPaymentSchedulesByLoan, useUpdateLoan } from '@/hooks/api/useLoans'
import { useDeletePayment, useGetPaymentsByLoan } from '@/hooks/api/usePayments'
import { deletePaymentSchedule } from '@/lib/database'
import {
  calculateAccruedInterest,
  getDaysSinceLastPayment,
  getNextPaymentDate,
} from '@/lib/finance'
import { getLoanTypeLabel, getLoanTypesByCategory } from '@/lib/loans'
import { formatDate, getCurrentDateISO, isOverdue } from '@/lib/utils'
import { type LoanFormData, loanSchema } from '@/lib/validation'
import type { Loan } from '@/types/api/loans'
import type { Payment } from '@/types/api/payments'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit,
  IndianRupee,
  RefreshCw,
  Trash2,
  TrendingUp,
  User,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export default function LoanDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [expandedSchedules, setExpandedSchedules] = useState<Set<string>>(new Set())
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null)
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false)

  // Use the new TanStack Query hooks with enabled conditions for optimal loading
  const {
    data: loan,
    isLoading: loanLoading,
    error: loanError,
    refetch: refetchLoan,
  } = useGetLoan(id || '', !!id)
  const {
    data: borrower,
    isLoading: borrowerLoading,
    refetch: refetchBorrower,
  } = useGetBorrower(loan?.borrower_id || '', !!loan?.borrower_id)
  const { data: borrowers = [], refetch: refetchBorrowers } = useGetBorrowers()
  const {
    data: payments = [],
    isLoading: paymentsLoading,
    refetch: refetchPayments,
  } = useGetPaymentsByLoan(id || '', !!id)
  const {
    data: paymentSchedules = [],
    isLoading: schedulesLoading,
    refetch: refetchSchedules,
  } = useGetPaymentSchedulesByLoan(id || '', !!id)
  const updateLoanMutation = useUpdateLoan()
  const deletePaymentMutation = useDeletePayment()
  const deleteAllPaymentSchedulesMutation = useDeleteAllPaymentSchedulesAndPayments()

  // Custom mutation for deleting payment schedules
  const deleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      // First, delete all associated payments
      const schedulePayments = getSchedulePayments(scheduleId)
      for (const payment of schedulePayments) {
        await deletePaymentMutation.mutateAsync({ id: payment.id, payment })
      }

      // Then delete the schedule
      await deletePaymentSchedule(scheduleId)
    },
    onSuccess: () => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      refetchPayments()
      refetchSchedules()
      refetchLoan()
    },
    onError: (error) => {
      console.error('Failed to delete payment schedule:', error)
    }
  })

  const loading = loanLoading || borrowerLoading || paymentsLoading || schedulesLoading
  const error = loanError

  // Calculate loan statistics (memoized for performance)
  const loanStats = useMemo(() => {
    if (!loan || !payments) return null

    const totalPrincipalPaid = payments.reduce((sum, payment) => sum + payment.principal_amount, 0)
    const totalInterestPaid = payments.reduce((sum, payment) => sum + payment.interest_amount, 0)
    const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0)
    const remainingPrincipal = loan.principal_amount - totalPrincipalPaid
    const accruedInterest = calculateAccruedInterest(loan)
    const lastPayment = payments[0] // Payments are ordered by date DESC
    const nextDueDate = getNextPaymentDate(loan, lastPayment?.payment_date)
    const daysSinceLastPayment = getDaysSinceLastPayment(loan, lastPayment?.payment_date)
    const isOverdueStatus = isOverdue(nextDueDate)

    return {
      totalPrincipalPaid,
      totalInterestPaid,
      totalPayments,
      remainingPrincipal,
      accruedInterest,
      lastPayment,
      nextDueDate,
      daysSinceLastPayment,
      isOverdue: isOverdueStatus,
    }
  }, [payments, loan])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount)
  }

  const toggleScheduleExpansion = (scheduleId: string) => {
    setExpandedSchedules(prev => {
      const newSet = new Set(prev)
      if (newSet.has(scheduleId)) {
        newSet.delete(scheduleId)
      } else {
        newSet.add(scheduleId)
      }
      return newSet
    })
  }

  const getSchedulePayments = (scheduleId: string) => {
    return payments.filter(payment => payment.payment_schedule_id === scheduleId)
  }

  const handleDeleteSchedule = (scheduleId: string) => {
    setDeleteScheduleId(scheduleId)
  }

  const confirmDeleteSchedule = async () => {
    if (!deleteScheduleId) return

    try {
      await deleteScheduleMutation.mutateAsync(deleteScheduleId)
      setDeleteScheduleId(null)
    } catch (error) {
      console.error('Failed to delete payment schedule:', error)
    }
  }

  const handleDeleteAllSchedulesAndPayments = async () => {
    if (!id) return

    try {
      await deleteAllPaymentSchedulesMutation.mutateAsync(id)
      setShowDeleteAllDialog(false)
    } catch (error) {
      console.error('Failed to delete all payment schedules and payments:', error)
    }
  }

  const getScheduleStatusBadge = (schedule: any) => {
    const variants = {
      pending: 'secondary',
      partially_paid: 'outline',
      paid: 'default',
      overdue: 'destructive',
    } as const

    return (
      <Badge variant={variants[schedule.status as keyof typeof variants] || 'secondary'}>
        {schedule.status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
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

  // Edit form
  const editForm = useForm({
    defaultValues: {
      borrower_id: loan?.borrower_id || '',
      loan_type: loan?.loan_type || ('installment' as const),
      principal_amount: loan?.principal_amount || 0,
      interest_rate: loan?.interest_rate || 0,
      start_date: loan?.start_date || getCurrentDateISO(),
      hasEndDate: !!loan?.end_date,
      end_date: loan?.end_date || '',
      repayment_interval_unit: loan?.repayment_interval_unit || ('months' as const),
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

  if (!loanStats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Calculating loan statistics...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/loans')} className="w-fit">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Loans
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Loan Details</h1>
            <p className="text-muted-foreground mt-2">Comprehensive loan information and payment history</p>
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
            <p className="text-xs text-muted-foreground mt-1">
              {loan.interest_rate}% per {loan.repayment_interval_unit?.slice(0, -1) || 'period'}
            </p>
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
            <div className="text-2xl font-bold">{formatCurrency(loanStats.remainingPrincipal)}</div>
            <p className="text-xs text-muted-foreground">
              {((loanStats.remainingPrincipal / loan.principal_amount) * 100).toFixed(1)}% remaining
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
            <div className="text-2xl font-bold">{formatCurrency(loanStats.totalPayments)}</div>
            <p className="text-xs text-muted-foreground">{payments.length} payments made</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Principal Paid</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(loanStats.totalPrincipalPaid)}</div>
            <p className="text-xs text-muted-foreground">
              {((loanStats.totalPrincipalPaid / loan.principal_amount) * 100).toFixed(1)}% of
              principal
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
              {formatCurrency(loanStats.totalInterestPaid)}
            </div>
            <p className="text-xs text-muted-foreground">Interest collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accrued Interest</CardTitle>
            <Clock
              className={`h-4 w-4 ${loanStats.isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}
            />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${loanStats.isOverdue ? 'text-red-600' : ''}`}>
              {formatCurrency(loanStats.accruedInterest)}
            </div>
            <p
              className={`text-xs ${loanStats.isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}
            >
              {loanStats.isOverdue ? 'Overdue' : 'Current period'}
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
              <div
                className={`flex items-center gap-2 mt-1 ${loanStats.isOverdue ? 'text-red-600' : ''}`}
              >
                {loanStats.isOverdue && <AlertTriangle className="h-4 w-4" />}
                <span className="font-medium">{formatDate(loanStats.nextDueDate, 'medium')}</span>
                {loanStats.isOverdue && <Badge variant="destructive">Overdue</Badge>}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Days Since Last Payment</Label>
              <div className="font-medium mt-1">{loanStats.daysSinceLastPayment} days</div>
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

      {/* Payment Schedules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Payment Schedules ({paymentSchedules.length})
            </CardTitle>
            {paymentSchedules.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteAllDialog(true)}
                disabled={deleteAllPaymentSchedulesMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleteAllPaymentSchedulesMutation.isPending ? 'Deleting...' : 'Delete All Schedules & Payments'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {paymentSchedules.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No payment schedules generated yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Principal Due</TableHead>
                  <TableHead>Interest Due</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentSchedules.map((schedule) => {
                  const schedulePayments = getSchedulePayments(schedule.id)
                  const isExpanded = expandedSchedules.has(schedule.id)
                  const totalPaid = schedule.total_principal_paid + schedule.total_interest_paid

                  return (
                    <>
                      <TableRow key={schedule.id} className="cursor-pointer hover:bg-gray-50">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleScheduleExpansion(schedule.id)}
                            className="p-1 h-6 w-6"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">
                          {new Date(schedule.period_start_date).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric'
                          })} - {new Date(schedule.period_end_date).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </TableCell>
                        <TableCell>
                          {new Date(schedule.due_date).toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(schedule.total_principal_due)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(schedule.total_interest_due)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(totalPaid)}
                        </TableCell>
                        <TableCell>
                          {getScheduleStatusBadge(schedule)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="h-8 w-8 p-0"
                            disabled={deleteScheduleMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && schedulePayments.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="p-0">
                            <div className="px-4 py-2 bg-gray-50 border-l-4 border-blue-200">
                              <h4 className="text-sm font-medium mb-2 text-gray-700">
                                Payments for this schedule ({schedulePayments.length})
                              </h4>
                              <div className="space-y-1">
                                {schedulePayments.map((payment) => (
                                  <div key={payment.id} className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-600">
                                        {new Date(payment.payment_date).toLocaleDateString('en-IN')}
                                      </span>
                                      {getPaymentTypeBadge(payment.payment_type)}
                                    </div>
                                    <div className="flex gap-4">
                                      <span>Total: {formatCurrency(payment.amount)}</span>
                                      {payment.principal_amount > 0 && (
                                        <span className="text-blue-600">
                                          Principal: {formatCurrency(payment.principal_amount)}
                                        </span>
                                      )}
                                      {payment.interest_amount > 0 && (
                                        <span className="text-green-600">
                                          Interest: {formatCurrency(payment.interest_amount)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      {isExpanded && schedulePayments.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="p-0">
                            <div className="px-4 py-2 bg-gray-50 border-l-4 border-gray-200">
                              <p className="text-sm text-gray-500 italic">
                                No payments made for this schedule yet
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payment History ({payments.length})</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchLoan()
                refetchBorrower()
                refetchBorrowers()
                refetchPayments()
                refetchSchedules()
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
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
                      {formatDate(payment.payment_date, 'short')}
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

      {/* Delete Schedule Confirmation Dialog */}
      <AlertDialog open={!!deleteScheduleId} onOpenChange={() => setDeleteScheduleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment schedule? This action will also delete all payments associated with this schedule and cannot be undone.
              {deleteScheduleId &&
                (() => {
                  const schedule = paymentSchedules.find((s) => s.id === deleteScheduleId)
                  const schedulePayments = getSchedulePayments(deleteScheduleId)
                  if (schedule) {
                    return (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <p>
                          <strong>Period:</strong> {new Date(schedule.period_start_date).toLocaleDateString('en-IN')} - {new Date(schedule.period_end_date).toLocaleDateString('en-IN')}
                        </p>
                        <p>
                          <strong>Due Date:</strong> {new Date(schedule.due_date).toLocaleDateString('en-IN')}
                        </p>
                        <p>
                          <strong>Total Due:</strong> {formatCurrency(schedule.total_principal_due + schedule.total_interest_due)}
                        </p>
                        <p>
                          <strong>Associated Payments:</strong> {schedulePayments.length} payment(s) will be deleted
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
              onClick={confirmDeleteSchedule}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteScheduleMutation.isPending}
            >
              {deleteScheduleMutation.isPending ? 'Deleting...' : 'Delete Schedule'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Schedules and Payments Confirmation Dialog */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Payment Schedules and Payments</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete ALL payment schedules and payments for this loan? This action cannot be undone.

              <div className="mt-3 p-3 bg-red-50 rounded-md border border-red-200">
                <p className="text-sm text-red-800">
                  <strong>This will delete:</strong>
                </p>
                <ul className="text-sm text-red-700 mt-1 list-disc list-inside">
                  <li>{paymentSchedules.length} payment schedule(s)</li>
                  <li>{payments.length} payment(s)</li>
                </ul>
                <p className="text-sm text-red-800 mt-2">
                  New payment schedules with proper interest calculations will be recreated automatically when you refresh the page.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllSchedulesAndPayments}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteAllPaymentSchedulesMutation.isPending}
            >
              {deleteAllPaymentSchedulesMutation.isPending ? 'Deleting...' : 'Delete All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
