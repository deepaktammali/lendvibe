import type { Payment } from './payments'
import type { Loan } from './loans'

// Dashboard-specific types
export interface PaymentWithBorrowerInfo extends Payment {
  borrower_name: string
  loan_principal: number
}

export interface LoanWithBorrowerAndDueDate extends Loan {
  borrower_name: string
  days_until_due: number
}

export interface RecentActivity {
  id: string
  type: 'borrower' | 'loan' | 'payment' | 'fixed_income'
  action: 'created' | 'updated' | 'deleted'
  entity_id: string
  entity_name: string
  timestamp: string
  details?: Record<string, any>
}

// Dashboard summary types
namespace GetDashboardSummary {
  export type Response = {
    totalBorrowers: number
    totalLoans: number
    totalPayments: number
    totalFixedIncomes: number
    activeLoans: number
    totalOutstandingBalance: number
    totalPaidAmount: number
    recentPayments: PaymentWithBorrowerInfo[]
    upcomingPayments: LoanWithBorrowerAndDueDate[]
  }
}

namespace GetDashboardStats {
  export type Response = {
    loanStats: {
      total: number
      active: number
      paid_off: number
      defaulted: number
    }
    paymentStats: {
      total: number
      thisMonth: number
      lastMonth: number
    }
    borrowerStats: {
      total: number
      newThisMonth: number
    }
    fixedIncomeStats: {
      total: number
      active: number
      totalIncome: number
    }
  }
}

namespace GetRecentActivity {
  export type Response = RecentActivity[]
}

// Export all types for easy importing
export type { GetDashboardStats, GetDashboardSummary, GetRecentActivity }
