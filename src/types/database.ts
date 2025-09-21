export interface Borrower {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  created_at: string
}

export interface Loan {
  id: string
  borrower_id: string
  loan_type: 'installment' | 'bullet'
  principal_amount: number
  interest_rate: number
  start_date: string // YYYY-MM-DD format
  end_date?: string // YYYY-MM-DD format
  status: 'active' | 'paid_off' | 'defaulted'
  current_balance: number
  repayment_interval_unit?: 'days' | 'weeks' | 'months' | 'years'
  repayment_interval_value?: number
  notes?: string
  created_at: string
}

export interface FixedIncome {
  id: string
  tenant_id: string // Reference to borrowers table (but conceptually they're tenants/lessees)
  income_type: 'land_lease' | 'rent_agreement' | 'fixed_deposit_income'
  principal_amount: number // The asset value or deposit amount
  income_rate: number // Annual rate for income calculation
  payment_interval_unit: 'days' | 'weeks' | 'months' | 'years'
  payment_interval_value: number
  start_date: string // YYYY-MM-DD format
  end_date?: string // Optional end date for fixed-term agreements
  status: 'active' | 'terminated' | 'expired'
  created_at: string
}

export interface PaymentSchedule {
  id: string
  loan_id: string
  period_start_date: string // YYYY-MM-DD format
  period_end_date: string // YYYY-MM-DD format
  due_date: string // YYYY-MM-DD format, calculated from loan terms
  total_principal_due: number
  total_interest_due: number
  total_principal_paid: number // Accumulated principal payments
  total_interest_paid: number // Accumulated interest payments
  status: 'pending' | 'partially_paid' | 'paid' | 'overdue'
  created_at: string
}

export interface Payment {
  id: string
  payment_schedule_id: string
  amount: number
  payment_type: 'principal' | 'interest' | 'mixed'
  principal_amount: number
  interest_amount: number
  payment_date: string // YYYY-MM-DD format
  notes?: string
  created_at: string
}

export interface IncomePayment {
  id: string
  fixed_income_id: string
  amount: number
  payment_date: string // YYYY-MM-DD format
  notes?: string
  created_at: string
}

// Legacy support types
export type LoanCategory = 'traditional_loan' | 'fixed_income'

export const LOAN_TYPE_LABELS: Record<Loan['loan_type'], string> = {
  installment: 'Installment Loan',
  bullet: 'Bullet Loan',
}

export const FIXED_INCOME_TYPE_LABELS: Record<FixedIncome['income_type'], string> = {
  land_lease: 'Land Lease',
  rent_agreement: 'Rent Agreement',
  fixed_deposit_income: 'Fixed Deposit Income',
}

export interface BorrowerWithLoans extends Borrower {
  loans: Loan[]
}

export interface BorrowerWithFixedIncome extends Borrower {
  fixedIncomes: FixedIncome[]
}

export interface LoanWithPayments extends Loan {
  paymentSchedules: PaymentSchedule[]
  payments: Payment[]
  borrower: Borrower
}

export interface FixedIncomeWithPayments extends FixedIncome {
  incomePayments: IncomePayment[]
  tenant: Borrower
}
