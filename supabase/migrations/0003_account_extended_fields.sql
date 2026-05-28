-- Phase B: Add extended account fields
-- Run this in Supabase SQL Editor

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS customer_since          DATE,
  ADD COLUMN IF NOT EXISTS contract_renewal_date   DATE,
  ADD COLUMN IF NOT EXISTS partner_sourced         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS partner_name            TEXT,
  ADD COLUMN IF NOT EXISTS associated_ae           TEXT,
  ADD COLUMN IF NOT EXISTS associated_cse          TEXT,
  ADD COLUMN IF NOT EXISTS customer_type           TEXT CHECK (customer_type IN ('IGA', 'SMP')),
  ADD COLUMN IF NOT EXISTS tier                    TEXT CHECK (tier IN ('Tier 1', 'Tier 2', 'Tier 3', 'Tier 4')),
  ADD COLUMN IF NOT EXISTS multiyear_contract      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS modules_purchased       TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS status                  TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'churned')),
  ADD COLUMN IF NOT EXISTS segment                 TEXT;

-- Verify / fix lifecycle_stage: if it's TEXT, convert to TEXT[]
-- Run this only if lifecycle_stage is currently a scalar TEXT column.
-- Safe to run even if already TEXT[] — the USING cast is idempotent when the value is already an array.
DO $$
BEGIN
  IF (
    SELECT data_type FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'lifecycle_stage'
  ) = 'text' THEN
    ALTER TABLE accounts
      ALTER COLUMN lifecycle_stage TYPE TEXT[]
      USING CASE WHEN lifecycle_stage IS NULL THEN NULL ELSE ARRAY[lifecycle_stage] END;
  END IF;
END $$;
