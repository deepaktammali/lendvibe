-- Migration: Cleanup payment schedules for bullet loans
-- Bullet loans should not have payment schedules since they have manual payments only

-- Delete all payments associated with bullet loan payment schedules
DELETE FROM payments
WHERE payment_schedule_id IN (
    SELECT ps.id
    FROM payment_schedules ps
    JOIN loans l ON ps.loan_id = l.id
    WHERE l.loan_type = 'bullet'
);

-- Delete all payment schedules for bullet loans
DELETE FROM payment_schedules
WHERE loan_id IN (
    SELECT id
    FROM loans
    WHERE loan_type = 'bullet'
);