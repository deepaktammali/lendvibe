import { z } from 'zod'

export const borrowerSchema = z.object({
  name: z.string().min(1, 'Name is required').min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  address: z.string().optional(),
})

export const loanSchema = z
  .object({
    borrower_id: z.string().min(1, 'Please select a borrower'),
    loan_type: z.enum(['installment', 'bullet']),
    principal_amount: z.number().min(0.01, 'Principal amount must be greater than 0'),
    interest_rate: z
      .number()
      .min(0, 'Interest rate cannot be negative')
      .max(100, 'Interest rate cannot exceed 100%'),
    term_months: z
      .number()
      .int()
      .min(1, 'Term must be at least 1 month')
      .max(360, 'Term cannot exceed 360 months')
      .optional(),
    start_date: z.string().min(1, 'Start date is required'),
    repayment_interval_unit: z.enum(['days', 'weeks', 'months', 'years']).optional(),
    repayment_interval_value: z.number().int().min(1).optional(),
    hasEndDate: z.boolean().optional(),
    end_date: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.hasEndDate && data.end_date) {
        const start = new Date(data.start_date)
        const end = new Date(data.end_date)
        if (end <= start) {
          return false
        }
      }
      return true
    },
    {
      message: 'End date must be after start date',
      path: ['end_date'],
    }
  )

export const fixedIncomeSchema = z
  .object({
    tenant_id: z.string().min(1, 'Please select a tenant'),
    income_type: z.enum(['land_lease', 'rent_agreement', 'fixed_deposit_income']),
    principal_amount: z.number().min(0.01, 'Asset value must be greater than 0'),
    income_rate: z
      .number()
      .min(0, 'Income rate cannot be negative')
      .max(100, 'Income rate cannot exceed 100%'),
    payment_interval_unit: z.enum(['days', 'weeks', 'months', 'years']),
    payment_interval_value: z.number().int().min(1),
    start_date: z.string().min(1, 'Start date is required'),
    hasEndDate: z.boolean(),
    end_date: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.hasEndDate && data.end_date) {
        const start = new Date(data.start_date)
        const end = new Date(data.end_date)
        if (end <= start) {
          return false
        }
      }
      return true
    },
    {
      message: 'End date must be after start date',
      path: ['end_date'],
    }
  )

export const paymentSchema = z
  .object({
    loan_id: z.string().min(1, 'Please select a loan'),
    amount: z.number().min(0.01, 'Payment amount must be greater than 0'),
    payment_type: z.enum(['principal', 'interest', 'mixed']),
    principal_amount: z.number().min(0, 'Principal amount cannot be negative'),
    interest_amount: z.number().min(0, 'Interest amount cannot be negative'),
    payment_date: z.string().min(1, 'Payment date is required'),
  })
  .refine(
    (data) => {
      // For mixed payments, ensure principal + interest equals total amount
      if (data.payment_type === 'mixed') {
        const total = data.principal_amount + data.interest_amount
        return Math.abs(total - data.amount) < 0.01 // Allow for small floating point differences
      }
      return true
    },
    {
      message: 'Principal and interest amounts must sum to the total payment amount',
      path: ['amount'],
    }
  )

export const loanPaymentFormSchema = z
  .object({
    loan_id: z.string().min(1, 'Please select a loan'),
    payment_schedule_id: z.string().min(1, 'Please select a payment schedule'),
    principal_amount: z.number().min(0, 'Principal amount cannot be negative'),
    interest_amount: z.number().min(0, 'Interest amount cannot be negative'),
    payment_date: z.string().min(1, 'Payment date is required'),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      const total = data.principal_amount + data.interest_amount
      return total > 0
    },
    {
      message: 'Total payment (principal + interest) must be greater than 0',
      path: ['principal_amount'],
    }
  )

export const fixedIncomePaymentFormSchema = z.object({
  fixed_income_id: z.string().min(1, 'Please select a fixed income asset'),
  amount: z.number().min(0.01, 'Payment amount must be greater than 0'),
  payment_date: z.string().min(1, 'Payment date is required'),
  notes: z.string().optional(),
})

// Legacy schema for backward compatibility
export const paymentFormSchema = loanPaymentFormSchema

export const incomePaymentSchema = z.object({
  fixed_income_id: z.string().min(1, 'Please select a fixed income'),
  amount: z.number().min(0.01, 'Payment amount must be greater than 0'),
  payment_date: z.string().min(1, 'Payment date is required'),
})

export type BorrowerFormData = z.infer<typeof borrowerSchema>
export type LoanFormData = z.infer<typeof loanSchema>
export type FixedIncomeFormData = z.infer<typeof fixedIncomeSchema>
export type PaymentFormData = z.infer<typeof paymentSchema>
export type LoanPaymentFormInput = z.infer<typeof loanPaymentFormSchema>
export type FixedIncomePaymentFormInput = z.infer<typeof fixedIncomePaymentFormSchema>
export type IncomePaymentFormData = z.infer<typeof incomePaymentSchema>
export type PaymentFormInput = z.infer<typeof paymentFormSchema>
