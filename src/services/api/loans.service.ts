import {
  createLoan as dbCreateLoan,
  deleteLoan as dbDeleteLoan,
  getLoan as dbGetLoan,
  getLoans as dbGetLoans,
  getLoansByBorrower as dbGetLoansByBorrower,
  getLoansWithBorrowers as dbGetLoansWithBorrowers,
  getLoansWithCalculatedBalances as dbGetLoansWithCalculatedBalances,
  getLoanWithBorrower as dbGetLoanWithBorrower,
  getRealRemainingPrincipal as dbGetRealRemainingPrincipal,
  syncAllLoanBalances as dbSyncAllLoanBalances,
  updateLoan as dbUpdateLoan,
  updateLoanBalance as dbUpdateLoanBalance,
  updateLoanStatus as dbUpdateLoanStatus,
} from '@/lib/database'
import type {
  CreateLoan,
  Loan,
  LoanWithBorrower,
  LoanWithCalculatedBalance,
} from '@/types/api/loans'

export type CreateLoanData = CreateLoan.Payload

export interface LoanWithBorrowerDetail extends Loan {
  borrower: {
    id: string
    name: string
    email?: string
    phone: string
  }
}

export const loanService = {
  async getLoans(): Promise<Loan[]> {
    const dbLoans = await dbGetLoans()
    // Transform database types to API types
    return dbLoans.map((dbLoan) => ({
      id: dbLoan.id,
      borrower_id: dbLoan.borrower_id,
      loan_type: dbLoan.loan_type,
      principal_amount: dbLoan.principal_amount,
      interest_rate: dbLoan.interest_rate,
      start_date: dbLoan.start_date,
      end_date: dbLoan.end_date,
      status: dbLoan.status,
      current_balance: dbLoan.current_balance,
      repayment_interval_unit: dbLoan.repayment_interval_unit,
      repayment_interval_value: dbLoan.repayment_interval_value,
      created_at: dbLoan.created_at,
    }))
  },

  async getLoan(id: string): Promise<Loan | null> {
    const dbLoan = await dbGetLoan(id)
    if (!dbLoan) return null

    // Transform database type to API type
    return {
      id: dbLoan.id,
      borrower_id: dbLoan.borrower_id,
      loan_type: dbLoan.loan_type,
      principal_amount: dbLoan.principal_amount,
      interest_rate: dbLoan.interest_rate,
      start_date: dbLoan.start_date,
      end_date: dbLoan.end_date,
      status: dbLoan.status,
      current_balance: dbLoan.current_balance,
      repayment_interval_unit: dbLoan.repayment_interval_unit,
      repayment_interval_value: dbLoan.repayment_interval_value,
      created_at: dbLoan.created_at,
    }
  },

  async getLoanWithBorrower(id: string): Promise<LoanWithBorrowerDetail | null> {
    const dbLoan = await dbGetLoanWithBorrower(id)
    if (!dbLoan) return null

    return {
      id: dbLoan.id,
      borrower_id: dbLoan.borrower_id,
      loan_type: dbLoan.loan_type,
      principal_amount: dbLoan.principal_amount,
      interest_rate: dbLoan.interest_rate,
      start_date: dbLoan.start_date,
      end_date: dbLoan.end_date,
      status: dbLoan.status,
      current_balance: dbLoan.current_balance,
      repayment_interval_unit: dbLoan.repayment_interval_unit,
      repayment_interval_value: dbLoan.repayment_interval_value,
      created_at: dbLoan.created_at,
      borrower: {
        id: dbLoan.borrower_id,
        name: dbLoan.borrower_name,
        email: dbLoan.borrower_email,
        phone: dbLoan.borrower_phone,
      },
    }
  },

  async getLoansByBorrower(borrowerId: string): Promise<Loan[]> {
    const dbLoans = await dbGetLoansByBorrower(borrowerId)
    // Transform database types to API types
    return dbLoans.map((dbLoan) => ({
      id: dbLoan.id,
      borrower_id: dbLoan.borrower_id,
      loan_type: dbLoan.loan_type,
      principal_amount: dbLoan.principal_amount,
      interest_rate: dbLoan.interest_rate,
      start_date: dbLoan.start_date,
      end_date: dbLoan.end_date,
      status: dbLoan.status,
      current_balance: dbLoan.current_balance,
      repayment_interval_unit: dbLoan.repayment_interval_unit,
      repayment_interval_value: dbLoan.repayment_interval_value,
      created_at: dbLoan.created_at,
    }))
  },

  async getLoansWithBorrowers(): Promise<LoanWithBorrower[]> {
    const dbLoansWithBorrowers = await dbGetLoansWithBorrowers()
    // Transform database types to API types
    return dbLoansWithBorrowers.map((dbLoan) => ({
      id: dbLoan.id,
      borrower_id: dbLoan.borrower_id,
      loan_type: dbLoan.loan_type,
      principal_amount: dbLoan.principal_amount,
      interest_rate: dbLoan.interest_rate,
      start_date: dbLoan.start_date,
      end_date: dbLoan.end_date,
      status: dbLoan.status,
      current_balance: dbLoan.current_balance,
      repayment_interval_unit: dbLoan.repayment_interval_unit,
      repayment_interval_value: dbLoan.repayment_interval_value,
      created_at: dbLoan.created_at,
      borrower_name: dbLoan.borrower_name,
    }))
  },

  async getLoansWithCalculatedBalances(): Promise<LoanWithCalculatedBalance[]> {
    const dbLoansWithBalances = await dbGetLoansWithCalculatedBalances()
    // Transform database types to API types
    return dbLoansWithBalances.map((dbLoan) => ({
      id: dbLoan.id,
      borrower_id: dbLoan.borrower_id,
      loan_type: dbLoan.loan_type,
      principal_amount: dbLoan.principal_amount,
      interest_rate: dbLoan.interest_rate,
      start_date: dbLoan.start_date,
      end_date: dbLoan.end_date,
      status: dbLoan.status,
      current_balance: dbLoan.current_balance,
      repayment_interval_unit: dbLoan.repayment_interval_unit,
      repayment_interval_value: dbLoan.repayment_interval_value,
      created_at: dbLoan.created_at,
      borrower_name: dbLoan.borrower_name,
      real_remaining_principal: dbLoan.real_remaining_principal,
    }))
  },

  async getRealRemainingPrincipal(loanId: string): Promise<number> {
    return await dbGetRealRemainingPrincipal(loanId)
  },

  async createLoan(data: CreateLoanData): Promise<Loan> {
    const loanData = {
      ...data,
      status: 'active' as const,
      current_balance: data.principal_amount,
    }
    const dbLoan = await dbCreateLoan(loanData)

    // Transform database type to API type
    return {
      id: dbLoan.id,
      borrower_id: dbLoan.borrower_id,
      loan_type: dbLoan.loan_type,
      principal_amount: dbLoan.principal_amount,
      interest_rate: dbLoan.interest_rate,
      start_date: dbLoan.start_date,
      end_date: dbLoan.end_date,
      status: dbLoan.status,
      current_balance: dbLoan.current_balance,
      repayment_interval_unit: dbLoan.repayment_interval_unit,
      repayment_interval_value: dbLoan.repayment_interval_value,
      created_at: dbLoan.created_at,
    }
  },

  async updateLoanBalance(id: string, newBalance: number): Promise<void> {
    return await dbUpdateLoanBalance(id, newBalance)
  },

  async updateLoanStatus(id: string, status: Loan['status']): Promise<void> {
    return await dbUpdateLoanStatus(id, status)
  },

  async updateLoan(id: string, updates: Partial<Omit<Loan, 'id' | 'created_at'>>): Promise<void> {
    return await dbUpdateLoan(id, updates)
  },

  async deleteLoan(id: string): Promise<void> {
    return await dbDeleteLoan(id)
  },

  async syncAllLoanBalances(): Promise<void> {
    return await dbSyncAllLoanBalances()
  },
}
