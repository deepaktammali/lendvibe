-- Add notes field to payments and income_payments tables

-- Add notes field to payments table
ALTER TABLE payments ADD COLUMN notes TEXT;

-- Add notes field to income_payments table
ALTER TABLE income_payments ADD COLUMN notes TEXT;