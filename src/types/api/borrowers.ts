import type { Borrower } from '../database';

// Query Types
namespace GetBorrowers {
  export type Response = Borrower[];
  export type Query = {
    search?: string;
    limit?: number;
    offset?: number;
  };
}

namespace GetBorrower {
  export type Response = Borrower | null;
}

namespace CreateBorrower {
  export type Response = Borrower;
  export type Payload = {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

namespace UpdateBorrower {
  export type Response = void;
  export type Payload = {
    data: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
    };
  }; // ID is part of URL path
}

namespace DeleteBorrower {
  export type Response = void;
}

// Export all types for easy importing
export type {
  GetBorrowers,
  GetBorrower,
  CreateBorrower,
  UpdateBorrower,
  DeleteBorrower,
};
