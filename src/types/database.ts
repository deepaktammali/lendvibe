export interface Borrower {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
}

export interface Loan {
  id: string;
  borrower_id: string;
  principal_amount: number;
  interest_rate: number;
  term_months: number;
  start_date: string; // YYYY-MM-DD format
  status: 'active' | 'paid_off' | 'defaulted';
  current_balance: number;
  created_at: string;
}

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

export interface BorrowerWithLoans extends Borrower {
  loans: Loan[];
}

export interface LoanWithPayments extends Loan {
  payments: Payment[];
  borrower: Borrower;
}