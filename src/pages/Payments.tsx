import { useForm } from '@tanstack/react-form'
import {
  Calendar,
  Edit,
  IndianRupee,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  User,
} from 'lucide-react'
import { useState } from 'react'
import FixedIncomePaymentDialog from '@/components/FixedIncomePaymentDialog'
import UpcomingPayments from '@/components/UpcomingPayments'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useGetBorrowers } from '@/hooks/api/useBorrowers'
import { useGetLoans } from '@/hooks/api/useLoans'
import {
  useCreatePayment,
  useDeletePayment,
  useGetPaymentsWithDetails,
  useUpdatePayment,
} from '@/hooks/api/usePayments'
import { type PaymentFormInput, paymentFormSchema } from '@/lib/validation'
import type { Payment } from '@/types/api/payments'

interface PaymentWithDetails extends Payment {
  borrower_name: string
  loan_principal: number
}

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<PaymentWithDetails | null>(null)
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null)

  // Use the new TanStack Query hooks
  const {
    data: payments = [],
    isLoading: loading,
    refetch: refetchPayments,
  } = useGetPaymentsWithDetails()
  const { data: loans = [], refetch: refetchLoans } = useGetLoans()
  const { data: borrowers = [], refetch: refetchBorrowers } = useGetBorrowers()
  const createPaymentMutation = useCreatePayment()
  const updatePaymentMutation = useUpdatePayment()
  const deletePaymentMutation = useDeletePayment()

  const editForm = useForm({
    defaultValues: {
      loan_id: '',
      principal_amount: 0,
      interest_amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
    } as PaymentFormInput,
    validators: {
      onBlur: paymentFormSchema,
    },
    onSubmit: async ({ value }) => {
      if (!editingPayment) return

      try {
        const totalAmount = value.principal_amount + value.interest_amount

        const updateData = {
          loan_id: value.loan_id,
          amount: totalAmount,
          payment_date: value.payment_date,
          principal_amount: value.principal_amount,
          interest_amount: value.interest_amount,
          payment_type: (value.principal_amount > 0 && value.interest_amount > 0
            ? 'mixed'
            : value.principal_amount > 0
              ? 'principal'
              : 'interest') as Payment['payment_type'],
          notes: value.notes,
        }

        await updatePaymentMutation.mutateAsync({
          id: editingPayment.id,
          data: updateData,
          originalPayment: editingPayment,
        })

        setIsEditDialogOpen(false)
        setEditingPayment(null)
        editForm.reset()
      } catch (error) {
        console.error('Failed to update payment:', error)
      }
    },
  })

  const paymentForm = useForm({
    defaultValues: {
      loan_id: '',
      principal_amount: 0,
      interest_amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
    } as PaymentFormInput,
    validators: {
      onBlur: paymentFormSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const paymentData = {
          loan_id: value.loan_id,
          principal_amount: value.principal_amount,
          interest_amount: value.interest_amount,
          payment_date: value.payment_date,
          notes: value.notes,
        }

        await createPaymentMutation.mutateAsync(paymentData)
        setIsAddDialogOpen(false)
        paymentForm.reset()
      } catch (error) {
        console.error('Failed to record payment:', error)
      }
    },
  })

  const handleEditPayment = (payment: PaymentWithDetails) => {
    setEditingPayment(payment)
    editForm.setFieldValue('loan_id', payment.loan_id)
    editForm.setFieldValue('principal_amount', payment.principal_amount)
    editForm.setFieldValue('interest_amount', payment.interest_amount)
    editForm.setFieldValue('payment_date', payment.payment_date)
    editForm.setFieldValue('notes', payment.notes || '')
    setIsEditDialogOpen(true)
  }

  const handleDeletePayment = async (paymentId: string) => {
    try {
      const payment = payments.find((p) => p.id === paymentId)
      if (!payment) return

      await deletePaymentMutation.mutateAsync({
        id: paymentId,
        payment: payment,
      })

      setDeletePaymentId(null)
    } catch (error) {
      console.error('Failed to delete payment:', error)
    }
  }

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.borrower_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.loan_id.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = typeFilter === 'all' || payment.payment_type === typeFilter

    return matchesSearch && matchesType
  })

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

  const totalPayments = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0)
  const totalPrincipal = filteredPayments.reduce(
    (sum, payment) => sum + payment.principal_amount,
    0
  )
  const totalInterest = filteredPayments.reduce((sum, payment) => sum + payment.interest_amount, 0)

  const currentMonth = new Date().toISOString().slice(0, 7)
  const monthlyPayments = filteredPayments
    .filter((payment) => payment.payment_date.startsWith(currentMonth))
    .reduce((sum, payment) => sum + payment.amount, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading payments...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600 mt-2">Track and record payments</p>
        </div>

        <div className="flex gap-2">
          <FixedIncomePaymentDialog onSuccess={() => {
            refetchPayments()
            refetchLoans()
            refetchBorrowers()
          }} />

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Record Loan Payment
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                paymentForm.handleSubmit()
              }}
              className="space-y-4"
            >
              <paymentForm.Field name="loan_id">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="payment-loan">Loan *</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a loan" />
                      </SelectTrigger>
                      <SelectContent>
                        {loans.map((loan) => {
                          const borrower = borrowers.find((b) => b.id === loan.borrower_id)
                          return (
                            <SelectItem key={loan.id} value={loan.id}>
                              {borrower?.name} - {formatCurrency(loan.current_balance)} remaining
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</p>
                    )}
                  </div>
                )}
              </paymentForm.Field>

              <paymentForm.Field name="principal_amount">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="payment-principal">Principal Amount</Label>
                    <Input
                      id="payment-principal"
                      type="number"
                      step="0.01"
                      min="0"
                      value={field.state.value || ''}
                      onChange={(e) => {
                        const amount = parseFloat(e.target.value) || 0
                        field.handleChange(amount)
                      }}
                      onBlur={field.handleBlur}
                      placeholder="0.00"
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</p>
                    )}
                  </div>
                )}
              </paymentForm.Field>

              <paymentForm.Field name="interest_amount">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="payment-interest">Interest Amount</Label>
                    <Input
                      id="payment-interest"
                      type="number"
                      step="0.01"
                      min="0"
                      value={field.state.value || ''}
                      onChange={(e) => {
                        const amount = parseFloat(e.target.value) || 0
                        field.handleChange(amount)
                      }}
                      onBlur={field.handleBlur}
                      placeholder="0.00"
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</p>
                    )}
                  </div>
                )}
              </paymentForm.Field>

              <paymentForm.Field name="payment_date">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="payment-date">Payment Date *</Label>
                    <Input
                      id="payment-date"
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
              </paymentForm.Field>

              <paymentForm.Field name="notes">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="payment-notes">Notes</Label>
                    <Input
                      id="payment-notes"
                      value={field.state.value || ''}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Optional notes about this payment..."
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</p>
                    )}
                  </div>
                )}
              </paymentForm.Field>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    paymentForm.reset()
                    setIsAddDialogOpen(false)
                  }}
                >
                  Cancel
                </Button>
                <paymentForm.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                  {([canSubmit, isSubmitting]) => (
                    <Button type="submit" disabled={!canSubmit || isSubmitting}>
                      {isSubmitting ? 'Recording...' : 'Record Payment'}
                    </Button>
                  )}
                </paymentForm.Subscribe>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>

        {/* Edit Payment Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Payment</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                editForm.handleSubmit()
              }}
              className="space-y-4"
            >
              <editForm.Field name="loan_id">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="edit-loan">Loan *</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a loan" />
                      </SelectTrigger>
                      <SelectContent>
                        {loans.map((loan) => {
                          const borrower = borrowers.find((b) => b.id === loan.borrower_id)
                          return (
                            <SelectItem key={loan.id} value={loan.id}>
                              {borrower?.name} - {formatCurrency(loan.current_balance)} remaining
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</p>
                    )}
                  </div>
                )}
              </editForm.Field>

              <editForm.Field name="principal_amount">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="edit-principal">Principal Amount</Label>
                    <Input
                      id="edit-principal"
                      type="number"
                      step="0.01"
                      min="0"
                      value={field.state.value || ''}
                      onChange={(e) => {
                        const amount = parseFloat(e.target.value) || 0
                        field.handleChange(amount)
                      }}
                      onBlur={field.handleBlur}
                      placeholder="0.00"
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</p>
                    )}
                  </div>
                )}
              </editForm.Field>

              <editForm.Field name="interest_amount">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="edit-interest">Interest Amount</Label>
                    <Input
                      id="edit-interest"
                      type="number"
                      step="0.01"
                      min="0"
                      value={field.state.value || ''}
                      onChange={(e) => {
                        const amount = parseFloat(e.target.value) || 0
                        field.handleChange(amount)
                      }}
                      onBlur={field.handleBlur}
                      placeholder="0.00"
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</p>
                    )}
                  </div>
                )}
              </editForm.Field>

              <editForm.Field name="payment_date">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="edit-date">Payment Date *</Label>
                    <Input
                      id="edit-date"
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

              <editForm.Field name="notes">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="edit-notes">Notes</Label>
                    <Input
                      id="edit-notes"
                      value={field.state.value || ''}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Optional notes about this payment..."
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</p>
                    )}
                  </div>
                )}
              </editForm.Field>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    editForm.reset()
                    setIsEditDialogOpen(false)
                    setEditingPayment(null)
                  }}
                >
                  Cancel
                </Button>
                <editForm.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                  {([canSubmit, isSubmitting]) => (
                    <Button type="submit" disabled={!canSubmit || isSubmitting}>
                      {isSubmitting ? 'Updating...' : 'Update Payment'}
                    </Button>
                  )}
                </editForm.Subscribe>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletePaymentId} onOpenChange={() => setDeletePaymentId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Payment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this payment? This action cannot be undone.
                {deletePaymentId &&
                  (() => {
                    const payment = payments.find((p) => p.id === deletePaymentId)
                    if (payment) {
                      return (
                        <div className="mt-3 p-3 bg-gray-50 rounded-md">
                          <p>
                            <strong>Borrower:</strong> {payment.borrower_name}
                          </p>
                          <p>
                            <strong>Amount:</strong> {formatCurrency(payment.amount)}
                          </p>
                          <p>
                            <strong>Principal:</strong> {formatCurrency(payment.principal_amount)}
                          </p>
                          <p>
                            <strong>Interest:</strong> {formatCurrency(payment.interest_amount)}
                          </p>
                          <p>
                            <strong>Date:</strong> {formatDate(payment.payment_date)}
                          </p>
                          {payment.notes && (
                            <p>
                              <strong>Notes:</strong> {payment.notes}
                            </p>
                          )}
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
                onClick={() => deletePaymentId && handleDeletePayment(deletePaymentId)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Payment
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by borrower name or loan ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="principal">Principal</SelectItem>
              <SelectItem value="interest">Interest</SelectItem>
              <SelectItem value="mixed">Mixed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="h-20">
          <CardContent className="p-3 h-full flex items-center">
            <div className="flex items-center">
              <IndianRupee className="h-6 w-6 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Payments</p>
                <p className="text-base font-bold">{formatCurrency(totalPayments)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-20">
          <CardContent className="p-3 h-full flex items-center">
            <div className="flex items-center">
              <Receipt className="h-6 w-6 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Principal Paid</p>
                <p className="text-base font-bold">{formatCurrency(totalPrincipal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-20">
          <CardContent className="p-3 h-full flex items-center">
            <div className="flex items-center">
              <TrendingUp className="h-6 w-6 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Interest Earned</p>
                <p className="text-base font-bold">{formatCurrency(totalInterest)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-20">
          <CardContent className="p-3 h-full flex items-center">
            <div className="flex items-center">
              <Calendar className="h-6 w-6 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-base font-bold">{formatCurrency(monthlyPayments)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Payments */}
      <Tabs defaultValue="past" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="past">Past Payments</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="past" className="space-y-6">
          {/* Payments Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Payment History ({filteredPayments.length})</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    refetchPayments()
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
              {filteredPayments.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No payments found</p>
                  <p className="text-sm text-gray-400">
                    {searchTerm || typeFilter !== 'all'
                      ? 'Try adjusting your search or filter'
                      : 'Record your first payment to get started'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Borrower</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="hidden md:table-cell">Principal</TableHead>
                      <TableHead className="hidden md:table-cell">Interest</TableHead>
                      <TableHead className="hidden sm:table-cell">Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="hidden lg:table-cell">Notes</TableHead>
                      <TableHead className="hidden xl:table-cell">Recorded</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{payment.borrower_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {payment.principal_amount > 0
                            ? formatCurrency(payment.principal_amount)
                            : '-'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {payment.interest_amount > 0
                            ? formatCurrency(payment.interest_amount)
                            : '-'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {getPaymentTypeBadge(payment.payment_type)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(payment.payment_date)}
                        </TableCell>
                        <TableCell
                          className="hidden lg:table-cell text-sm text-gray-500 max-w-32 truncate"
                          title={payment.notes || ''}
                        >
                          {payment.notes || '-'}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-sm text-gray-500">
                          {formatDate(payment.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPayment(payment)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeletePaymentId(payment.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
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
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-6">
          {/* Upcoming Payments */}
          <UpcomingPayments />
        </TabsContent>
      </Tabs>
    </div>
  )
}
