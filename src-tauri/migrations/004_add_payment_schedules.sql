-- Add payment_schedules table for parent-child payment structure
-- This allows tracking payment periods with multiple payments per period
-- Use loan start date + interval for period calculation and accumulated totals

CREATE TABLE payment_schedules (
    id TEXT PRIMARY KEY,
    loan_id TEXT NOT NULL,
    period_start_date TEXT NOT NULL, -- Start of the payment period (loan start date + N intervals)
    period_end_date TEXT NOT NULL, -- End of the payment period (period_start_date + interval - 1 day)
    due_date TEXT NOT NULL, -- When payment is due (same as period_end_date for monthly)
    total_principal_due REAL NOT NULL DEFAULT 0,
    total_interest_due REAL NOT NULL DEFAULT 0,
    total_principal_paid REAL NOT NULL DEFAULT 0, -- Accumulated principal payments
    total_interest_paid REAL NOT NULL DEFAULT 0, -- Accumulated interest payments
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partially_paid', 'paid', 'overdue')),
    created_at TEXT NOT NULL,
    FOREIGN KEY (loan_id) REFERENCES loans (id)
);

-- Modify payments table to reference payment_schedule instead of loan directly
ALTER TABLE payments ADD COLUMN payment_schedule_id TEXT;

-- Create indexes for better performance
CREATE INDEX idx_payment_schedules_loan_id ON payment_schedules (loan_id);
CREATE INDEX idx_payment_schedules_status ON payment_schedules (status);
CREATE INDEX idx_payment_schedules_due_date ON payment_schedules (due_date);
CREATE INDEX idx_payment_schedules_period ON payment_schedules (period_start_date, period_end_date);
CREATE INDEX idx_payment_schedules_totals ON payment_schedules (total_principal_paid, total_interest_paid);
CREATE INDEX idx_payments_payment_schedule_id ON payments (payment_schedule_id);
CREATE INDEX idx_payments_schedule_principal ON payments (payment_schedule_id, principal_amount);
