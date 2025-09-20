// API Types - separate from database types
export interface Borrower {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  created_at: string
}

// Query Types
namespace GetBorrowers {
  export type Response = Borrower[]
  export type Query = {
    search?: string
    limit?: number
    offset?: number
  }
}

namespace GetBorrower {
  export type Response = Borrower | null
}

namespace CreateBorrower {
  export type Response = Borrower
  export type Payload = {
    name: string
    email?: string
    phone?: string
    address?: string
  }
}

namespace UpdateBorrower {
  export type Response = undefined
  export type Payload = {
    data: {
      name?: string
      email?: string
      phone?: string
      address?: string
    }
  } // ID is part of URL path
}

namespace DeleteBorrower {
  export type Response = undefined
}

// Export all types for easy importing
export type { GetBorrowers, GetBorrower, CreateBorrower, UpdateBorrower, DeleteBorrower }
