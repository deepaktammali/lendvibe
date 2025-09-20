import { useForm } from '@tanstack/react-form'
import {
  Calendar,
  Clock,
  Eye,
  IndianRupee,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  User,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
} from '@/hooks/api/useFixedIncome'
import { type FixedIncomeFormData, fixedIncomeSchema } from '@/lib/validation'
import type { FixedIncome } from '@/types/api/fixedIncome'
import { FIXED_INCOME_TYPE_LABELS } from '@/types/database'

export default function FixedIncomePage() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  // Use the new TanStack Query hooks
  const { data: fixedIncomes = [], isLoading: loading, refetch: refetchFixedIncomes } = useGetFixedIncomesWithTenants()
  const { data: borrowers = [], refetch: refetchBorrowers } = useGetBorrowers()
  const createFixedIncomeMutation = useCreateFixedIncome()
  const deleteFixedIncomeMutation = useDeleteFixedIncome()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const fixedIncomeForm = useForm({
    defaultValues: {
      tenant_id: '',
      income_type: 'land_lease' as const,
      principal_amount: 0,
      income_rate: 0,
      payment_interval_unit: 'months' as const,
      payment_interval_value: 1,
      start_date: new Date().toISOString().split('T')[0],
      hasEndDate: false,
      end_date: '',
    } as FixedIncomeFormData & { hasEndDate: boolean },
    validators: {
      onBlur: fixedIncomeSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const fixedIncomeData = {
          tenant_id: value.tenant_id,
          income_type: value.income_type,
          principal_amount: value.principal_amount,
          income_rate: value.income_rate,
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

  const handleDelete = async (id: string) => {
    if (
      window.confirm(
        'Are you sure you want to delete this fixed income? This action cannot be undone.'
      )
    ) {
      try {
        await deleteFixedIncomeMutation.mutateAsync(id)
      } catch (error) {
        console.error('Failed to delete fixed income:', error)
      }
    }
  }

  const filteredFixedIncomes = fixedIncomes.filter((item) => {
    const matchesSearch =
      item.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.income_type.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getIncomeTypeBadge = (type: FixedIncome['income_type']) => {
    const variants = {
      land_lease: 'default',
      rent_agreement: 'secondary',
      fixed_deposit_income: 'outline',
    } as const

    return <Badge variant={variants[type]}>{FIXED_INCOME_TYPE_LABELS[type]}</Badge>
  }

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
          <h1 className="text-3xl font-bold text-gray-900">Fixed Income</h1>
          <p className="text-gray-600 mt-2">Manage your income-generating assets</p>
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
                <fixedIncomeForm.Field name="tenant_id">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="tenant">Tenant *</Label>
                      <Select
                        value={field.state.value}
                        onValueChange={(value) => field.handleChange(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a tenant" />
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
                        <p className="text-sm text-red-600">
                          {field.state.meta.errors[0]?.message}
                        </p>
                      )}
                    </div>
                  )}
                </fixedIncomeForm.Field>

                <fixedIncomeForm.Field name="income_type">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="income-type">Income Type *</Label>
                      <Select
                        value={field.state.value}
                        onValueChange={(value) =>
                          field.handleChange(value as FixedIncomeFormData['income_type'])
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select income type" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(FIXED_INCOME_TYPE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {field.state.meta.errors.length > 0 && (
                        <p className="text-sm text-red-600">
                          {field.state.meta.errors[0]?.message}
                        </p>
                      )}
                    </div>
                  )}
                </fixedIncomeForm.Field>

                <fixedIncomeForm.Field name="principal_amount">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="principal-amount">Asset Value *</Label>
                      <Input
                        id="principal-amount"
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
                        <p className="text-sm text-red-600">
                          {field.state.meta.errors[0]?.message}
                        </p>
                      )}
                    </div>
                  )}
                </fixedIncomeForm.Field>

                <fixedIncomeForm.Field name="income_rate">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="income-rate">Annual Rate (%) *</Label>
                      <Input
                        id="income-rate"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={field.state.value || ''}
                        onChange={(e) => {
                          const rate = parseFloat(e.target.value) || 0
                          field.handleChange(rate)
                        }}
                        onBlur={field.handleBlur}
                      />
                      {field.state.meta.errors.length > 0 && (
                        <p className="text-sm text-red-600">
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
                        <p className="text-sm text-red-600">
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
                        <p className="text-sm text-red-600">
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
                        <p className="text-sm text-red-600">
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
                              <p className="text-sm text-red-600">
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
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by tenant name or income type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Active</p>
                <p className="text-lg font-bold">
                  {formatCurrency(
                    filteredFixedIncomes
                      .filter((item) => item.status === 'active')
                      .reduce((sum, item) => sum + item.principal_amount, 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <IndianRupee className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Count</p>
                <p className="text-lg font-bold">
                  {filteredFixedIncomes.filter((item) => item.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Rate</p>
                <p className="text-lg font-bold">
                  {filteredFixedIncomes.length > 0
                    ? (
                        filteredFixedIncomes.reduce((sum, item) => sum + item.income_rate, 0) /
                        filteredFixedIncomes.length
                      ).toFixed(2)
                    : '0.00'}
                  %
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Count</p>
                <p className="text-lg font-bold">{filteredFixedIncomes.length}</p>
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
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No fixed income assets found</p>
              <p className="text-sm text-gray-400">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter'
                  : 'Create your first fixed income asset to get started'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Asset Value</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Payment Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFixedIncomes.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{item.tenant_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getIncomeTypeBadge(item.income_type)}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(item.principal_amount)}
                    </TableCell>
                    <TableCell>{item.income_rate}%</TableCell>
                    <TableCell>
                      Every {item.payment_interval_value} {item.payment_interval_unit}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(item.start_date)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/fixed-income/${item.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(item.id)}>
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
    </div>
  )
}
