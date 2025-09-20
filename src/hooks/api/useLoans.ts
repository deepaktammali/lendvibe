import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type CreateLoanData, loanService } from '@/services/api/loans.service'
import type { Loan } from '@/types/api/loans'
import { borrowerKeys } from './useBorrowers'
import { dashboardKeys } from './useDashboard'
import { paymentKeys } from './usePayments'

export const loanKeys = {
  all: ['loans'] as const,
  lists: () => [...loanKeys.all, 'list'] as const,
  list: (filters: string) => [...loanKeys.lists(), { filters }] as const,
  details: () => [...loanKeys.all, 'detail'] as const,
  detail: (id: string) => [...loanKeys.details(), id] as const,
  byBorrower: (borrowerId: string) => [...loanKeys.all, 'byBorrower', borrowerId] as const,
  withBorrowers: () => [...loanKeys.all, 'withBorrowers'] as const,
  withCalculatedBalances: () => [...loanKeys.all, 'withCalculatedBalances'] as const,
  realRemainingPrincipal: (loanId: string) =>
    [...loanKeys.all, 'realRemainingPrincipal', loanId] as const,
}

export function useGetLoans() {
  return useQuery({
    queryKey: loanKeys.lists(),
    queryFn: loanService.getLoans,
  })
}

export function useGetLoan(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: loanKeys.detail(id),
    queryFn: () => loanService.getLoan(id),
    enabled: enabled && !!id,
  })
}

export function useGetLoansByBorrower(borrowerId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: loanKeys.byBorrower(borrowerId),
    queryFn: () => loanService.getLoansByBorrower(borrowerId),
    enabled: enabled && !!borrowerId,
  })
}

export function useGetLoansWithBorrowers() {
  return useQuery({
    queryKey: loanKeys.withBorrowers(),
    queryFn: loanService.getLoansWithBorrowers,
  })
}

export function useGetLoansWithCalculatedBalances() {
  return useQuery({
    queryKey: loanKeys.withCalculatedBalances(),
    queryFn: loanService.getLoansWithCalculatedBalances,
  })
}

export function useGetRealRemainingPrincipal(loanId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: loanKeys.realRemainingPrincipal(loanId),
    queryFn: () => loanService.getRealRemainingPrincipal(loanId),
    enabled: enabled && !!loanId,
  })
}

export function useCreateLoan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateLoanData) => loanService.createLoan(data),
    onSuccess: (newLoan) => {
      // Update the loans list
      queryClient.setQueryData<Loan[]>(loanKeys.lists(), (old) => {
        if (!old) return [newLoan]
        return [newLoan, ...old]
      })

      // Update loans for the specific borrower
      queryClient.setQueryData<Loan[]>(loanKeys.byBorrower(newLoan.borrower_id), (old) => {
        if (!old) return [newLoan]
        return [newLoan, ...old]
      })

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: loanKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
      queryClient.invalidateQueries({ queryKey: borrowerKeys.detail(newLoan.borrower_id) })
    },
    onError: (error) => {
      console.error('Failed to create loan:', error)
    },
  })
}

export function useUpdateLoanBalance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, newBalance }: { id: string; newBalance: number }) =>
      loanService.updateLoanBalance(id, newBalance),
    onSuccess: (_, { id, newBalance }) => {
      // Update the loan in cache
      queryClient.setQueryData<Loan | null>(loanKeys.detail(id), (old) => {
        if (!old) return null
        return { ...old, current_balance: newBalance }
      })

      // Update in lists
      const updateLoanInList = (old: Loan[] | undefined) => {
        if (!old) return old
        return old.map((loan) => (loan.id === id ? { ...loan, current_balance: newBalance } : loan))
      }

      queryClient.setQueryData<Loan[]>(loanKeys.lists(), updateLoanInList)

      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: loanKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: loanKeys.withCalculatedBalances() })
    },
    onError: (error) => {
      console.error('Failed to update loan balance:', error)
    },
  })
}

export function useUpdateLoanStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Loan['status'] }) =>
      loanService.updateLoanStatus(id, status),
    onSuccess: (_, { id, status }) => {
      // Update the loan in cache
      queryClient.setQueryData<Loan | null>(loanKeys.detail(id), (old) => {
        if (!old) return null
        return { ...old, status }
      })

      // Update in lists
      const updateLoanInList = (old: Loan[] | undefined) => {
        if (!old) return old
        return old.map((loan) => (loan.id === id ? { ...loan, status } : loan))
      }

      queryClient.setQueryData<Loan[]>(loanKeys.lists(), updateLoanInList)

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: loanKeys.all })
    },
    onError: (error) => {
      console.error('Failed to update loan status:', error)
    },
  })
}

export function useUpdateLoan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Omit<Loan, 'id' | 'created_at'>> }) =>
      loanService.updateLoan(id, updates),
    onSuccess: (_, { id, updates }) => {
      // Update the loan in cache
      queryClient.setQueryData<Loan | null>(loanKeys.detail(id), (old) => {
        if (!old) return null
        return { ...old, ...updates }
      })

      // Update in lists
      const updateLoanInList = (old: Loan[] | undefined) => {
        if (!old) return old
        return old.map((loan) => (loan.id === id ? { ...loan, ...updates } : loan))
      }

      queryClient.setQueryData<Loan[]>(loanKeys.lists(), updateLoanInList)

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: loanKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    },
    onError: (error) => {
      console.error('Failed to update loan:', error)
    },
  })
}

export function useDeleteLoan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => loanService.deleteLoan(id),
    onSuccess: (_, id) => {
      // Remove from loans list
      queryClient.setQueryData<Loan[]>(loanKeys.lists(), (old) => {
        if (!old) return old
        return old.filter((loan) => loan.id !== id)
      })

      // Remove the specific loan cache
      queryClient.removeQueries({ queryKey: loanKeys.detail(id) })

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: loanKeys.all })
      queryClient.invalidateQueries({ queryKey: paymentKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    },
    onError: (error) => {
      console.error('Failed to delete loan:', error)
    },
  })
}

export function useSyncAllLoanBalances() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => loanService.syncAllLoanBalances(),
    onSuccess: () => {
      // Invalidate all loan queries to refresh data
      queryClient.invalidateQueries({ queryKey: loanKeys.all })
    },
    onError: (error) => {
      console.error('Failed to sync loan balances:', error)
    },
  })
}
