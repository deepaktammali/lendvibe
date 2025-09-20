import {
  createBorrower as dbCreateBorrower,
  deleteBorrower as dbDeleteBorrower,
  getBorrower as dbGetBorrower,
  getBorrowers as dbGetBorrowers,
  updateBorrower as dbUpdateBorrower,
} from '@/lib/database'
import type { Borrower, CreateBorrower } from '@/types/api/borrowers'

export type CreateBorrowerData = CreateBorrower.Payload
export type UpdateBorrowerData = {
  name?: string
  email?: string
  phone?: string
  address?: string
}

export const borrowerService = {
  async getBorrowers(): Promise<Borrower[]> {
    const dbBorrowers = await dbGetBorrowers()
    // Transform database types to API types
    return dbBorrowers.map((dbBorrower) => ({
      id: dbBorrower.id,
      name: dbBorrower.name,
      email: dbBorrower.email,
      phone: dbBorrower.phone,
      address: dbBorrower.address,
      created_at: dbBorrower.created_at,
    }))
  },

  async getBorrower(id: string): Promise<Borrower | null> {
    const dbBorrower = await dbGetBorrower(id)
    if (!dbBorrower) return null

    // Transform database type to API type
    return {
      id: dbBorrower.id,
      name: dbBorrower.name,
      email: dbBorrower.email,
      phone: dbBorrower.phone,
      address: dbBorrower.address,
      created_at: dbBorrower.created_at,
    }
  },

  async createBorrower(data: CreateBorrowerData): Promise<Borrower> {
    const dbBorrower = await dbCreateBorrower(data)
    // Transform database type to API type
    return {
      id: dbBorrower.id,
      name: dbBorrower.name,
      email: dbBorrower.email,
      phone: dbBorrower.phone,
      address: dbBorrower.address,
      created_at: dbBorrower.created_at,
    }
  },

  async updateBorrower(id: string, data: UpdateBorrowerData): Promise<void> {
    return await dbUpdateBorrower(id, data)
  },

  async deleteBorrower(id: string): Promise<void> {
    return await dbDeleteBorrower(id)
  },
}
