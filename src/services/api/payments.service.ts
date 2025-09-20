import {
  getPayments as dbGetPayments,
  createPayment as dbCreatePayment,
  updatePayment as dbUpdatePayment,
  deletePayment as dbDeletePayment,
  getPaymentsByLoan as dbGetPaymentsByLoan,
  getLastPaymentByLoan as dbGetLastPaymentByLoan,
  getLastPaymentsByLoans as dbGetLastPaymentsByLoans,
  updateLoanBalance,
  updateLoanStatus,
  getLoan,
} from '@/lib/database'
import type { Payment } from '@/types/api/payments'
import type { CreatePayment } from '@/types/api/payments'

export type CreatePaymentData = CreatePayment.Payload
export type UpdatePaymentData = {
  loan_id?: string
  amount?: number
  payment_type?: Payment['payment_type']
  principal_amount?: number
  interest_amount?: number
  payment_date?: string
}

export interface PaymentWithDetails extends Payment {
  borrower_name: string
  loan_principal: number
}

export const paymentService = {
  async getPayments(): Promise<PaymentWithDetails[]> {
    const dbPayments = await dbGetPayments()
    // Transform database types to API types with borrower information
    // Note: In a real implementation, this would join with borrower/loan tables
    // For now, we'll return basic payment data
    return dbPayments.map((dbPayment) => ({
      id: dbPayment.id,
      loan_id: dbPayment.loan_id,
      amount: dbPayment.amount,
      payment_type: dbPayment.payment_type,
      principal_amount: dbPayment.principal_amount,
      interest_amount: dbPayment.interest_amount,
      payment_date: dbPayment.payment_date,
      created_at: dbPayment.created_at,
      borrower_name: 'Unknown', // Would need to join with borrower data
      loan_principal: 0, // Would need to join with loan data
    }))
  },

  async getPaymentsByLoan(loanId: string): Promise<Payment[]> {
    const dbPayments = await dbGetPaymentsByLoan(loanId)
    // Transform database types to API types
    return dbPayments.map((dbPayment) => ({
      id: dbPayment.id,
      loan_id: dbPayment.loan_id,
      amount: dbPayment.amount,
      payment_type: dbPayment.payment_type,
      principal_amount: dbPayment.principal_amount,
      interest_amount: dbPayment.interest_amount,
      payment_date: dbPayment.payment_date,
      created_at: dbPayment.created_at,
    }))
  },

  async getLastPaymentByLoan(loanId: string): Promise<Payment | null> {
    const dbPayment = await dbGetLastPaymentByLoan(loanId)
    if (!dbPayment) return null

    // Transform database type to API type
    return {
      id: dbPayment.id,
      loan_id: dbPayment.loan_id,
      amount: dbPayment.amount,
      payment_type: dbPayment.payment_type,
      principal_amount: dbPayment.principal_amount,
      interest_amount: dbPayment.interest_amount,
      payment_date: dbPayment.payment_date,
      created_at: dbPayment.created_at,
    }
  },

  async getLastPaymentsByLoans(loanIds: string[]): Promise<Map<string, Payment>> {
    const dbPaymentsMap = await dbGetLastPaymentsByLoans(loanIds)
    const apiPaymentsMap = new Map<string, Payment>()

    for (const [loanId, dbPayment] of dbPaymentsMap) {
      if (dbPayment) {
        apiPaymentsMap.set(loanId, {
          id: dbPayment.id,
          loan_id: dbPayment.loan_id,
          amount: dbPayment.amount,
          payment_type: dbPayment.payment_type,
          principal_amount: dbPayment.principal_amount,
          interest_amount: dbPayment.interest_amount,
          payment_date: dbPayment.payment_date,
          created_at: dbPayment.created_at,
        })
      }
    }

    return apiPaymentsMap
  },

  async createPayment(data: CreatePaymentData): Promise<Payment> {
    const loan = await getLoan(data.loan_id)
    if (!loan) {
      throw new Error('Loan not found')
    }

    const totalAmount = data.principal_amount + data.interest_amount
    const newBalance = loan.current_balance - data.principal_amount

    const paymentData = {
      loan_id: data.loan_id,
      amount: totalAmount,
      payment_date: data.payment_date,
      principal_amount: data.principal_amount,
      interest_amount: data.interest_amount,
      payment_type: (data.principal_amount > 0 && data.interest_amount > 0
        ? 'mixed'
        : data.principal_amount > 0
          ? 'principal'
          : 'interest') as Payment['payment_type'],
    }

    const dbPayment = await dbCreatePayment(paymentData)
    await updateLoanBalance(data.loan_id, Math.max(0, newBalance))

    if (newBalance <= 0.005) {
      await updateLoanStatus(data.loan_id, 'paid_off')
    }

    // Transform database type to API type
    return {
      id: dbPayment.id,
      loan_id: dbPayment.loan_id,
      amount: dbPayment.amount,
      payment_type: dbPayment.payment_type,
      principal_amount: dbPayment.principal_amount,
      interest_amount: dbPayment.interest_amount,
      payment_date: dbPayment.payment_date,
      created_at: dbPayment.created_at,
    }
  },

  async updatePayment(
    id: string,
    data: UpdatePaymentData,
    originalPayment: Payment
  ): Promise<void> {
    const oldLoan = await getLoan(originalPayment.loan_id)
    const newLoan = data.loan_id ? await getLoan(data.loan_id) : oldLoan

    if (!oldLoan || !newLoan) {
      throw new Error('Loan not found')
    }

    const newPrincipalAmount = data.principal_amount ?? originalPayment.principal_amount
    const newInterestAmount = data.interest_amount ?? originalPayment.interest_amount
    const totalAmount = newPrincipalAmount + newInterestAmount

    const updateData: UpdatePaymentData = {
      ...data,
      amount: totalAmount,
      payment_type:
        newPrincipalAmount > 0 && newInterestAmount > 0
          ? 'mixed'
          : newPrincipalAmount > 0
            ? 'principal'
            : 'interest',
    }

    await dbUpdatePayment(id, updateData)

    // Recalculate loan balances
    if (originalPayment.loan_id === (data.loan_id ?? originalPayment.loan_id)) {
      // Same loan - adjust balance by the difference
      const balanceDifference = newPrincipalAmount - originalPayment.principal_amount
      const newBalance = oldLoan.current_balance - balanceDifference
      await updateLoanBalance(data.loan_id ?? originalPayment.loan_id, Math.max(0, newBalance))
    } else {
      // Different loans - restore old loan balance and reduce new loan balance
      const oldLoanNewBalance = oldLoan.current_balance + originalPayment.principal_amount
      await updateLoanBalance(originalPayment.loan_id, oldLoanNewBalance)

      const newLoanNewBalance = newLoan.current_balance - newPrincipalAmount
      await updateLoanBalance(data.loan_id!, Math.max(0, newLoanNewBalance))
    }
  },

  async deletePayment(id: string, payment: Payment): Promise<void> {
    const loan = await getLoan(payment.loan_id)
    if (!loan) {
      throw new Error('Loan not found')
    }

    // Restore the principal amount to the loan balance
    const newBalance = loan.current_balance + payment.principal_amount
    await updateLoanBalance(payment.loan_id, newBalance)

    await dbDeletePayment(id)
  },
}

export const paymentKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (filters: string) => [...paymentKeys.lists(), { filters }] as const,
  byLoan: (loanId: string) => [...paymentKeys.all, 'byLoan', loanId] as const,
  lastByLoan: (loanId: string) => [...paymentKeys.all, 'lastByLoan', loanId] as const,
  lastByLoans: (loanIds: string[]) => [...paymentKeys.all, 'lastByLoans', { loanIds }] as const,
}
