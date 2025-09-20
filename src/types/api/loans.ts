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
  created_at: string
}

export interface LoanWithBorrower extends Loan {
  borrower_name: string
}

export interface LoanWithCalculatedBalance extends Loan {
  borrower_name: string
  real_remaining_principal: number
}

// Query Types
namespace GetLoans {
  export type Response = Loan[]
  export type Query = {
    borrower_id?: string
    status?: Loan['status']
    limit?: number
    offset?: number
  }
}

namespace GetLoan {
  export type Response = Loan | null
}

namespace GetLoansByBorrower {
  export type Response = Loan[]
  export type Query = {
    borrowerId: string
  }
}

namespace GetLoansWithBorrowers {
  export type Response = LoanWithBorrower[]
}

namespace GetLoansWithCalculatedBalances {
  export type Response = LoanWithCalculatedBalance[]
}

namespace GetRealRemainingPrincipal {
  export type Response = number
}

namespace CreateLoan {
  export type Response = Loan
  export type Payload = {
    borrower_id: string
    loan_type: Loan['loan_type']
    principal_amount: number
    interest_rate: number
    start_date: string
    repayment_interval_unit?: Loan['repayment_interval_unit']
    repayment_interval_value?: number
    end_date?: string
  }
}

namespace UpdateLoanBalance {
  export type Response = undefined
  export type Payload = {
    newBalance: number
  } // ID is part of URL path
}

namespace UpdateLoanStatus {
  export type Response = undefined
  export type Payload = {
    status: Loan['status']
  } // ID is part of URL path
}

namespace DeleteLoan {
  export type Response = undefined
}

namespace SyncAllLoanBalances {
  export type Response = undefined
}

// Export all types for easy importing
export type {
  GetLoans,
  GetLoan,
  GetLoansByBorrower,
  GetLoansWithBorrowers,
  GetLoansWithCalculatedBalances,
  GetRealRemainingPrincipal,
  CreateLoan,
  UpdateLoanBalance,
  UpdateLoanStatus,
  DeleteLoan,
  SyncAllLoanBalances,
}
