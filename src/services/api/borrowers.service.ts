import {
  createBorrower as dbCreateBorrower,
  deleteBorrower as dbDeleteBorrower,
  getBorrower as dbGetBorrower,
  getBorrowers as dbGetBorrowers,
  updateBorrower as dbUpdateBorrower,
} from '@/lib/database';
import type { Borrower } from '@/types/database';
import type { CreateBorrower } from '@/types/api/borrowers';

export type CreateBorrowerData = CreateBorrower.Payload;
export type UpdateBorrowerData = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
};

export const borrowerService = {
  async getBorrowers(): Promise<Borrower[]> {
    return await dbGetBorrowers();
  },

  async getBorrower(id: string): Promise<Borrower | null> {
    return await dbGetBorrower(id);
  },

  async createBorrower(data: CreateBorrowerData): Promise<Borrower> {
    return await dbCreateBorrower(data);
  },

  async updateBorrower(id: string, data: UpdateBorrowerData): Promise<void> {
    return await dbUpdateBorrower(id, data);
  },

  async deleteBorrower(id: string): Promise<void> {
    return await dbDeleteBorrower(id);
  },
};

export const borrowerKeys = {
  all: ['borrowers'] as const,
  lists: () => [...borrowerKeys.all, 'list'] as const,
  list: (filters: string) => [...borrowerKeys.lists(), { filters }] as const,
  details: () => [...borrowerKeys.all, 'detail'] as const,
  detail: (id: string) => [...borrowerKeys.details(), id] as const,
};
