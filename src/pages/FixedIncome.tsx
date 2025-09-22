import { useForm } from '@tanstack/react-form'
import {
  Calendar,
  Clock,
  Edit,
  Eye,
  IndianRupee,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  User,
} from 'lucide-react'
import { useEffect, useState } from 'react'
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
  AlertDialogTrigger,
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
import { useGetBorrowers } from '@/hooks/api/useBorrowers'
import {
  useCreateFixedIncome,
  useDeleteFixedIncome,
  useGetFixedIncomesWithTenants,
  useUpdateFixedIncome,
} from '@/hooks/api/useFixedIncome'
import { getCurrentDateISO } from '@/lib/utils'
import { type FixedIncomeFormData, fixedIncomeSchema } from '@/lib/validation'
import type { FixedIncome } from '@/types/api/fixedIncome'

export default function FixedIncomePage() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingFixedIncome, setEditingFixedIncome] = useState<FixedIncome | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState<FixedIncome | null>(null)

  // Use the new TanStack Query hooks
  const {
    data: fixedIncomes = [],
    isLoading: loading,
    refetch: refetchFixedIncomes,
  } = useGetFixedIncomesWithTenants()
  const { data: borrowers = [], refetch: refetchBorrowers } = useGetBorrowers()
  const createFixedIncomeMutation = useCreateFixedIncome()
  const updateFixedIncomeMutation = useUpdateFixedIncome()
  const deleteFixedIncomeMutation = useDeleteFixedIncome()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount)
  }

  const fixedIncomeForm = useForm({
    defaultValues: {
      label: '',
      payer_id: '',
      amount: 0,
      payment_interval_unit: 'months' as const,
      payment_interval_value: 1,
      start_date: getCurrentDateISO(),
      hasEndDate: false,
      end_date: '',
    } as FixedIncomeFormData & { hasEndDate: boolean },
    validators: {
      onBlur: fixedIncomeSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const fixedIncomeData = {
          label: value.label,
          payer_id: value.payer_id || undefined,
          amount: value.amount,
          payment_interval_unit: value.payment_interval_unit,
          payment_interval_value: value.payment_interval_value,
          start_date: value.start_date,
          end_date: value.hasEndDate ? value.end_date : undefined,
        }

        await createFixedIncomeMutation.mutateAsync(fixedIncomeData)
        setIsAddDialogOpen(false)
        fixedIncomeForm.reset()
      } catch (error) {
        console.error('Failed to create fixed income:', error)
      }
    },
  })

  const editFixedIncomeForm = useForm({
    defaultValues: {
      label: '',
      payer_id: '',
      amount: 0,
      payment_interval_unit: 'months' as const,
      payment_interval_value: 1,
      start_date: getCurrentDateISO(),
      hasEndDate: false,
      end_date: '',
    } as FixedIncomeFormData & { hasEndDate: boolean },
    validators: {
      onBlur: fixedIncomeSchema,
    },
    onSubmit: async ({ value }) => {
      if (!editingFixedIncome) return

      try {
        const fixedIncomeData = {
          label: value.label,
          payer_id: value.payer_id || undefined,
          amount: value.amount,
          payment_interval_unit: value.payment_interval_unit,
          payment_interval_value: value.payment_interval_value,
          start_date: value.start_date,
          end_date: value.hasEndDate ? value.end_date : undefined,
        }

        await updateFixedIncomeMutation.mutateAsync({
          id: editingFixedIncome.id,
          data: fixedIncomeData,
        })
        setIsEditDialogOpen(false)
        setEditingFixedIncome(null)
        editFixedIncomeForm.reset()
      } catch (error) {
        console.error('Failed to update fixed income:', error)
      }
    },
  })

  const handleEdit = (fixedIncome: FixedIncome) => {
    setEditingFixedIncome(fixedIncome)
    setIsEditDialogOpen(true)
  }

  // Pre-fill the edit form when editingFixedIncome changes
  useEffect(() => {
    if (editingFixedIncome) {
      editFixedIncomeForm.setFieldValue('label', editingFixedIncome.label || '')
      editFixedIncomeForm.setFieldValue('payer_id', editingFixedIncome.payer_id || '')
      editFixedIncomeForm.setFieldValue('amount', editingFixedIncome.amount)
      editFixedIncomeForm.setFieldValue(
        'payment_interval_unit',
        editingFixedIncome.payment_interval_unit
      )
      editFixedIncomeForm.setFieldValue(
        'payment_interval_value',
        editingFixedIncome.payment_interval_value
      )
      editFixedIncomeForm.setFieldValue('start_date', editingFixedIncome.start_date)
      editFixedIncomeForm.setFieldValue('hasEndDate', !!editingFixedIncome.end_date)
      editFixedIncomeForm.setFieldValue('end_date', editingFixedIncome.end_date || '')
    } else {
      editFixedIncomeForm.reset()
    }
  }, [editingFixedIncome, editFixedIncomeForm])

  const handleConfirmDelete = async () => {
    if (!deletingItem) return

    try {
      await deleteFixedIncomeMutation.mutateAsync(deletingItem.id)
      setDeletingItem(null)
    } catch (error) {
      console.error('Failed to delete fixed income:', error)
    }
  }

  const handleInitiateDelete = (item: FixedIncome) => {
    setDeletingItem(item)
  }

  const filteredFixedIncomes = fixedIncomes.filter((item) => {
    const matchesSearch =
      (item.label || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.tenant_name || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: FixedIncome['status']) => {
    const variants = {
      active: 'default',
      terminated: 'destructive',
      expired: 'secondary',
    } as const

    return (
      <Badge variant={variants[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading fixed income...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fixed Income</h1>
          <p className="text-muted-foreground mt-2">Manage your income-generating assets</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Fixed Income
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Fixed Income</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                fixedIncomeForm.handleSubmit()
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <fixedIncomeForm.Field name="label">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="label">Label</Label>
                      <Input
                        id="label"
                        placeholder="e.g., Rent - Apartment 1A"
                        value={field.state.value || ''}
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
                </fixedIncomeForm.Field>

                <fixedIncomeForm.Field name="payer_id">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="payer">Payer (Optional)</Label>
                      <Select
                        value={field.state.value || 'none'}
                        onValueChange={(value) => field.handleChange(value === 'none' ? '' : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a payer (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No payer selected</SelectItem>
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
                </fixedIncomeForm.Field>

                <fixedIncomeForm.Field name="amount">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={field.state.value || ''}
                        onChange={(e) => {
                          const amount = parseFloat(e.target.value) || 0
                          field.handleChange(amount)
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
                </fixedIncomeForm.Field>

                <fixedIncomeForm.Field name="payment_interval_value">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="interval-value">Payment Every *</Label>
                      <Input
                        id="interval-value"
                        type="number"
                        min="1"
                        value={field.state.value || ''}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10) || 1
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
                </fixedIncomeForm.Field>

                <fixedIncomeForm.Field name="payment_interval_unit">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="interval-unit">Interval Unit *</Label>
                      <Select
                        value={field.state.value}
                        onValueChange={(value) =>
                          field.handleChange(value as FixedIncomeFormData['payment_interval_unit'])
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="days">Days</SelectItem>
                          <SelectItem value="weeks">Weeks</SelectItem>
                          <SelectItem value="months">Months</SelectItem>
                          <SelectItem value="years">Years</SelectItem>
                        </SelectContent>
                      </Select>
                      {field.state.meta.errors.length > 0 && (
                        <p className="text-sm text-destructive">
                          {field.state.meta.errors[0]?.message}
                        </p>
                      )}
                    </div>
                  )}
                </fixedIncomeForm.Field>

                <fixedIncomeForm.Field name="start_date">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="start-date">Start Date *</Label>
                      <Input
                        id="start-date"
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
                </fixedIncomeForm.Field>

                <fixedIncomeForm.Field name="hasEndDate">
                  {(field) => (
                    <div className="space-y-2">
                      <Label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={field.state.value}
                          onChange={(e) => field.handleChange(e.target.checked)}
                        />
                        <span>Has End Date</span>
                      </Label>
                    </div>
                  )}
                </fixedIncomeForm.Field>
              </div>

              <fixedIncomeForm.Subscribe selector={(state) => state.values.hasEndDate}>
                {(hasEndDate) => {
                  if (hasEndDate) {
                    return (
                      <fixedIncomeForm.Field name="end_date">
                        {(field) => (
                          <div className="space-y-2">
                            <Label htmlFor="end-date">End Date</Label>
                            <Input
                              id="end-date"
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
                      </fixedIncomeForm.Field>
                    )
                  }
                  return null
                }}
              </fixedIncomeForm.Subscribe>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    fixedIncomeForm.reset()
                    setIsAddDialogOpen(false)
                  }}
                >
                  Cancel
                </Button>
                <fixedIncomeForm.Subscribe
                  selector={(state) => [state.canSubmit, state.isSubmitting]}
                >
                  {([canSubmit, isSubmitting]) => (
                    <Button type="submit" disabled={!canSubmit || isSubmitting}>
                      {isSubmitting ? 'Creating...' : 'Create Fixed Income'}
                    </Button>
                  )}
                </fixedIncomeForm.Subscribe>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Fixed Income</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                editFixedIncomeForm.handleSubmit()
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <editFixedIncomeForm.Field name="label">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="edit-label">Label</Label>
                      <Input
                        id="edit-label"
                        placeholder="e.g., Rent - Apartment 1A"
                        value={field.state.value || ''}
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
                </editFixedIncomeForm.Field>

                <editFixedIncomeForm.Field name="payer_id">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="edit-payer">Payer (Optional)</Label>
                      <Select
                        value={field.state.value || 'none'}
                        onValueChange={(value) => field.handleChange(value === 'none' ? '' : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a payer (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No payer selected</SelectItem>
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
                </editFixedIncomeForm.Field>

                <editFixedIncomeForm.Field name="amount">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="edit-amount">Amount *</Label>
                      <Input
                        id="edit-amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={field.state.value || ''}
                        onChange={(e) => {
                          const amount = parseFloat(e.target.value) || 0
                          field.handleChange(amount)
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
                </editFixedIncomeForm.Field>

                <editFixedIncomeForm.Field name="payment_interval_value">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="edit-interval-value">Payment Every *</Label>
                      <Input
                        id="edit-interval-value"
                        type="number"
                        min="1"
                        value={field.state.value || ''}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10) || 1
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
                </editFixedIncomeForm.Field>

                <editFixedIncomeForm.Field name="payment_interval_unit">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="edit-interval-unit">Interval Unit *</Label>
                      <Select
                        value={field.state.value}
                        onValueChange={(value) =>
                          field.handleChange(value as FixedIncomeFormData['payment_interval_unit'])
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="days">Days</SelectItem>
                          <SelectItem value="weeks">Weeks</SelectItem>
                          <SelectItem value="months">Months</SelectItem>
                          <SelectItem value="years">Years</SelectItem>
                        </SelectContent>
                      </Select>
                      {field.state.meta.errors.length > 0 && (
                        <p className="text-sm text-destructive">
                          {field.state.meta.errors[0]?.message}
                        </p>
                      )}
                    </div>
                  )}
                </editFixedIncomeForm.Field>

                <editFixedIncomeForm.Field name="start_date">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="edit-start-date">Start Date *</Label>
                      <Input
                        id="edit-start-date"
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
                </editFixedIncomeForm.Field>

                <editFixedIncomeForm.Field name="hasEndDate">
                  {(field) => (
                    <div className="space-y-2">
                      <Label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={field.state.value}
                          onChange={(e) => field.handleChange(e.target.checked)}
                        />
                        <span>Has End Date</span>
                      </Label>
                    </div>
                  )}
                </editFixedIncomeForm.Field>
              </div>

              <editFixedIncomeForm.Subscribe selector={(state) => state.values.hasEndDate}>
                {(hasEndDate) => {
                  if (hasEndDate) {
                    return (
                      <editFixedIncomeForm.Field name="end_date">
                        {(field) => (
                          <div className="space-y-2">
                            <Label htmlFor="edit-end-date">End Date</Label>
                            <Input
                              id="edit-end-date"
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
                      </editFixedIncomeForm.Field>
                    )
                  }
                  return null
                }}
              </editFixedIncomeForm.Subscribe>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    editFixedIncomeForm.reset()
                    setIsEditDialogOpen(false)
                    setEditingFixedIncome(null)
                  }}
                >
                  Cancel
                </Button>
                <editFixedIncomeForm.Subscribe
                  selector={(state) => [state.canSubmit, state.isSubmitting]}
                >
                  {([canSubmit, isSubmitting]) => (
                    <Button type="submit" disabled={!canSubmit || isSubmitting}>
                      {isSubmitting ? 'Updating...' : 'Update Fixed Income'}
                    </Button>
                  )}
                </editFixedIncomeForm.Subscribe>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 bg-card p-3 rounded-lg border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by label or payer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="h-20">
          <CardContent className="p-3 h-full flex items-center">
            <div className="flex items-center">
              <TrendingUp className="h-6 w-6 text-primary" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Total Active</p>
                <p className="text-base font-bold">
                  {formatCurrency(
                    filteredFixedIncomes
                      .filter((item) => item.status === 'active')
                      .reduce((sum, item) => sum + item.amount, 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-20">
          <CardContent className="p-3 h-full flex items-center">
            <div className="flex items-center">
              <IndianRupee className="h-6 w-6 text-secondary" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Active Count</p>
                <p className="text-base font-bold">
                  {filteredFixedIncomes.filter((item) => item.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-20">
          <CardContent className="p-3 h-full flex items-center">
            <div className="flex items-center">
              <Clock className="h-6 w-6 text-accent-foreground" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Average Payment</p>
                <p className="text-base font-bold">
                  {filteredFixedIncomes.length > 0
                    ? formatCurrency(
                        filteredFixedIncomes.reduce((sum, item) => sum + item.amount, 0) /
                          filteredFixedIncomes.length
                      )
                    : formatCurrency(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-20">
          <CardContent className="p-3 h-full flex items-center">
            <div className="flex items-center">
              <Calendar className="h-6 w-6 text-chart-4" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Total Count</p>
                <p className="text-base font-bold">{filteredFixedIncomes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Income Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Fixed Income Assets ({filteredFixedIncomes.length})</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchFixedIncomes()
                refetchBorrowers()
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredFixedIncomes.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No fixed income assets found</p>
              <p className="text-sm text-muted-foreground/70">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter'
                  : 'Create your first fixed income asset to get started'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Payer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Every</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFixedIncomes.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <span className="font-medium">{item.label || 'Untitled'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{item.tenant_name || 'No payer assigned'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(item.amount)}</TableCell>
                    <TableCell>
                      {item.payment_interval_value} {item.payment_interval_unit}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/fixed-income/${item.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleInitiateDelete(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Fixed Income</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "
                                {deletingItem?.label || 'this fixed income'}"? This action cannot be
                                undone and will also delete all related payment records.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleConfirmDelete}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
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
