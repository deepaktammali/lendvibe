import {
  createFixedIncome as dbCreateFixedIncome,
  deleteFixedIncome as dbDeleteFixedIncome,
  getFixedIncome as dbGetFixedIncome,
  getFixedIncomes as dbGetFixedIncomes,
  getFixedIncomesByTenant as dbGetFixedIncomesByTenant,
  getFixedIncomesWithTenants as dbGetFixedIncomesWithTenants,
  updateFixedIncomeStatus as dbUpdateFixedIncomeStatus,
  createIncomePayment as dbCreateIncomePayment,
  deleteIncomePayment as dbDeleteIncomePayment,
  getIncomePayments as dbGetIncomePayments,
  getIncomePaymentsByFixedIncome as dbGetIncomePaymentsByFixedIncome,
  getLastIncomePaymentByFixedIncome as dbGetLastIncomePaymentByFixedIncome,
  getLastIncomePaymentsByFixedIncomes as dbGetLastIncomePaymentsByFixedIncomes,
  updateIncomePayment as dbUpdateIncomePayment,
} from '@/lib/database'
import type { FixedIncome, IncomePayment, FixedIncomeWithTenant } from '@/types/api/fixedIncome'

export interface CreateFixedIncomeData {
  tenant_id: string
  income_type: FixedIncome['income_type']
  principal_amount: number
  income_rate: number
  payment_interval_unit: FixedIncome['payment_interval_unit']
  payment_interval_value: number
  start_date: string
  end_date?: string
}

export interface UpdateFixedIncomeData {
  tenant_id?: string
  income_type?: FixedIncome['income_type']
  principal_amount?: number
  income_rate?: number
  payment_interval_unit?: FixedIncome['payment_interval_unit']
  payment_interval_value?: number
  start_date?: string
  end_date?: string
  status?: FixedIncome['status']
}

export interface CreateIncomePaymentData {
  fixed_income_id: string
  amount: number
  payment_date: string
}

export interface UpdateIncomePaymentData {
  fixed_income_id?: string
  amount?: number
  payment_date?: string
}

