-- Fix payment schedule duplicates by adding unique constraint
-- This prevents creating duplicate schedules for the same loan and period

-- First, remove any existing duplicate schedules (keep the first one created)
DELETE FROM payment_schedules
WHERE id NOT IN (
    SELECT MIN(id)
    FROM payment_schedules
    GROUP BY loan_id, period_start_date, period_end_date
);

-- Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX idx_payment_schedules_unique_period
ON payment_schedules (loan_id, period_start_date, period_end_date);