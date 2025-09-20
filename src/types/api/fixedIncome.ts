export interface FixedIncome {
  id: string
  tenant_id: string // Reference to borrowers table (but conceptually they're tenants/lessees)
  income_type: 'land_lease' | 'rent_agreement' | 'fixed_deposit_income'
  principal_amount: number // The asset value or deposit amount
  income_rate: number // Annual rate for income calculation
  payment_interval_unit: 'days' | 'weeks' | 'months' | 'years'
  payment_interval_value: number
  start_date: string // YYYY-MM-DD format
  end_date?: string // Optional end date for fixed-term agreements
  status: 'active' | 'terminated' | 'expired'
  created_at: string
}

export interface IncomePayment {
  id: string
  fixed_income_id: string
  amount: number
  payment_date: string // YYYY-MM-DD format
  created_at: string
}

export interface FixedIncomeWithTenant extends FixedIncome {
  tenant_name: string
}

// Query Types
namespace GetFixedIncomes {
  export type Response = FixedIncome[]
  export type Request = {
    tenant_id?: string
    status?: FixedIncome['status']
    limit?: number
    offset?: number
  }
}

namespace GetFixedIncome {
  export type Response = FixedIncome | null
  export type Request = {
    id: string
  }
}

namespace GetFixedIncomesByTenant {
  export type Response = FixedIncome[]
  export type Request = {
    tenantId: string
  }
}

namespace GetFixedIncomesWithTenants {
  export type Response = FixedIncomeWithTenant[]
  export type Request = Record<string, never> // No request params
}

namespace CreateFixedIncome {
  export type Response = FixedIncome
  export type Request = {
    tenant_id: string
    income_type: FixedIncome['income_type']
    principal_amount: number
    income_rate: number
    payment_interval_unit: FixedIncome['payment_interval_unit']
    payment_interval_value: number
    start_date: string
    end_date?: string
  }
}

namespace UpdateFixedIncomeStatus {
  export type Response = void
  export type Request = {
    id: string
    status: FixedIncome['status']
  }
}

namespace DeleteFixedIncome {
  export type Response = void
  export type Request = {
    id: string
  }
}

// Income Payment Types
namespace GetIncomePayments {
  export type Response = IncomePayment[]
  export type Request = {
    fixed_income_id?: string
    limit?: number
    offset?: number
  }
}

namespace GetIncomePaymentsByFixedIncome {
  export type Response = IncomePayment[]
  export type Request = {
    fixedIncomeId: string
  }
}

namespace GetLastIncomePaymentByFixedIncome {
  export type Response = IncomePayment | null
  export type Request = {
    fixedIncomeId: string
  }
}

namespace GetLastIncomePaymentsByFixedIncomes {
  export type Response = Map<string, IncomePayment>
  export type Request = {
    fixedIncomeIds: string[]
  }
}

namespace CreateIncomePayment {
  export type Response = IncomePayment
  export type Request = {
    fixed_income_id: string
    amount: number
    payment_date: string
  }
}

namespace UpdateIncomePayment {
  export type Response = void
  export type Request = {
    id: string
    data: {
      fixed_income_id?: string
      amount?: number
      payment_date?: string
    }
  }
}

namespace DeleteIncomePayment {
  export type Response = void
  export type Request = {
    id: string
  }
}

// Export all types for easy importing
export type {
  GetFixedIncomes,
  GetFixedIncome,
  GetFixedIncomesByTenant,
  GetFixedIncomesWithTenants,
  CreateFixedIncome,
  UpdateFixedIncomeStatus,
  DeleteFixedIncome,
  GetIncomePayments,
  GetIncomePaymentsByFixedIncome,
  GetLastIncomePaymentByFixedIncome,
  GetLastIncomePaymentsByFixedIncomes,
  CreateIncomePayment,
  UpdateIncomePayment,
  DeleteIncomePayment,
}
