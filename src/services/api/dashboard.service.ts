import {
  getPayments as dbGetAllPayments,
  getBorrowers as dbGetBorrowers,
  getFixedIncomes as dbGetFixedIncomes,
  getLoans as dbGetLoans,
  getLoansWithCalculatedBalances as dbGetLoansWithCalculatedBalances,
} from '@/lib/database'
import type {
  FixedIncomeWithTenantAndDueDate,
  LoanWithBorrowerAndDueDate,
  PaymentWithBorrowerInfo,
  RecentActivity,
} from '@/types/api/dashboard'

export interface DashboardSummary {
  totalBorrowers: number
  totalLoans: number
  totalPayments: number
  totalFixedIncomes: number
  activeLoans: number
  totalOutstandingBalance: number
  totalPaidAmount: number
  recentPayments: PaymentWithBorrowerInfo[]
  upcomingPayments: LoanWithBorrowerAndDueDate[]
  upcomingFixedIncomePayments: FixedIncomeWithTenantAndDueDate[]
}

export interface DashboardStats {
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

export const dashboardService = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    const [borrowers, loans, payments, fixedIncomes, loansWithBalances] = await Promise.all([
      dbGetBorrowers(),
      dbGetLoans(),
      dbGetAllPayments(),
      dbGetFixedIncomes(),
      dbGetLoansWithCalculatedBalances(),
    ])

    // Calculate stats
    const totalBorrowers = borrowers.length
    const totalLoans = loans.length
    const totalPayments = payments.length
    const totalFixedIncomes = fixedIncomes.length
    const activeLoans = loans.filter((loan) => loan.status === 'active').length
    const totalOutstandingBalance = loansWithBalances.reduce(
      (sum, loan) => sum + loan.real_remaining_principal,
      0
    )
    const totalPaidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0)

    // Get recent payments (last 5)
    const recentPayments = payments
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
      .slice(0, 5)
      .map((payment) => ({
        ...payment,
        borrower_name: 'Unknown', // Would need to join with borrower data
        loan_principal: 0, // Would need to join with loan data
      }))

    // Get upcoming payments (loans with due dates in next 30 days)
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const upcomingPayments = loans
      .filter((loan) => {
        if (!loan.end_date) return false
        const endDate = new Date(loan.end_date)
        return endDate >= now && endDate <= thirtyDaysFromNow
      })
      .map((loan) => ({
        ...loan,
        borrower_name: 'Unknown', // Would need to join with borrower data
        days_until_due: Math.ceil(
          (new Date(loan.end_date || now.toISOString()).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        ),
      }))
      .slice(0, 5)

    // Get upcoming fixed income payments (fixed incomes with due dates in next 30 days)
    const upcomingFixedIncomePayments = fixedIncomes
      .filter((fixedIncome) => {
        if (!fixedIncome.end_date) return false
        const endDate = new Date(fixedIncome.end_date)
        return endDate >= now && endDate <= thirtyDaysFromNow
      })
      .map((fixedIncome) => ({
        ...fixedIncome,
        tenant_name: 'Unknown', // Would need to join with borrower data
        days_until_due: Math.ceil(
          (new Date(fixedIncome.end_date || now.toISOString()).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        ),
      }))
      .slice(0, 5)

    return {
      totalBorrowers,
      totalLoans,
      totalPayments,
      totalFixedIncomes,
      activeLoans,
      totalOutstandingBalance,
      totalPaidAmount,
      recentPayments,
      upcomingPayments,
      upcomingFixedIncomePayments,
    }
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const [loans, payments, borrowers, fixedIncomes] = await Promise.all([
      dbGetLoans(),
      dbGetAllPayments(),
      dbGetBorrowers(),
      dbGetFixedIncomes(),
    ])

    // Loan stats
    const loanStats = {
      total: loans.length,
      active: loans.filter((loan) => loan.status === 'active').length,
      paid_off: loans.filter((loan) => loan.status === 'paid_off').length,
      defaulted: loans.filter((loan) => loan.status === 'defaulted').length,
    }

    // Payment stats
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const paymentStats = {
      total: payments.length,
      thisMonth: payments.filter((payment) => new Date(payment.payment_date) >= thisMonth).length,
      lastMonth: payments.filter(
        (payment) =>
          new Date(payment.payment_date) >= lastMonth && new Date(payment.payment_date) < thisMonth
      ).length,
    }

    // Borrower stats
    const borrowerStats = {
      total: borrowers.length,
      newThisMonth: borrowers.filter((borrower) => new Date(borrower.created_at) >= thisMonth)
        .length,
    }

    // Fixed income stats
    const fixedIncomeStats = {
      total: fixedIncomes.length,
      active: fixedIncomes.filter((fi) => fi.status === 'active').length,
      totalIncome: fixedIncomes.reduce((sum, fi) => sum + fi.principal_amount, 0),
    }

    return {
      loanStats,
      paymentStats,
      borrowerStats,
      fixedIncomeStats,
    }
  },

  async getRecentActivity(): Promise<RecentActivity[]> {
    // This would typically come from an audit log or activity tracking system
    // For now, return empty array as this would require additional database schema
    return []
  },
}
