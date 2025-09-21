import {
  createIncomePayment as dbCreateIncomePayment,
  deleteIncomePayment as dbDeleteIncomePayment,
  getIncomePayments as dbGetIncomePayments,
  getIncomePaymentsByFixedIncome as dbGetIncomePaymentsByFixedIncome,
  getLastIncomePaymentByFixedIncome as dbGetLastIncomePaymentByFixedIncome,
  getLastIncomePaymentsByFixedIncomes as dbGetLastIncomePaymentsByFixedIncomes,
  updateIncomePayment as dbUpdateIncomePayment,
  getFixedIncome,
} from '@/lib/database'
import type { CreateFixedIncomePayment, FixedIncomePayment } from '@/types/api/payments'

export type CreateIncomePaymentData = CreateFixedIncomePayment.Payload
export type UpdateIncomePaymentData = {
  fixed_income_id?: string
  amount?: number
  payment_date?: string
  notes?: string
}

export interface IncomePaymentWithDetails extends FixedIncomePayment {
  tenant_name: string
  income_type: string
}

export const incomePaymentService = {
  async getIncomePayments(): Promise<IncomePaymentWithDetails[]> {
    const dbPayments = await dbGetIncomePayments()
    // Transform database types to API types with tenant information
    // Note: In a real implementation, this would join with tenant/fixed_income tables
    return dbPayments.map((dbPayment) => ({
      id: dbPayment.id,
      fixed_income_id: dbPayment.fixed_income_id,
      amount: dbPayment.amount,
      payment_date: dbPayment.payment_date,
      notes: dbPayment.notes || '',
      created_at: dbPayment.created_at,
      asset_type: 'fixed_income' as const,
      tenant_name: 'Unknown', // Would need to join with tenant data
      income_type: 'Unknown', // Would need to join with fixed income data
    }))
  },

  async getIncomePaymentsByFixedIncome(fixedIncomeId: string): Promise<FixedIncomePayment[]> {
    const dbPayments = await dbGetIncomePaymentsByFixedIncome(fixedIncomeId)
    return dbPayments.map((dbPayment) => ({
      id: dbPayment.id,
      fixed_income_id: dbPayment.fixed_income_id,
      amount: dbPayment.amount,
      payment_date: dbPayment.payment_date,
      notes: dbPayment.notes || '',
      created_at: dbPayment.created_at,
      asset_type: 'fixed_income' as const,
    }))
  },

  async getLastIncomePaymentByFixedIncome(
    fixedIncomeId: string
  ): Promise<FixedIncomePayment | null> {
    const dbPayment = await dbGetLastIncomePaymentByFixedIncome(fixedIncomeId)
    if (!dbPayment) return null

    return {
      id: dbPayment.id,
      fixed_income_id: dbPayment.fixed_income_id,
      amount: dbPayment.amount,
      payment_date: dbPayment.payment_date,
      notes: dbPayment.notes || '',
      created_at: dbPayment.created_at,
      asset_type: 'fixed_income' as const,
    }
  },

  async getLastIncomePaymentsByFixedIncomes(
    fixedIncomeIds: string[]
  ): Promise<Map<string, FixedIncomePayment>> {
    const dbPaymentsMap = await dbGetLastIncomePaymentsByFixedIncomes(fixedIncomeIds)
    const apiPaymentsMap = new Map<string, FixedIncomePayment>()

    for (const [fixedIncomeId, dbPayment] of dbPaymentsMap) {
      if (dbPayment) {
        apiPaymentsMap.set(fixedIncomeId, {
          id: dbPayment.id,
          fixed_income_id: dbPayment.fixed_income_id,
          amount: dbPayment.amount,
          payment_date: dbPayment.payment_date,
          notes: dbPayment.notes || '',
          created_at: dbPayment.created_at,
          asset_type: 'fixed_income' as const,
        })
      }
    }

    return apiPaymentsMap
  },

  async createIncomePayment(data: CreateIncomePaymentData): Promise<FixedIncomePayment> {
    const fixedIncome = await getFixedIncome(data.fixed_income_id)
    if (!fixedIncome) {
      throw new Error('Fixed income not found')
    }

    const paymentData = {
      fixed_income_id: data.fixed_income_id,
      amount: data.amount,
      payment_date: data.payment_date,
      notes: data.notes,
    }

    const dbPayment = await dbCreateIncomePayment(paymentData)

    return {
      id: dbPayment.id,
      fixed_income_id: dbPayment.fixed_income_id,
      amount: dbPayment.amount,
      payment_date: dbPayment.payment_date,
      notes: dbPayment.notes || '',
      created_at: dbPayment.created_at,
      asset_type: 'fixed_income' as const,
    }
  },

  async updateIncomePayment(
    id: string,
    data: UpdateIncomePaymentData,
    originalPayment: FixedIncomePayment
  ): Promise<void> {
    const fixedIncome = data.fixed_income_id
      ? await getFixedIncome(data.fixed_income_id)
      : await getFixedIncome(originalPayment.fixed_income_id)

    if (!fixedIncome) {
      throw new Error('Fixed income not found')
    }

    await dbUpdateIncomePayment(id, data)
  },

  async deleteIncomePayment(id: string): Promise<void> {
    await dbDeleteIncomePayment(id)
  },
}
