import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { borrowerService, borrowerKeys, type CreateBorrowerData, type UpdateBorrowerData } from '@/services/api/borrowers.service';
import type { Borrower } from '@/types/database';

export function useGetBorrowers() {
  return useQuery({
    queryKey: borrowerKeys.lists(),
    queryFn: borrowerService.getBorrowers,
  });
}

export function useGetBorrower(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: borrowerKeys.detail(id),
    queryFn: () => borrowerService.getBorrower(id),
    enabled: enabled && !!id,
  });
}

export function useCreateBorrower() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBorrowerData) => borrowerService.createBorrower(data),
    onSuccess: (newBorrower) => {
      // Update the borrowers list
      queryClient.setQueryData<Borrower[]>(borrowerKeys.lists(), (old) => {
        if (!old) return [newBorrower];
        return [newBorrower, ...old];
      });

      // Invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: borrowerKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to create borrower:', error);
    },
  });
}

export function useUpdateBorrower() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBorrowerData }) =>
      borrowerService.updateBorrower(id, data),
    onSuccess: (_, { id, data }) => {
      // Update the specific borrower in cache
      queryClient.setQueryData<Borrower | null>(borrowerKeys.detail(id), (old) => {
        if (!old) return null;
        return { ...old, ...data };
      });

      // Update the borrower in the list
      queryClient.setQueryData<Borrower[]>(borrowerKeys.lists(), (old) => {
        if (!old) return old;
        return old.map((borrower) =>
          borrower.id === id ? { ...borrower, ...data } : borrower
        );
      });

      // Invalidate queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: borrowerKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: borrowerKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to update borrower:', error);
    },
  });
}

export function useDeleteBorrower() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => borrowerService.deleteBorrower(id),
    onSuccess: (_, id) => {
      // Remove from borrowers list
      queryClient.setQueryData<Borrower[]>(borrowerKeys.lists(), (old) => {
        if (!old) return old;
        return old.filter((borrower) => borrower.id !== id);
      });

      // Remove the specific borrower cache
      queryClient.removeQueries({ queryKey: borrowerKeys.detail(id) });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: borrowerKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to delete borrower:', error);
    },
  });
}
