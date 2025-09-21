import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type CreateIncomePaymentData,
  incomePaymentService,
  type UpdateIncomePaymentData,
} from '@/services/api/incomePayments.service'
import type { FixedIncomePayment } from '@/types/api/payments'
import { dashboardKeys } from './useDashboard'
import { fixedIncomeKeys } from './useFixedIncome'

export const incomePaymentKeys = {
  all: ['incomePayments'] as const,
  lists: () => [...incomePaymentKeys.all, 'list'] as const,
  list: (filters: string) => [...incomePaymentKeys.lists(), { filters }] as const,
  byFixedIncome: (fixedIncomeId: string) => [...incomePaymentKeys.all, 'byFixedIncome', fixedIncomeId] as const,
  lastByFixedIncome: (fixedIncomeId: string) => [...incomePaymentKeys.all, 'lastByFixedIncome', fixedIncomeId] as const,
  lastByFixedIncomes: (fixedIncomeIds: string[]) => [...incomePaymentKeys.all, 'lastByFixedIncomes', { fixedIncomeIds }] as const,
}

export function useGetIncomePayments() {
  return useQuery({
    queryKey: incomePaymentKeys.lists(),
    queryFn: incomePaymentService.getIncomePayments,
  })
}

export function useGetIncomePaymentsWithDetails() {
  return useQuery({
    queryKey: [...incomePaymentKeys.lists(), 'withDetails'],
    queryFn: incomePaymentService.getIncomePayments,
  })
}

export function useGetIncomePaymentsByFixedIncome(fixedIncomeId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: incomePaymentKeys.byFixedIncome(fixedIncomeId),
    queryFn: () => incomePaymentService.getIncomePaymentsByFixedIncome(fixedIncomeId),
    enabled: enabled && !!fixedIncomeId,
  })
}

export function useGetLastIncomePaymentByFixedIncome(fixedIncomeId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: incomePaymentKeys.lastByFixedIncome(fixedIncomeId),
    queryFn: () => incomePaymentService.getLastIncomePaymentByFixedIncome(fixedIncomeId),
    enabled: enabled && !!fixedIncomeId,
  })
}

export function useGetLastIncomePaymentsByFixedIncomes(fixedIncomeIds: string[], enabled: boolean = true) {
  return useQuery({
    queryKey: incomePaymentKeys.lastByFixedIncomes(fixedIncomeIds),
    queryFn: () => incomePaymentService.getLastIncomePaymentsByFixedIncomes(fixedIncomeIds),
    enabled: enabled && fixedIncomeIds.length > 0,
  })
}

export function useCreateIncomePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateIncomePaymentData) => incomePaymentService.createIncomePayment(data),
    onSuccess: (newPayment, variables) => {
      // Update the income payments list
      queryClient.setQueryData<FixedIncomePayment[]>(incomePaymentKeys.lists(), (old) => {
        if (!old) return [newPayment]
        return [newPayment, ...old]
      })

      // Update payments for the specific fixed income
      queryClient.setQueryData<FixedIncomePayment[]>(incomePaymentKeys.byFixedIncome(variables.fixed_income_id), (old) => {
        if (!old) return [newPayment]
        return [newPayment, ...old]
      })

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: incomePaymentKeys.lists() })
      queryClient.invalidateQueries({ queryKey: incomePaymentKeys.byFixedIncome(variables.fixed_income_id) })
      queryClient.invalidateQueries({ queryKey: incomePaymentKeys.lastByFixedIncome(variables.fixed_income_id) })

      // Invalidate fixed income queries
      queryClient.invalidateQueries({ queryKey: fixedIncomeKeys.detail(variables.fixed_income_id) })
      queryClient.invalidateQueries({ queryKey: fixedIncomeKeys.lists() })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    },
    onError: (error) => {
      console.error('Failed to create income payment:', error)
    },
  })
}

export function useUpdateIncomePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
      originalPayment,
    }: {
      id: string
      data: UpdateIncomePaymentData
      originalPayment: FixedIncomePayment
    }) => incomePaymentService.updateIncomePayment(id, data, originalPayment),
    onSuccess: (_, { id, data, originalPayment }) => {
      // Update the specific payment in various caches
      const updatePaymentInCache = (old: FixedIncomePayment[] | undefined) => {
        if (!old) return old
        return old.map((payment) => (payment.id === id ? { ...payment, ...data } : payment))
      }

      queryClient.setQueryData<FixedIncomePayment[]>(incomePaymentKeys.lists(), updatePaymentInCache)
      queryClient.setQueryData<FixedIncomePayment[]>(
        incomePaymentKeys.byFixedIncome(originalPayment.fixed_income_id),
        updatePaymentInCache
      )

      if (data.fixed_income_id && data.fixed_income_id !== originalPayment.fixed_income_id) {
        queryClient.setQueryData<FixedIncomePayment[]>(incomePaymentKeys.byFixedIncome(data.fixed_income_id), updatePaymentInCache)
      }

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: incomePaymentKeys.all })
      queryClient.invalidateQueries({ queryKey: fixedIncomeKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    },
    onError: (error) => {
      console.error('Failed to update income payment:', error)
    },
  })
}

export function useDeleteIncomePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payment }: { id: string; payment: FixedIncomePayment }) =>
      incomePaymentService.deleteIncomePayment(id),
    onSuccess: (_, { id, payment }) => {
      // Remove from income payments list
      queryClient.setQueryData<FixedIncomePayment[]>(incomePaymentKeys.lists(), (old) => {
        if (!old) return old
        return old.filter((p) => p.id !== id)
      })

      // Remove from fixed income-specific payments
      queryClient.setQueryData<FixedIncomePayment[]>(incomePaymentKeys.byFixedIncome(payment.fixed_income_id), (old) => {
        if (!old) return old
        return old.filter((p) => p.id !== id)
      })

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: incomePaymentKeys.all })
      queryClient.invalidateQueries({ queryKey: fixedIncomeKeys.detail(payment.fixed_income_id) })
      queryClient.invalidateQueries({ queryKey: fixedIncomeKeys.lists() })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    },
    onError: (error) => {
      console.error('Failed to delete income payment:', error)
    },
  })
}