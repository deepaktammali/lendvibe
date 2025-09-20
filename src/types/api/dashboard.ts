import type { Loan, Payment } from '../database';

// Dashboard summary types
namespace GetDashboardSummary {
    export type Response = {
        totalBorrowers: number;
        totalLoans: number;
        totalPayments: number;
        totalFixedIncomes: number;
        activeLoans: number;
        totalOutstandingBalance: number;
        totalPaidAmount: number;
        recentPayments: Array<Payment & { borrower_name: string; loan_principal: number }>;
        upcomingPayments: Array<Loan & { borrower_name: string; days_until_due: number }>;
    };
}

namespace GetDashboardStats {
    export type Response = {
        loanStats: {
            total: number;
            active: number;
            paid_off: number;
            defaulted: number;
        };
        paymentStats: {
            total: number;
            thisMonth: number;
            lastMonth: number;
        };
        borrowerStats: {
            total: number;
            newThisMonth: number;
        };
        fixedIncomeStats: {
            total: number;
            active: number;
            totalIncome: number;
        };
    };
}

namespace GetRecentActivity {
    export type Response = Array<{
        id: string;
        type: 'borrower' | 'loan' | 'payment' | 'fixed_income';
        action: 'created' | 'updated' | 'deleted';
        entity_id: string;
        entity_name: string;
        timestamp: string;
        details?: Record<string, any>;
    }>;
}

// Export all types for easy importing
export type {
    GetDashboardStats, GetDashboardSummary, GetRecentActivity
};

