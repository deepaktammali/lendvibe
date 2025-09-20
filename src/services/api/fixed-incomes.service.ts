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
} from '@/lib/database';
import type { FixedIncome, IncomePayment } from '@/types/database';

export interface CreateFixedIncomeData {
  tenant_id: string;
  income_type: FixedIncome['income_type'];
  principal_amount: number;
  income_rate: number;
  payment_interval_unit: FixedIncome['payment_interval_unit'];
  payment_interval_value: number;
  start_date: string;
  end_date?: string;
}

export interface UpdateFixedIncomeData {
  tenant_id?: string;
  income_type?: FixedIncome['income_type'];
  principal_amount?: number;
  income_rate?: number;
  payment_interval_unit?: FixedIncome['payment_interval_unit'];
  payment_interval_value?: number;
  start_date?: string;
  end_date?: string;
  status?: FixedIncome['status'];
}

export interface FixedIncomeWithTenant extends FixedIncome {
  tenant_name: string;
}

export interface CreateIncomePaymentData {
  fixed_income_id: string;
  amount: number;
  payment_date: string;
}

export interface UpdateIncomePaymentData {
  fixed_income_id?: string;
  amount?: number;
  payment_date?: string;
}

export const fixedIncomeService = {
  async getFixedIncomes(): Promise<FixedIncome[]> {
    return await dbGetFixedIncomes();
  },

  async getFixedIncome(id: string): Promise<FixedIncome | null> {
    return await dbGetFixedIncome(id);
  },

  async getFixedIncomesByTenant(tenantId: string): Promise<FixedIncome[]> {
    return await dbGetFixedIncomesByTenant(tenantId);
  },

  async getFixedIncomesWithTenants(): Promise<FixedIncomeWithTenant[]> {
    return await dbGetFixedIncomesWithTenants();
  },

  async createFixedIncome(data: CreateFixedIncomeData): Promise<FixedIncome> {
    const fixedIncomeData: Omit<FixedIncome, 'id' | 'created_at'> = {
      ...data,
      status: 'active',
    };
    return await dbCreateFixedIncome(fixedIncomeData);
  },

  async updateFixedIncomeStatus(id: string, status: FixedIncome['status']): Promise<void> {
    return await dbUpdateFixedIncomeStatus(id, status);
  },

  async deleteFixedIncome(id: string): Promise<void> {
    return await dbDeleteFixedIncome(id);
  },

  // Income Payment operations
  async getIncomePayments(): Promise<IncomePayment[]> {
    return await dbGetIncomePayments();
  },

  async getIncomePaymentsByFixedIncome(fixedIncomeId: string): Promise<IncomePayment[]> {
    return await dbGetIncomePaymentsByFixedIncome(fixedIncomeId);
  },

  async getLastIncomePaymentByFixedIncome(fixedIncomeId: string): Promise<IncomePayment | null> {
    return await dbGetLastIncomePaymentByFixedIncome(fixedIncomeId);
  },

  async getLastIncomePaymentsByFixedIncomes(fixedIncomeIds: string[]): Promise<Map<string, IncomePayment>> {
    return await dbGetLastIncomePaymentsByFixedIncomes(fixedIncomeIds);
  },

  async createIncomePayment(data: CreateIncomePaymentData): Promise<IncomePayment> {
    const paymentData: Omit<IncomePayment, 'id' | 'created_at'> = {
      fixed_income_id: data.fixed_income_id,
      amount: data.amount,
      payment_date: data.payment_date,
    };
    return await dbCreateIncomePayment(paymentData);
  },

  async updateIncomePayment(id: string, data: UpdateIncomePaymentData): Promise<void> {
    return await dbUpdateIncomePayment(id, data);
  },

  async deleteIncomePayment(id: string): Promise<void> {
    return await dbDeleteIncomePayment(id);
  },
};

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
    byFixedIncome: (fixedIncomeId: string) => [...fixedIncomeKeys.incomePayments.all, 'byFixedIncome', fixedIncomeId] as const,
    lastByFixedIncome: (fixedIncomeId: string) => [...fixedIncomeKeys.incomePayments.all, 'lastByFixedIncome', fixedIncomeId] as const,
    lastByFixedIncomes: (fixedIncomeIds: string[]) => [...fixedIncomeKeys.incomePayments.all, 'lastByFixedIncomes', { fixedIncomeIds }] as const,
  },
};
