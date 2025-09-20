import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  paymentService,
  paymentKeys,
  type CreatePaymentData,
  type UpdatePaymentData,
} from '@/services/api/payments.service'
import { loanKeys } from '@/services/api/loans.service'
import type { Payment } from '@/types/api/payments'

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

      // Update payments for the specific loan
      queryClient.setQueryData<Payment[]>(paymentKeys.byLoan(variables.loan_id), (old) => {
        if (!old) return [newPayment]
        return [newPayment, ...old]
      })

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() })
      queryClient.invalidateQueries({ queryKey: paymentKeys.byLoan(variables.loan_id) })
      queryClient.invalidateQueries({ queryKey: paymentKeys.lastByLoan(variables.loan_id) })

      // Invalidate loan queries since balance/status might have changed
      queryClient.invalidateQueries({ queryKey: loanKeys.detail(variables.loan_id) })
      queryClient.invalidateQueries({ queryKey: loanKeys.lists() })
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
    onSuccess: (_, { id, data, originalPayment }) => {
      // Update the specific payment in various caches
      const updatePaymentInCache = (old: Payment[] | undefined) => {
        if (!old) return old
        return old.map((payment) => (payment.id === id ? { ...payment, ...data } : payment))
      }

      queryClient.setQueryData<Payment[]>(paymentKeys.lists(), updatePaymentInCache)
      queryClient.setQueryData<Payment[]>(
        paymentKeys.byLoan(originalPayment.loan_id),
        updatePaymentInCache
      )

      if (data.loan_id && data.loan_id !== originalPayment.loan_id) {
        queryClient.setQueryData<Payment[]>(paymentKeys.byLoan(data.loan_id), updatePaymentInCache)
      }

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: paymentKeys.all })
      queryClient.invalidateQueries({ queryKey: loanKeys.all })
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
    onSuccess: (_, { id, payment }) => {
      // Remove from payments list
      queryClient.setQueryData<Payment[]>(paymentKeys.lists(), (old) => {
        if (!old) return old
        return old.filter((p) => p.id !== id)
      })

      // Remove from loan-specific payments
      queryClient.setQueryData<Payment[]>(paymentKeys.byLoan(payment.loan_id), (old) => {
        if (!old) return old
        return old.filter((p) => p.id !== id)
      })

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: paymentKeys.all })
      queryClient.invalidateQueries({ queryKey: loanKeys.detail(payment.loan_id) })
      queryClient.invalidateQueries({ queryKey: loanKeys.lists() })
    },
    onError: (error) => {
      console.error('Failed to delete payment:', error)
    },
  })
}
