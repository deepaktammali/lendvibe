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
} from '@/lib/database';
import type { Payment } from '@/types/database';
import type { CreatePayment } from '@/types/api/payments';

export type CreatePaymentData = CreatePayment.Payload;
export type UpdatePaymentData = {
  loan_id?: string;
  amount?: number;
  payment_type?: Payment['payment_type'];
  principal_amount?: number;
  interest_amount?: number;
  payment_date?: string;
};

export interface PaymentWithDetails extends Payment {
  borrower_name: string;
  loan_principal: number;
}

export const paymentService = {
  async getPayments(): Promise<Payment[]> {
    return await dbGetPayments();
  },

  async getPaymentsByLoan(loanId: string): Promise<Payment[]> {
    return await dbGetPaymentsByLoan(loanId);
  },

  async getLastPaymentByLoan(loanId: string): Promise<Payment | null> {
    return await dbGetLastPaymentByLoan(loanId);
  },

  async getLastPaymentsByLoans(loanIds: string[]): Promise<Map<string, Payment>> {
    return await dbGetLastPaymentsByLoans(loanIds);
  },

  async createPayment(data: CreatePaymentData): Promise<Payment> {
    const loan = await getLoan(data.loan_id);
    if (!loan) {
      throw new Error('Loan not found');
    }

    const totalAmount = data.principal_amount + data.interest_amount;
    const newBalance = loan.current_balance - data.principal_amount;

    const paymentData: Omit<Payment, 'id' | 'created_at'> = {
      loan_id: data.loan_id,
      amount: totalAmount,
      payment_date: data.payment_date,
      principal_amount: data.principal_amount,
      interest_amount: data.interest_amount,
      payment_type: data.principal_amount > 0 && data.interest_amount > 0
        ? 'mixed'
        : data.principal_amount > 0 ? 'principal' : 'interest',
    };

    const payment = await dbCreatePayment(paymentData);
    await updateLoanBalance(data.loan_id, Math.max(0, newBalance));

    if (newBalance <= 0.005) {
      await updateLoanStatus(data.loan_id, 'paid_off');
    }

    return payment;
  },

  async updatePayment(id: string, data: UpdatePaymentData, originalPayment: Payment): Promise<void> {
    const oldLoan = await getLoan(originalPayment.loan_id);
    const newLoan = data.loan_id ? await getLoan(data.loan_id) : oldLoan;

    if (!oldLoan || !newLoan) {
      throw new Error('Loan not found');
    }

    const newPrincipalAmount = data.principal_amount ?? originalPayment.principal_amount;
    const newInterestAmount = data.interest_amount ?? originalPayment.interest_amount;
    const totalAmount = newPrincipalAmount + newInterestAmount;

    const updateData: UpdatePaymentData = {
      ...data,
      amount: totalAmount,
      payment_type: newPrincipalAmount > 0 && newInterestAmount > 0
        ? 'mixed'
        : newPrincipalAmount > 0 ? 'principal' : 'interest',
    };

    await dbUpdatePayment(id, updateData);

    // Recalculate loan balances
    if (originalPayment.loan_id === (data.loan_id ?? originalPayment.loan_id)) {
      // Same loan - adjust balance by the difference
      const balanceDifference = newPrincipalAmount - originalPayment.principal_amount;
      const newBalance = oldLoan.current_balance - balanceDifference;
      await updateLoanBalance(data.loan_id ?? originalPayment.loan_id, Math.max(0, newBalance));
    } else {
      // Different loans - restore old loan balance and reduce new loan balance
      const oldLoanNewBalance = oldLoan.current_balance + originalPayment.principal_amount;
      await updateLoanBalance(originalPayment.loan_id, oldLoanNewBalance);

      const newLoanNewBalance = newLoan.current_balance - newPrincipalAmount;
      await updateLoanBalance(data.loan_id!, Math.max(0, newLoanNewBalance));
    }
  },

  async deletePayment(id: string, payment: Payment): Promise<void> {
    const loan = await getLoan(payment.loan_id);
    if (!loan) {
      throw new Error('Loan not found');
    }

    // Restore the principal amount to the loan balance
    const newBalance = loan.current_balance + payment.principal_amount;
    await updateLoanBalance(payment.loan_id, newBalance);

    await dbDeletePayment(id);
  },
};

export const paymentKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (filters: string) => [...paymentKeys.lists(), { filters }] as const,
  byLoan: (loanId: string) => [...paymentKeys.all, 'byLoan', loanId] as const,
  lastByLoan: (loanId: string) => [...paymentKeys.all, 'lastByLoan', loanId] as const,
  lastByLoans: (loanIds: string[]) => [...paymentKeys.all, 'lastByLoans', { loanIds }] as const,
};
