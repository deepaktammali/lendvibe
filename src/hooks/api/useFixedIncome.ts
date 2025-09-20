import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fixedIncomeService, fixedIncomeKeys, type CreateFixedIncomeData, type CreateIncomePaymentData, type UpdateIncomePaymentData } from '@/services/api/fixed-incomes.service';
import { borrowerKeys } from '@/services/api/borrowers.service';
import type { FixedIncome, IncomePayment } from '@/types/api/fixedIncome';

export function useGetFixedIncomes() {
  return useQuery({
    queryKey: fixedIncomeKeys.lists(),
    queryFn: fixedIncomeService.getFixedIncomes,
  });
}

export function useGetFixedIncome(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: fixedIncomeKeys.detail(id),
    queryFn: () => fixedIncomeService.getFixedIncome(id),
    enabled: enabled && !!id,
  });
}

export function useGetFixedIncomesByTenant(tenantId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: fixedIncomeKeys.byTenant(tenantId),
    queryFn: () => fixedIncomeService.getFixedIncomesByTenant(tenantId),
    enabled: enabled && !!tenantId,
  });
}

export function useGetFixedIncomesWithTenants() {
  return useQuery({
    queryKey: fixedIncomeKeys.withTenants(),
    queryFn: fixedIncomeService.getFixedIncomesWithTenants,
  });
}

export function useCreateFixedIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFixedIncomeData) => fixedIncomeService.createFixedIncome(data),
    onSuccess: (newFixedIncome) => {
      // Update the fixed incomes list
      queryClient.setQueryData<FixedIncome[]>(fixedIncomeKeys.lists(), (old) => {
        if (!old) return [newFixedIncome];
        return [newFixedIncome, ...old];
      });

      // Update fixed incomes for the specific tenant
      queryClient.setQueryData<FixedIncome[]>(fixedIncomeKeys.byTenant(newFixedIncome.tenant_id), (old) => {
        if (!old) return [newFixedIncome];
        return [newFixedIncome, ...old];
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: fixedIncomeKeys.all });
      queryClient.invalidateQueries({ queryKey: borrowerKeys.detail(newFixedIncome.tenant_id) });
    },
    onError: (error) => {
      console.error('Failed to create fixed income:', error);
    },
  });
}

export function useUpdateFixedIncomeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: FixedIncome['status'] }) =>
      fixedIncomeService.updateFixedIncomeStatus(id, status),
    onSuccess: (_, { id, status }) => {
      // Update the fixed income in cache
      queryClient.setQueryData<FixedIncome | null>(fixedIncomeKeys.detail(id), (old) => {
        if (!old) return null;
        return { ...old, status };
      });

      // Update in lists
      const updateFixedIncomeInList = (old: FixedIncome[] | undefined) => {
        if (!old) return old;
        return old.map((fixedIncome) =>
          fixedIncome.id === id ? { ...fixedIncome, status } : fixedIncome
        );
      };

      queryClient.setQueryData<FixedIncome[]>(fixedIncomeKeys.lists(), updateFixedIncomeInList);

      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: fixedIncomeKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: fixedIncomeKeys.withTenants() });
    },
    onError: (error) => {
      console.error('Failed to update fixed income status:', error);
    },
  });
}

export function useDeleteFixedIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fixedIncomeService.deleteFixedIncome(id),
    onSuccess: (_, id) => {
      // Remove from fixed incomes list
      queryClient.setQueryData<FixedIncome[]>(fixedIncomeKeys.lists(), (old) => {
        if (!old) return old;
        return old.filter((fixedIncome) => fixedIncome.id !== id);
      });

      // Remove the specific fixed income cache
      queryClient.removeQueries({ queryKey: fixedIncomeKeys.detail(id) });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: fixedIncomeKeys.all });
    },
    onError: (error) => {
      console.error('Failed to delete fixed income:', error);
    },
  });
}

// Income Payment Hooks
export function useGetIncomePayments() {
  return useQuery({
    queryKey: fixedIncomeKeys.incomePayments.lists(),
    queryFn: fixedIncomeService.getIncomePayments,
  });
}

export function useGetIncomePaymentsByFixedIncome(fixedIncomeId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: fixedIncomeKeys.incomePayments.byFixedIncome(fixedIncomeId),
    queryFn: () => fixedIncomeService.getIncomePaymentsByFixedIncome(fixedIncomeId),
    enabled: enabled && !!fixedIncomeId,
  });
}

export function useGetLastIncomePaymentByFixedIncome(fixedIncomeId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: fixedIncomeKeys.incomePayments.lastByFixedIncome(fixedIncomeId),
    queryFn: () => fixedIncomeService.getLastIncomePaymentByFixedIncome(fixedIncomeId),
    enabled: enabled && !!fixedIncomeId,
  });
}

export function useGetLastIncomePaymentsByFixedIncomes(fixedIncomeIds: string[], enabled: boolean = true) {
  return useQuery({
    queryKey: fixedIncomeKeys.incomePayments.lastByFixedIncomes(fixedIncomeIds),
    queryFn: () => fixedIncomeService.getLastIncomePaymentsByFixedIncomes(fixedIncomeIds),
    enabled: enabled && fixedIncomeIds.length > 0,
  });
}

export function useCreateIncomePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateIncomePaymentData) => fixedIncomeService.createIncomePayment(data),
    onSuccess: (newPayment, variables) => {
      // Update the income payments list
      queryClient.setQueryData<IncomePayment[]>(fixedIncomeKeys.incomePayments.lists(), (old) => {
        if (!old) return [newPayment];
        return [newPayment, ...old];
      });

      // Update income payments for the specific fixed income
      queryClient.setQueryData<IncomePayment[]>(fixedIncomeKeys.incomePayments.byFixedIncome(variables.fixed_income_id), (old) => {
        if (!old) return [newPayment];
        return [newPayment, ...old];
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: fixedIncomeKeys.incomePayments.all });
      queryClient.invalidateQueries({ queryKey: fixedIncomeKeys.incomePayments.byFixedIncome(variables.fixed_income_id) });
      queryClient.invalidateQueries({ queryKey: fixedIncomeKeys.incomePayments.lastByFixedIncome(variables.fixed_income_id) });
    },
    onError: (error) => {
      console.error('Failed to create income payment:', error);
    },
  });
}

export function useUpdateIncomePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateIncomePaymentData }) =>
      fixedIncomeService.updateIncomePayment(id, data),
    onSuccess: (_, { id, data }) => {
      // Update the specific income payment in various caches
      const updateIncomePaymentInCache = (old: IncomePayment[] | undefined) => {
        if (!old) return old;
        return old.map((payment) =>
          payment.id === id ? { ...payment, ...data } : payment
        );
      };

      queryClient.setQueryData<IncomePayment[]>(fixedIncomeKeys.incomePayments.lists(), updateIncomePaymentInCache);

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: fixedIncomeKeys.incomePayments.all });
    },
    onError: (error) => {
      console.error('Failed to update income payment:', error);
    },
  });
}

export function useDeleteIncomePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fixedIncomeService.deleteIncomePayment(id),
    onSuccess: (_, id) => {
      // Remove from income payments list
      queryClient.setQueryData<IncomePayment[]>(fixedIncomeKeys.incomePayments.lists(), (old) => {
        if (!old) return old;
        return old.filter((payment) => payment.id !== id);
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: fixedIncomeKeys.incomePayments.all });
    },
    onError: (error) => {
      console.error('Failed to delete income payment:', error);
    },
  });
}
