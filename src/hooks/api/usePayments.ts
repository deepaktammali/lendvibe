import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type CreatePaymentData,
  paymentService,
  type UpdatePaymentData,
} from '@/services/api/payments.service'
import type { Payment } from '@/types/api/payments'
import { dashboardKeys } from './useDashboard'
import { loanKeys } from './useLoans'

export const paymentKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (filters: string) => [...paymentKeys.lists(), { filters }] as const,
  byLoan: (loanId: string) => [...paymentKeys.all, 'byLoan', loanId] as const,
  lastByLoan: (loanId: string) => [...paymentKeys.all, 'lastByLoan', loanId] as const,
  lastByLoans: (loanIds: string[]) => [...paymentKeys.all, 'lastByLoans', { loanIds }] as const,
}

export function useGetPayments() {
  return useQuery({
    queryKey: paymentKeys.lists(),
    queryFn: paymentService.getPayments,
  })
}

export function useGetPaymentsWithDetails() {
  return useQuery({
    queryKey: [...paymentKeys.lists(), 'withDetails'],
    queryFn: paymentService.getPayments,
  })
}

export function useGetPaymentsByLoan(loanId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: paymentKeys.byLoan(loanId),
    queryFn: () => paymentService.getPaymentsByLoan(loanId),
    enabled: enabled && !!loanId,
  })
}

export function useGetLastPaymentByLoan(loanId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: paymentKeys.lastByLoan(loanId),
    queryFn: () => paymentService.getLastPaymentByLoan(loanId),
    enabled: enabled && !!loanId,
  })
}

export function useGetLastPaymentsByLoans(loanIds: string[], enabled: boolean = true) {
  return useQuery({
    queryKey: paymentKeys.lastByLoans(loanIds),
    queryFn: () => paymentService.getLastPaymentsByLoans(loanIds),
    enabled: enabled && loanIds.length > 0,
  })
}

export function useCreatePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreatePaymentData) => paymentService.createPayment(data),
    onSuccess: (newPayment, variables) => {
      // Update the payments list
      queryClient.setQueryData<Payment[]>(paymentKeys.lists(), (old) => {
        if (!old) return [newPayment]
        return [newPayment, ...old]
      })

      // Update payments for the specific loan (need to get loan_id from payment schedule)
      // For now, invalidate all payment queries since we changed the structure
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() })
      queryClient.invalidateQueries({ queryKey: paymentKeys.byLoan(variables.loan_id) })
      queryClient.invalidateQueries({ queryKey: paymentKeys.lastByLoan(variables.loan_id) })

      // Invalidate loan queries since balance/status might have changed
      queryClient.invalidateQueries({ queryKey: loanKeys.detail(variables.loan_id) })
      queryClient.invalidateQueries({ queryKey: loanKeys.lists() })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    },
    onError: (error) => {
      console.error('Failed to create payment:', error)
    },
  })
}

export function useUpdatePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
      originalPayment,
    }: {
      id: string
      data: UpdatePaymentData
      originalPayment: Payment
    }) => paymentService.updatePayment(id, data, originalPayment),
    onSuccess: () => {
      // Since payments are now tied to payment schedules, we need to invalidate
      // all payment queries as the structure has changed
      queryClient.invalidateQueries({ queryKey: paymentKeys.all })
      queryClient.invalidateQueries({ queryKey: loanKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    },
    onError: (error) => {
      console.error('Failed to update payment:', error)
    },
  })
}

export function useDeletePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payment }: { id: string; payment: Payment }) =>
      paymentService.deletePayment(id, payment),
    onSuccess: () => {
      // Since payments are now tied to payment schedules, invalidate all queries
      queryClient.invalidateQueries({ queryKey: paymentKeys.all })
      queryClient.invalidateQueries({ queryKey: loanKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    },
    onError: (error) => {
      console.error('Failed to delete payment:', error)
    },
  })
}
