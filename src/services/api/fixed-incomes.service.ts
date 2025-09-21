import {
  createFixedIncome as dbCreateFixedIncome,
  createIncomePayment as dbCreateIncomePayment,
  deleteFixedIncome as dbDeleteFixedIncome,
  deleteIncomePayment as dbDeleteIncomePayment,
  getFixedIncome as dbGetFixedIncome,
  getFixedIncomes as dbGetFixedIncomes,
  getFixedIncomesByTenant as dbGetFixedIncomesByTenant,
  getFixedIncomesWithTenants as dbGetFixedIncomesWithTenants,
  getIncomePayments as dbGetIncomePayments,
  getIncomePaymentsByFixedIncome as dbGetIncomePaymentsByFixedIncome,
  getLastIncomePaymentByFixedIncome as dbGetLastIncomePaymentByFixedIncome,
  getLastIncomePaymentsByFixedIncomes as dbGetLastIncomePaymentsByFixedIncomes,
  updateFixedIncome as dbUpdateFixedIncome,
  updateFixedIncomeStatus as dbUpdateFixedIncomeStatus,
  updateIncomePayment as dbUpdateIncomePayment,
} from '@/lib/database'
import type { FixedIncome, FixedIncomeWithTenant, IncomePayment } from '@/types/api/fixedIncome'

export interface CreateFixedIncomeData {
  label?: string
  payer_id?: string
  amount: number
  payment_interval_unit: FixedIncome['payment_interval_unit']
  payment_interval_value: number
  start_date: string
  end_date?: string
}

export interface UpdateFixedIncomeData {
  label?: string
  payer_id?: string
  amount?: number
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
  notes?: string
}

export interface UpdateIncomePaymentData {
  fixed_income_id?: string
  amount?: number
  payment_date?: string
  notes?: string
}

export const fixedIncomeService = {
  async getFixedIncomes(): Promise<FixedIncome[]> {
    const dbFixedIncomes = await dbGetFixedIncomes()
    // Transform database types to API types
    return dbFixedIncomes.map((dbFixedIncome) => ({
      id: dbFixedIncome.id,
      label: dbFixedIncome.label,
      payer_id: dbFixedIncome.payer_id,
      amount: dbFixedIncome.amount,
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
      label: dbFixedIncome.label,
      payer_id: dbFixedIncome.payer_id,
      amount: dbFixedIncome.amount,
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
      label: dbFixedIncome.label,
      payer_id: dbFixedIncome.payer_id,
      amount: dbFixedIncome.amount,
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
      label: dbFixedIncome.label,
      payer_id: dbFixedIncome.payer_id,
      amount: dbFixedIncome.amount,
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
      // Set default values for legacy fields
      tenant_id: data.payer_id, // Map payer_id to tenant_id for legacy compatibility
      income_type: 'land_lease' as const,
      principal_amount: data.amount,
      income_rate: 0,
      status: 'active' as const,
    }
    const dbFixedIncome = await dbCreateFixedIncome(fixedIncomeData)

    // Transform database type to API type
    return {
      id: dbFixedIncome.id,
      label: dbFixedIncome.label,
      payer_id: dbFixedIncome.payer_id,
      amount: dbFixedIncome.amount,
      payment_interval_unit: dbFixedIncome.payment_interval_unit,
      payment_interval_value: dbFixedIncome.payment_interval_value,
      start_date: dbFixedIncome.start_date,
      end_date: dbFixedIncome.end_date,
      status: dbFixedIncome.status,
      created_at: dbFixedIncome.created_at,
    }
  },

  async updateFixedIncome(id: string, data: UpdateFixedIncomeData): Promise<void> {
    return await dbUpdateFixedIncome(id, data)
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
      notes: dbPayment.notes,
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
      notes: dbPayment.notes,
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
      notes: dbPayment.notes,
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
          notes: dbPayment.notes,
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
      notes: data.notes,
    }
    const dbPayment = await dbCreateIncomePayment(paymentData)

    // Transform database type to API type
    return {
      id: dbPayment.id,
      fixed_income_id: dbPayment.fixed_income_id,
      amount: dbPayment.amount,
      payment_date: dbPayment.payment_date,
      notes: dbPayment.notes,
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
