-- Complete database schema for LendVibe
-- This replaces all previous migrations with a single, comprehensive schema

-- Create borrowers table
CREATE TABLE borrowers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TEXT NOT NULL
);

-- Create loans table with end_date instead of term_months
CREATE TABLE loans (
    id TEXT PRIMARY KEY,
    borrower_id TEXT NOT NULL,
    principal_amount REAL NOT NULL,
    interest_rate REAL NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT, -- Optional end date (calculated from term if needed)
    status TEXT NOT NULL DEFAULT 'active',
    current_balance REAL NOT NULL,
    created_at TEXT NOT NULL,
    loan_type TEXT NOT NULL DEFAULT 'installment',
    repayment_interval_unit TEXT,
    repayment_interval_value INTEGER,
    FOREIGN KEY (borrower_id) REFERENCES borrowers (id)
);

-- Create payments table
CREATE TABLE payments (
    id TEXT PRIMARY KEY,
    loan_id TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_type TEXT NOT NULL,
    principal_amount REAL NOT NULL,
    interest_amount REAL NOT NULL,
    payment_date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (loan_id) REFERENCES loans (id)
);

-- Create fixed_income table
CREATE TABLE fixed_income (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  income_type TEXT NOT NULL CHECK (income_type IN ('land_lease', 'rent_agreement', 'fixed_deposit_income')),
  principal_amount REAL NOT NULL,
  income_rate REAL NOT NULL,
  payment_interval_unit TEXT NOT NULL CHECK (payment_interval_unit IN ('days', 'weeks', 'months', 'years')),
  payment_interval_value INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'terminated', 'expired')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES borrowers (id)
);

-- Create income_payments table
CREATE TABLE income_payments (
  id TEXT PRIMARY KEY,
  fixed_income_id TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (fixed_income_id) REFERENCES fixed_income (id)
);

-- Create indexes for better performance
CREATE INDEX idx_loans_borrower_id ON loans (borrower_id);
CREATE INDEX idx_payments_loan_id ON payments (loan_id);
CREATE INDEX idx_loans_status ON loans (status);
CREATE INDEX idx_payments_date ON payments (payment_date);
CREATE INDEX idx_fixed_income_tenant_id ON fixed_income (tenant_id);
CREATE INDEX idx_fixed_income_status ON fixed_income (status);
CREATE INDEX idx_fixed_income_start_date ON fixed_income (start_date);
CREATE INDEX idx_income_payments_fixed_income_id ON income_payments (fixed_income_id);
CREATE INDEX idx_income_payments_date ON income_payments (payment_date);
