-- Simplify fixed_income table structure
-- Remove complex fields and make it simpler with just amount, payment frequency, optional payer, and label

-- Create new simplified fixed_income table
CREATE TABLE fixed_income_new (
  id TEXT PRIMARY KEY,
  label TEXT, -- Descriptive label for the fixed income (e.g., "Rent - Apartment 1A", "Land Lease - Plot 5")
  payer_id TEXT, -- Optional reference to borrowers table
  amount REAL NOT NULL, -- Simple payment amount
  payment_interval_unit TEXT NOT NULL CHECK (payment_interval_unit IN ('days', 'weeks', 'months', 'years')),
  payment_interval_value INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'terminated', 'expired')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (payer_id) REFERENCES borrowers (id)
);

-- Copy data from old table to new table
INSERT INTO fixed_income_new (
  id, label, payer_id, amount, payment_interval_unit, payment_interval_value,
  start_date, end_date, status, created_at
)
SELECT
  fi.id,
  CASE
    WHEN b.name IS NOT NULL THEN b.name || ' - Fixed Income'
    ELSE 'Fixed Income'
  END as label,
  fi.tenant_id as payer_id, -- Migrate tenant_id to payer_id
  fi.principal_amount as amount,
  fi.payment_interval_unit,
  fi.payment_interval_value,
  fi.start_date,
  fi.end_date,
  fi.status,
  fi.created_at
FROM fixed_income fi
LEFT JOIN borrowers b ON fi.tenant_id = b.id;

-- Drop old table and rename new one
DROP TABLE fixed_income;
ALTER TABLE fixed_income_new RENAME TO fixed_income;

-- Create indexes for the new table structure
CREATE INDEX idx_fixed_income_label ON fixed_income (label);
CREATE INDEX idx_fixed_income_payer_id ON fixed_income (payer_id);
CREATE INDEX idx_fixed_income_status ON fixed_income (status);
CREATE INDEX idx_fixed_income_start_date ON fixed_income (start_date);
CREATE INDEX idx_fixed_income_amount ON fixed_income (amount);