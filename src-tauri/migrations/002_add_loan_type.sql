-- Add loan_type, repayment_interval_unit, and repayment_interval_value columns to the loans table
ALTER TABLE loans ADD COLUMN loan_type TEXT NOT NULL DEFAULT 'installment';
ALTER TABLE loans ADD COLUMN repayment_interval_unit TEXT;
ALTER TABLE loans ADD COLUMN repayment_interval_value INTEGER;