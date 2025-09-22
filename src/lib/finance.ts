import type { FixedIncome, Loan, Payment } from '@/types/database'
import { isFixedIncomeType } from './loans'
import { formatDate } from './utils'

/**
 * Calculates expected interest for the next repayment period.
 * For installment loans: Current Balance × Rate (%) ÷ 100 per interval
 * For bullet loans: Use calculateBulletLoanInterest for interval-based calculation
 */
export function calculateAccruedInterest(
  loan: Pick<
    Loan,
    | 'current_balance'
    | 'interest_rate'
    | 'repayment_interval_unit'
    | 'repayment_interval_value'
    | 'loan_type'
  >
): number {
  if (loan.interest_rate <= 0 || loan.current_balance <= 0) {
    return 0
  }

  // For bullet loans, this simple calculation is not appropriate
  // Use calculateBulletLoanInterest instead for time-based calculation
  if (loan.loan_type === 'bullet') {
    throw new Error(
      'Use calculateBulletLoanInterest for bullet loans - this function requires payment history'
    )
  }

  // Interest calculation: principal × rate ÷ 100 per interval
  // The interest_rate is already per interval (not annual)
  const periodInterest = loan.current_balance * (loan.interest_rate / 100)

  return Math.round(periodInterest * 100) / 100 // Round to 2 decimal places
}

/**
 * Calculates interval-based interest for bullet loans using payment history.
 * Interest rate is per interval (not annual).
 */
export function calculateBulletLoanInterest(
  loan: Pick<
    Loan,
    | 'start_date'
    | 'principal_amount'
    | 'interest_rate'
    | 'repayment_interval_unit'
    | 'repayment_interval_value'
  >,
  payments: Payment[],
  upToDate?: Date
): {
  totalInterestAccrued: number
  totalInterestPaid: number
  pendingInterest: number
} {
  if (loan.interest_rate <= 0 || loan.principal_amount <= 0) {
    return { totalInterestAccrued: 0, totalInterestPaid: 0, pendingInterest: 0 }
  }

  const targetDate = upToDate || new Date()
  const loanStartDate = new Date(loan.start_date)
  const intervalUnit = loan.repayment_interval_unit || 'months'
  const intervalValue = loan.repayment_interval_value || 1

  // Sort payments by date
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
  )

  let totalInterestAccrued = 0
  let totalInterestPaid = 0
  let currentPrincipal = loan.principal_amount
  let lastDate = loanStartDate

  // Calculate interest for each period between payments
  for (const payment of sortedPayments) {
    const paymentDate = new Date(payment.payment_date)

    // Calculate number of complete intervals elapsed
    const intervalsElapsed = calculateIntervalsElapsed(
      lastDate,
      paymentDate,
      intervalUnit,
      intervalValue
    )

    // Interest = Principal × Rate × Number of intervals
    const interestForPeriod = currentPrincipal * (loan.interest_rate / 100) * intervalsElapsed

    totalInterestAccrued += interestForPeriod
    totalInterestPaid += payment.interest_amount

    // Update principal balance after payment
    currentPrincipal -= payment.principal_amount
    lastDate = paymentDate
  }

  // Calculate interest from last payment to target date
  const finalIntervalsElapsed = calculateIntervalsElapsed(
    lastDate,
    targetDate,
    intervalUnit,
    intervalValue
  )
  const finalInterestForPeriod =
    currentPrincipal * (loan.interest_rate / 100) * finalIntervalsElapsed

  totalInterestAccrued += finalInterestForPeriod

  return {
    totalInterestAccrued: Math.round(totalInterestAccrued * 100) / 100,
    totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
    pendingInterest: Math.round((totalInterestAccrued - totalInterestPaid) * 100) / 100,
  }
}

/**
 * Calculates the number of complete intervals elapsed between two dates
 */
function calculateIntervalsElapsed(
  startDate: Date,
  endDate: Date,
  intervalUnit: 'days' | 'weeks' | 'months' | 'years',
  intervalValue: number
): number {
  if (endDate <= startDate) return 0

  let intervals = 0

  switch (intervalUnit) {
    case 'days': {
      const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      intervals = Math.floor(daysDiff / intervalValue)
      break
    }
    case 'weeks': {
      const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      intervals = Math.floor(daysDiff / (intervalValue * 7))
      break
    }
    case 'months': {
      const yearsDiff = endDate.getFullYear() - startDate.getFullYear()
      const monthsDiff = endDate.getMonth() - startDate.getMonth()
      const totalMonths = yearsDiff * 12 + monthsDiff

      // Only count as complete interval if we've passed the day of month
      let completeMonths = totalMonths
      if (endDate.getDate() < startDate.getDate()) {
        completeMonths -= 1
      }

      intervals = Math.floor(Math.max(0, completeMonths) / intervalValue)
      break
    }
    case 'years': {
      const yearsDiff = endDate.getFullYear() - startDate.getFullYear()

      // Only count as complete interval if we've passed the anniversary
      let completeYears = yearsDiff
      if (
        endDate.getMonth() < startDate.getMonth() ||
        (endDate.getMonth() === startDate.getMonth() && endDate.getDate() < startDate.getDate())
      ) {
        completeYears -= 1
      }

      intervals = Math.floor(Math.max(0, completeYears) / intervalValue)
      break
    }
  }

  return Math.max(0, intervals)
}

/**
 * Calculates the expected payment amount for the next period.
 * For installment loans, this is typically the accrued interest.
 * For bullet loans, there is no expected payment amount (manual payments).
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
  // Bullet loans don't have expected payment amounts
  if (loan.loan_type === 'bullet') {
    return 0
  }

  const accruedInterest = calculateAccruedInterest(loan)

  // For installment loans, the expected payment is the accrued interest
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
export function calculateAccruedIncome(fixedIncome: Pick<FixedIncome, 'amount'>): number {
  // In the simplified model, the amount IS the expected payment
  return fixedIncome.amount
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
 * NOTE: For bullet loans, use applyBulletLoanPayment instead which allows manual allocation.
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

  // For bullet loans, use applyBulletLoanPayment with manual allocation
  if (loan.loan_type === 'bullet') {
    throw new Error(
      'Use applyBulletLoanPayment for bullet loans - this function requires manual interest/principal allocation'
    )
  }

  // For installment loans only:
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

/**
 * Applies a payment to a bullet loan with manual interest/principal allocation.
 */
export function applyBulletLoanPayment(
  currentBalance: number,
  interestAmount: number,
  principalAmount: number
): PaymentApplicationResult {
  const newBalance = currentBalance - principalAmount

  // Use a small threshold for floating point issues to determine if paid off
  const isPaidOff = newBalance <= 0.005

  return {
    newBalance: isPaidOff ? 0 : Math.round(newBalance * 100) / 100,
    principalPaid: Math.round(principalAmount * 100) / 100,
    interestPaid: Math.round(interestAmount * 100) / 100,
    isPaidOff,
  }
}
