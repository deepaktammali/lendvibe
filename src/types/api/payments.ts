// API Types - separate from database types
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

// Extended types for future fixed income support
export interface LoanPayment extends Payment {
  asset_type: 'loan'
}

export interface FixedIncomePayment {
  id: string
  fixed_income_id: string
  amount: number
  payment_date: string // YYYY-MM-DD format
  notes?: string
  created_at: string
  asset_type: 'fixed_income'
}

// Union type for all payments (for future use)
export type AllPayments = LoanPayment | FixedIncomePayment

// Query Types
namespace GetPayments {
  export type Response = Payment[]
  export type Query = {
    loan_id?: string
    limit?: number
    offset?: number
  }
}

namespace GetPaymentsByLoan {
  export type Response = Payment[]
  export type Query = {
    loanId: string
  }
}

namespace GetLastPaymentByLoan {
  export type Response = Payment | null
  export type Query = {
    loanId: string
  }
}

namespace GetLastPaymentsByLoans {
  export type Response = Map<string, Payment>
  export type Query = {
    loanIds: string[]
  }
}

namespace CreateLoanPayment {
  export type Response = LoanPayment
  export type Payload = {
    payment_schedule_id?: string // Optional - if not provided, will find/create appropriate schedule
    loan_id: string // Still needed to find/create payment schedule
    principal_amount: number
    interest_amount: number
    payment_date: string
    notes?: string
  }
}

namespace CreateFixedIncomePayment {
  export type Response = FixedIncomePayment
  export type Payload = {
    fixed_income_id: string
    amount: number
    payment_date: string
    notes?: string
  }
}

// Legacy namespace for backward compatibility
namespace CreatePayment {
  export type Response = LoanPayment
  export type Payload = {
    loan_id: string
    payment_schedule_id: string
    principal_amount: number
    interest_amount: number
    payment_date: string
    notes?: string
  }
}

namespace UpdateLoanPayment {
  export type Response = undefined
  export type Payload = {
    id: string
    data: {
      payment_schedule_id?: string
      amount?: number
      payment_type?: LoanPayment['payment_type']
      principal_amount?: number
      interest_amount?: number
      payment_date?: string
      notes?: string
    }
    originalPayment: LoanPayment
  }
}

namespace UpdateFixedIncomePayment {
  export type Response = undefined
  export type Payload = {
    id: string
    data: {
      fixed_income_id?: string
      amount?: number
      payment_date?: string
      notes?: string
    }
    originalPayment: FixedIncomePayment
  }
}

// Legacy namespace for backward compatibility
namespace UpdatePayment {
  export type Response = undefined
  export type Payload = {
    id: string
    data: {
      payment_schedule_id?: string
      amount?: number
      payment_type?: LoanPayment['payment_type']
      principal_amount?: number
      interest_amount?: number
      payment_date?: string
      notes?: string
    }
    originalPayment: LoanPayment
  }
}

namespace DeletePayment {
  export type Response = undefined
  export type Payload = {
    id: string
    payment: Payment
  }
}

// Export all types for easy importing
export type {
  GetPayments,
  GetPaymentsByLoan,
  GetLastPaymentByLoan,
  GetLastPaymentsByLoans,
  CreateLoanPayment,
  CreateFixedIncomePayment,
  CreatePayment,
  UpdateLoanPayment,
  UpdateFixedIncomePayment,
  UpdatePayment,
  DeletePayment,
}