export const fixedIncomeService = {
  async getFixedIncomes(): Promise<FixedIncome[]> {
    const dbFixedIncomes = await dbGetFixedIncomes()
    // Transform database types to API types
    return dbFixedIncomes.map((dbFixedIncome) => ({
      id: dbFixedIncome.id,
      tenant_id: dbFixedIncome.tenant_id,
      income_type: dbFixedIncome.income_type,
      principal_amount: dbFixedIncome.principal_amount,
      income_rate: dbFixedIncome.income_rate,
      payment_interval_unit: dbFixedIncome.payment_interval_unit,
      payment_interval_value: dbFixedIncome.payment_interval_value,
      start_date: dbFixedIncome.start_date,
      end_date: dbFixedIncome.end_date,
      status: dbFixedIncome.status,
      created_at: dbFixedIncome.created_at,
    }))
  },

  async getFixedIncome(id: string): Promise<FixedIncome | null> {
    const dbFixedIncome = await dbGetFixedIncome(id)
    if (!dbFixedIncome) return null

    // Transform database type to API type
    return {
      id: dbFixedIncome.id,
      tenant_id: dbFixedIncome.tenant_id,
      income_type: dbFixedIncome.income_type,
      principal_amount: dbFixedIncome.principal_amount,
      income_rate: dbFixedIncome.income_rate,
      payment_interval_unit: dbFixedIncome.payment_interval_unit,
      payment_interval_value: dbFixedIncome.payment_interval_value,
      start_date: dbFixedIncome.start_date,
      end_date: dbFixedIncome.end_date,
      status: dbFixedIncome.status,
      created_at: dbFixedIncome.created_at,
    }
  },

  async getFixedIncomesByTenant(tenantId: string): Promise<FixedIncome[]> {
    const dbFixedIncomes = await dbGetFixedIncomesByTenant(tenantId)
    // Transform database types to API types
    return dbFixedIncomes.map((dbFixedIncome) => ({
      id: dbFixedIncome.id,
      tenant_id: dbFixedIncome.tenant_id,
      income_type: dbFixedIncome.income_type,
      principal_amount: dbFixedIncome.principal_amount,
      income_rate: dbFixedIncome.income_rate,
      payment_interval_unit: dbFixedIncome.payment_interval_unit,
      payment_interval_value: dbFixedIncome.payment_interval_value,
      start_date: dbFixedIncome.start_date,
      end_date: dbFixedIncome.end_date,
      status: dbFixedIncome.status,
      created_at: dbFixedIncome.created_at,
    }))
  },

  async getFixedIncomesWithTenants(): Promise<FixedIncomeWithTenant[]> {
    const dbFixedIncomesWithTenants = await dbGetFixedIncomesWithTenants()
    // Transform database types to API types
    return dbFixedIncomesWithTenants.map((dbFixedIncome) => ({
      id: dbFixedIncome.id,
      tenant_id: dbFixedIncome.tenant_id,
      income_type: dbFixedIncome.income_type,
      principal_amount: dbFixedIncome.principal_amount,
      income_rate: dbFixedIncome.income_rate,
      payment_interval_unit: dbFixedIncome.payment_interval_unit,
      payment_interval_value: dbFixedIncome.payment_interval_value,
      start_date: dbFixedIncome.start_date,
      end_date: dbFixedIncome.end_date,
      status: dbFixedIncome.status,
      created_at: dbFixedIncome.created_at,
      tenant_name: dbFixedIncome.tenant_name,
    }))
  },

  async createFixedIncome(data: CreateFixedIncomeData): Promise<FixedIncome> {
    const fixedIncomeData = {
      ...data,
      status: 'active' as const,
    }
    const dbFixedIncome = await dbCreateFixedIncome(fixedIncomeData)

    // Transform database type to API type
    return {
      id: dbFixedIncome.id,
      tenant_id: dbFixedIncome.tenant_id,
      income_type: dbFixedIncome.income_type,
      principal_amount: dbFixedIncome.principal_amount,
      income_rate: dbFixedIncome.income_rate,
      payment_interval_unit: dbFixedIncome.payment_interval_unit,
      payment_interval_value: dbFixedIncome.payment_interval_value,
      start_date: dbFixedIncome.start_date,
      end_date: dbFixedIncome.end_date,
      status: dbFixedIncome.status,
      created_at: dbFixedIncome.created_at,
    }
  },

  async updateFixedIncomeStatus(id: string, status: FixedIncome['status']): Promise<void> {
    return await dbUpdateFixedIncomeStatus(id, status)
  },

  async deleteFixedIncome(id: string): Promise<void> {
    return await dbDeleteFixedIncome(id)
  },

  // Income Payment operations
  async getIncomePayments(): Promise<IncomePayment[]> {
    const dbIncomePayments = await dbGetIncomePayments()
    // Transform database types to API types
    return dbIncomePayments.map((dbPayment) => ({
      id: dbPayment.id,
      fixed_income_id: dbPayment.fixed_income_id,
      amount: dbPayment.amount,
      payment_date: dbPayment.payment_date,
      created_at: dbPayment.created_at,
    }))
  },

  async getIncomePaymentsByFixedIncome(fixedIncomeId: string): Promise<IncomePayment[]> {
    const dbIncomePayments = await dbGetIncomePaymentsByFixedIncome(fixedIncomeId)
    // Transform database types to API types
    return dbIncomePayments.map((dbPayment) => ({
      id: dbPayment.id,
      fixed_income_id: dbPayment.fixed_income_id,
      amount: dbPayment.amount,
      payment_date: dbPayment.payment_date,
      created_at: dbPayment.created_at,
    }))
  },

  async getLastIncomePaymentByFixedIncome(fixedIncomeId: string): Promise<IncomePayment | null> {
    const dbPayment = await dbGetLastIncomePaymentByFixedIncome(fixedIncomeId)
    if (!dbPayment) return null

    // Transform database type to API type
    return {
      id: dbPayment.id,
      fixed_income_id: dbPayment.fixed_income_id,
      amount: dbPayment.amount,
      payment_date: dbPayment.payment_date,
      created_at: dbPayment.created_at,
    }
  },

  async getLastIncomePaymentsByFixedIncomes(
    fixedIncomeIds: string[]
  ): Promise<Map<string, IncomePayment>> {
    const dbPaymentsMap = await dbGetLastIncomePaymentsByFixedIncomes(fixedIncomeIds)
    const apiPaymentsMap = new Map<string, IncomePayment>()

    for (const [fixedIncomeId, dbPayment] of dbPaymentsMap) {
      if (dbPayment) {
        apiPaymentsMap.set(fixedIncomeId, {
          id: dbPayment.id,
          fixed_income_id: dbPayment.fixed_income_id,
          amount: dbPayment.amount,
          payment_date: dbPayment.payment_date,
          created_at: dbPayment.created_at,
        })
      }
    }

    return apiPaymentsMap
  },

  async createIncomePayment(data: CreateIncomePaymentData): Promise<IncomePayment> {
    const paymentData = {
      fixed_income_id: data.fixed_income_id,
      amount: data.amount,
      payment_date: data.payment_date,
    }
    const dbPayment = await dbCreateIncomePayment(paymentData)

    // Transform database type to API type
    return {
      id: dbPayment.id,
      fixed_income_id: dbPayment.fixed_income_id,
      amount: dbPayment.amount,
      payment_date: dbPayment.payment_date,
      created_at: dbPayment.created_at,
    }
  },

  async updateIncomePayment(id: string, data: UpdateIncomePaymentData): Promise<void> {
    return await dbUpdateIncomePayment(id, data)
  },

  async deleteIncomePayment(id: string): Promise<void> {
    return await dbDeleteIncomePayment(id)
  },
}

export const fixedIncomeKeys = {
  all: ['fixedIncomes'] as const,
  lists: () => [...fixedIncomeKeys.all, 'list'] as const,
  list: (filters: string) => [...fixedIncomeKeys.lists(), { filters }] as const,
  details: () => [...fixedIncomeKeys.all, 'detail'] as const,
  detail: (id: string) => [...fixedIncomeKeys.details(), id] as const,
  byTenant: (tenantId: string) => [...fixedIncomeKeys.all, 'byTenant', tenantId] as const,
  withTenants: () => [...fixedIncomeKeys.all, 'withTenants'] as const,

  // Income payment keys
  incomePayments: {
    all: ['incomePayments'] as const,
    lists: () => [...fixedIncomeKeys.incomePayments.all, 'list'] as const,
    list: (filters: string) => [...fixedIncomeKeys.incomePayments.lists(), { filters }] as const,
    byFixedIncome: (fixedIncomeId: string) =>
      [...fixedIncomeKeys.incomePayments.all, 'byFixedIncome', fixedIncomeId] as const,
    lastByFixedIncome: (fixedIncomeId: string) =>
      [...fixedIncomeKeys.incomePayments.all, 'lastByFixedIncome', fixedIncomeId] as const,
    lastByFixedIncomes: (fixedIncomeIds: string[]) =>
      [...fixedIncomeKeys.incomePayments.all, 'lastByFixedIncomes', { fixedIncomeIds }] as const,
  },
}
