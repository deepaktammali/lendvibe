import {
  getLoans as dbGetLoans,
  getLoan as dbGetLoan,
  createLoan as dbCreateLoan,
  updateLoanBalance as dbUpdateLoanBalance,
  updateLoanStatus as dbUpdateLoanStatus,
  deleteLoan as dbDeleteLoan,
  getLoansByBorrower as dbGetLoansByBorrower,
  getLoansWithBorrowers as dbGetLoansWithBorrowers,
  getLoansWithCalculatedBalances as dbGetLoansWithCalculatedBalances,
  getRealRemainingPrincipal as dbGetRealRemainingPrincipal,
  syncAllLoanBalances as dbSyncAllLoanBalances,
} from '@/lib/database';
import type { Loan } from '@/types/database';
import type { CreateLoan } from '@/types/api/loans';

export type CreateLoanData = CreateLoan.Payload;

export interface LoanWithBorrower extends Loan {
  borrower_name: string;
}

export interface LoanWithCalculatedBalance extends Loan {
  borrower_name: string;
  real_remaining_principal: number;
}

export const loanService = {
  async getLoans(): Promise<Loan[]> {
    return await dbGetLoans();
  },

  async getLoan(id: string): Promise<Loan | null> {
    return await dbGetLoan(id);
  },

  async getLoansByBorrower(borrowerId: string): Promise<Loan[]> {
    return await dbGetLoansByBorrower(borrowerId);
  },

  async getLoansWithBorrowers(): Promise<LoanWithBorrower[]> {
    return await dbGetLoansWithBorrowers();
  },

  async getLoansWithCalculatedBalances(): Promise<LoanWithCalculatedBalance[]> {
    return await dbGetLoansWithCalculatedBalances();
  },

  async getRealRemainingPrincipal(loanId: string): Promise<number> {
    return await dbGetRealRemainingPrincipal(loanId);
  },

  async createLoan(data: CreateLoanData): Promise<Loan> {
    const loanData: Omit<Loan, 'id' | 'created_at'> = {
      ...data,
      status: 'active',
      current_balance: data.principal_amount,
    };
    return await dbCreateLoan(loanData);
  },

  async updateLoanBalance(id: string, newBalance: number): Promise<void> {
    return await dbUpdateLoanBalance(id, newBalance);
  },

  async updateLoanStatus(id: string, status: Loan['status']): Promise<void> {
    return await dbUpdateLoanStatus(id, status);
  },

  async deleteLoan(id: string): Promise<void> {
    return await dbDeleteLoan(id);
  },

  async syncAllLoanBalances(): Promise<void> {
    return await dbSyncAllLoanBalances();
  },
};

export const loanKeys = {
  all: ['loans'] as const,
  lists: () => [...loanKeys.all, 'list'] as const,
  list: (filters: string) => [...loanKeys.lists(), { filters }] as const,
  details: () => [...loanKeys.all, 'detail'] as const,
  detail: (id: string) => [...loanKeys.details(), id] as const,
  byBorrower: (borrowerId: string) => [...loanKeys.all, 'byBorrower', borrowerId] as const,
  withBorrowers: () => [...loanKeys.all, 'withBorrowers'] as const,
  withCalculatedBalances: () => [...loanKeys.all, 'withCalculatedBalances'] as const,
  realRemainingPrincipal: (loanId: string) => [...loanKeys.all, 'realRemainingPrincipal', loanId] as const,
};
