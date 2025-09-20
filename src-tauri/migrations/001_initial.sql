-- Create borrowers table
CREATE TABLE borrowers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TEXT NOT NULL
);

-- Create loans table
CREATE TABLE loans (
    id TEXT PRIMARY KEY,
    borrower_id TEXT NOT NULL,
    principal_amount REAL NOT NULL,
    interest_rate REAL NOT NULL,
    term_months INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    current_balance REAL NOT NULL,
    created_at TEXT NOT NULL,
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

-- Create indexes for better performance
CREATE INDEX idx_loans_borrower_id ON loans (borrower_id);
CREATE INDEX idx_payments_loan_id ON payments (loan_id);
CREATE INDEX idx_loans_status ON loans (status);
CREATE INDEX idx_payments_date ON payments (payment_date);