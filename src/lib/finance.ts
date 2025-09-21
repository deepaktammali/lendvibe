import type { FixedIncome, Loan } from '@/types/database'
import { isFixedIncomeType } from './loans'
import { formatDate } from './utils'

/**
 * Calculates expected interest for the next repayment period.
 * Formula: Current Balance × Rate (%) ÷ 100
 */
export function calculateAccruedInterest(
  loan: Pick<
    Loan,
    'current_balance' | 'interest_rate' | 'repayment_interval_unit' | 'repayment_interval_value'
  >
): number {
  if (loan.interest_rate <= 0 || loan.current_balance <= 0) {
    return 0
  }

  // Simple calculation: principal × rate ÷ 100
  const periodInterest = loan.current_balance * (loan.interest_rate / 100)

  return Math.round(periodInterest * 100) / 100 // Round to 2 decimal places
}

/**
 * Calculates the expected payment amount for the next period.
 * For installment loans, this is typically the accrued interest.
 * For bullet losses, this might be interest-only.
 */
export function calculateExpectedPaymentAmount(
  loan: Pick<
    Loan,
    | 'current_balance'
    | 'interest_rate'
    | 'loan_type'
    | 'repayment_interval_unit'
    | 'repayment_interval_value'
  >
): number {
  const accruedInterest = calculateAccruedInterest(loan)

  // For most loan types, the expected payment is the accrued interest
  // This can be extended to include principal payments for specific loan types
  return accruedInterest
}

/**
 * Calculates payment status for the current period
 */
export function calculatePaymentStatus(
  accruedInterest: number,
  paidInterestInPeriod: number,
  dueDate: string
): {
  status: 'pending' | 'partial' | 'paid' | 'overdue'
  paidAmount: number
  remainingAmount: number
} {
  const today = new Date()
  const dueDateObj = new Date(dueDate)
  const isOverdue = dueDateObj < today

  const remainingAmount = Math.max(0, accruedInterest - paidInterestInPeriod)

  if (paidInterestInPeriod >= accruedInterest) {
    return {
      status: 'paid',
      paidAmount: paidInterestInPeriod,
      remainingAmount: 0,
    }
  } else if (paidInterestInPeriod > 0) {
    return {
      status: isOverdue ? 'overdue' : 'partial',
      paidAmount: paidInterestInPeriod,
      remainingAmount,
    }
  } else {
    return {
      status: isOverdue ? 'overdue' : 'pending',
      paidAmount: 0,
      remainingAmount: accruedInterest,
    }
  }
}

export interface PaymentApplicationResult {
  newBalance: number
  principalPaid: number
  interestPaid: number
  isPaidOff: boolean
}

export interface UpcomingPayment {
  id: string
  type: 'loan' | 'fixed_income'
  borrowerName: string
  assetType: string
  dueDate: string
  accruedInterest: number
  expectedPaymentAmount: number
  daysSinceLastPayment: number
  currentBalance: number
  realRemainingPrincipal?: number
  assetValue?: number
  paymentStatus?: 'pending' | 'partial' | 'paid' | 'overdue'
  paidInterestAmount?: number
  remainingInterestAmount?: number
}

/**
 * Calculate the next payment due date based on loan's repayment interval
 */
export function getNextPaymentDate(
  loan: Pick<Loan, 'start_date' | 'repayment_interval_unit' | 'repayment_interval_value'>,
  lastPaymentDate?: string
): string {
  let baseDate: Date

  if (lastPaymentDate) {
    // Start from the last payment date and add one interval
    baseDate = new Date(lastPaymentDate)
  } else {
    // If no payments have been made, the next payment should be the first due date:
    // start_date + repayment_interval_value
    baseDate = new Date(loan.start_date)
  }

  // Get the day of the month from start date for 'months' interval
  const startDate = new Date(loan.start_date)
  const dueDayOfMonth = startDate.getDate()

  if (!loan.repayment_interval_unit || !loan.repayment_interval_value) {
    // Default to monthly
    baseDate.setMonth(baseDate.getMonth() + 1)
    return formatDate(baseDate)
  }

  switch (loan.repayment_interval_unit) {
    case 'days':
      baseDate.setDate(baseDate.getDate() + loan.repayment_interval_value)
      break
    case 'weeks':
      baseDate.setDate(baseDate.getDate() + loan.repayment_interval_value * 7)
      break
    case 'months': {
      if (lastPaymentDate) {
        // Add months to the last payment date
        baseDate.setMonth(baseDate.getMonth() + loan.repayment_interval_value)
      } else {
        // First due date: month after loan start, but on the same day of month
        baseDate.setMonth(baseDate.getMonth() + loan.repayment_interval_value)
        // Ensure we use the day of month from start date
        const newDayOfMonth = Math.min(
          dueDayOfMonth,
          new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate()
        )
        baseDate.setDate(newDayOfMonth)
      }
      break
    }
    case 'years':
      baseDate.setFullYear(baseDate.getFullYear() + loan.repayment_interval_value)
      break
  }

  return formatDate(baseDate)
}

