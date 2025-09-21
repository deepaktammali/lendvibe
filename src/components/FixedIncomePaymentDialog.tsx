import { useForm } from '@tanstack/react-form'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
import { useGetFixedIncomesWithTenants } from '@/hooks/api/useFixedIncome'
import { useCreateIncomePayment } from '@/hooks/api/useIncomePayments'
import { type FixedIncomePaymentFormInput, fixedIncomePaymentFormSchema } from '@/lib/validation'

interface FixedIncomePaymentDialogProps {
  onSuccess?: () => void
}

export default function FixedIncomePaymentDialog({ onSuccess }: FixedIncomePaymentDialogProps) {
  const [isOpen, setIsOpen] = useState(false)

  const { data: fixedIncomes = [] } = useGetFixedIncomesWithTenants()
  const createIncomePaymentMutation = useCreateIncomePayment()

  const form = useForm({
    defaultValues: {
      fixed_income_id: '',
      amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
    } as FixedIncomePaymentFormInput,
    validators: {
      onBlur: fixedIncomePaymentFormSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await createIncomePaymentMutation.mutateAsync(value)
        setIsOpen(false)
        form.reset()
        onSuccess?.()
      } catch (error) {
        console.error('Failed to record income payment:', error)
      }
    },
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={() => setIsOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Record Income Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Fixed Income Payment</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
          className="space-y-4"
        >
          <form.Field name="fixed_income_id">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="income-asset">Fixed Income Asset *</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a fixed income asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {fixedIncomes.map((income) => (
                      <SelectItem key={income.id} value={income.id}>
                        {income.tenant_name} - {income.income_type.replace('_', ' ')} -{' '}
                        {formatCurrency(income.principal_amount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="amount">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="income-amount">Amount *</Label>
                <Input
                  id="income-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
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
          </form.Field>

          <form.Field name="payment_date">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="income-date">Payment Date *</Label>
                <Input
                  id="income-date"
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
          </form.Field>

          <form.Field name="notes">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="income-notes">Notes</Label>
                <Input
                  id="income-notes"
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
          </form.Field>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset()
                setIsOpen(false)
              }}
            >
              Cancel
            </Button>
            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? 'Recording...' : 'Record Payment'}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
