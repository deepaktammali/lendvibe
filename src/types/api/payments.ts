// API Types - separate from database types
export interface Payment {
  id: string;
  loan_id: string;
  amount: number;
  payment_type: 'principal' | 'interest' | 'mixed';
  principal_amount: number;
  interest_amount: number;
  payment_date: string; // YYYY-MM-DD format
  created_at: string;
}

// Query Types
namespace GetPayments {
  export type Response = Payment[];
  export type Query = {
    loan_id?: string;
    limit?: number;
    offset?: number;
  };
}

namespace GetPaymentsByLoan {
  export type Response = Payment[];
  export type Query = {
    loanId: string;
  };
}

namespace GetLastPaymentByLoan {
  export type Response = Payment | null;
  export type Query = {
    loanId: string;
  };
}

namespace GetLastPaymentsByLoans {
  export type Response = Map<string, Payment>;
  export type Query = {
    loanIds: string[];
  };
}

namespace CreatePayment {
  export type Response = Payment;
  export type Payload = {
    loan_id: string;
    principal_amount: number;
    interest_amount: number;
    payment_date: string;
  };
}

namespace UpdatePayment {
  export type Response = void;
  export type Payload = {
    id: string;
    data: {
      loan_id?: string;
      amount?: number;
      payment_type?: Payment['payment_type'];
      principal_amount?: number;
      interest_amount?: number;
      payment_date?: string;
    };
    originalPayment: Payment;
  };
}

namespace DeletePayment {
  export type Response = void;
  export type Payload = {
    id: string;
    payment: Payment;
  };
}

// Export all types for easy importing
export type {
  GetPayments,
  GetPaymentsByLoan,
  GetLastPaymentByLoan,
  GetLastPaymentsByLoans,
  CreatePayment,
  UpdatePayment,
  DeletePayment,
};