/**
 * Calculate days since the last payment or loan start date
 */
export function getDaysSinceLastPayment(
  loan: Pick<Loan, 'start_date'>,
  lastPaymentDate?: string
): number {
  const lastDate = lastPaymentDate ? new Date(lastPaymentDate) : new Date(loan.start_date)
  const today = new Date()
  const diffTime = today.getTime() - lastDate.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Calculates accrued income for fixed income assets
 */
export function calculateAccruedIncome(
  fixedIncome: Pick<
    FixedIncome,
    'principal_amount' | 'income_rate' | 'payment_interval_unit' | 'payment_interval_value'
  >
): number {
  if (fixedIncome.income_rate <= 0 || fixedIncome.principal_amount <= 0) {
    return 0
  }

  const annualRate = fixedIncome.income_rate / 100
  const dailyRate = annualRate / 365

  let intervalDays = 30
  if (fixedIncome.payment_interval_unit && fixedIncome.payment_interval_value) {
    switch (fixedIncome.payment_interval_unit) {
      case 'days':
        intervalDays = fixedIncome.payment_interval_value
        break
      case 'weeks':
        intervalDays = fixedIncome.payment_interval_value * 7
        break
      case 'months':
        intervalDays = fixedIncome.payment_interval_value * 30
        break
      case 'years':
        intervalDays = fixedIncome.payment_interval_value * 365
        break
    }
  }

  const accruedIncome = fixedIncome.principal_amount * dailyRate * intervalDays
  return Math.round(accruedIncome * 100) / 100
}

/**
 * Calculate the next payment due date for fixed income
 */
export function getNextIncomePaymentDate(
  fixedIncome: Pick<FixedIncome, 'start_date' | 'payment_interval_unit' | 'payment_interval_value'>,
  lastPaymentDate?: string
): string {
  const baseDate = lastPaymentDate ? new Date(lastPaymentDate) : new Date(fixedIncome.start_date)

  if (!fixedIncome.payment_interval_unit || !fixedIncome.payment_interval_value) {
    baseDate.setMonth(baseDate.getMonth() + 1)
    return formatDate(baseDate)
  }

  switch (fixedIncome.payment_interval_unit) {
    case 'days':
      baseDate.setDate(baseDate.getDate() + fixedIncome.payment_interval_value)
      break
    case 'weeks':
      baseDate.setDate(baseDate.getDate() + fixedIncome.payment_interval_value * 7)
      break
    case 'months':
      baseDate.setMonth(baseDate.getMonth() + fixedIncome.payment_interval_value)
      break
    case 'years':
      baseDate.setFullYear(baseDate.getFullYear() + fixedIncome.payment_interval_value)
      break
  }

  return formatDate(baseDate)
}

/**
 * Calculate days since the last income payment or fixed income start date
 */
export function getDaysSinceLastIncomePayment(
  fixedIncome: Pick<FixedIncome, 'start_date'>,
  lastPaymentDate?: string
): number {
  const lastDate = lastPaymentDate ? new Date(lastPaymentDate) : new Date(fixedIncome.start_date)
  const today = new Date()
  const diffTime = today.getTime() - lastDate.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Applies a payment to a loan, distributing it between accrued interest and principal.
 */
export function applyPayment(
  loan: Pick<
    Loan,
    | 'current_balance'
    | 'interest_rate'
    | 'loan_type'
    | 'repayment_interval_unit'
    | 'repayment_interval_value'
  >,
  paymentAmount: number
): PaymentApplicationResult {
  // For fixed income types (land_lease, rent_agreement, fixed_deposit_income),
  // treat the payment as pure interest/fee by default.
  if (isFixedIncomeType(loan.loan_type)) {
    return {
      newBalance: loan.current_balance, // Principal does not change with a standard fixed income payment
      principalPaid: 0,
      interestPaid: paymentAmount,
      isPaidOff: false,
    }
  }

  // For installment and bullet loans:
  const accruedInterest = calculateAccruedInterest(loan)

  const interestPaid = Math.min(paymentAmount, accruedInterest)
  const principalPaid = paymentAmount - interestPaid
  const newBalance = loan.current_balance - principalPaid

  // Use a small threshold for floating point issues to determine if paid off
  const isPaidOff = newBalance <= 0.005

  return {
    newBalance: isPaidOff ? 0 : Math.round(newBalance * 100) / 100,
    principalPaid: Math.round(principalPaid * 100) / 100,
    interestPaid: Math.round(interestPaid * 100) / 100,
    isPaidOff,
  }
}
