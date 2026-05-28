ALTER TABLE meeting_notes
  ADD COLUMN IF NOT EXISTS frequency TEXT
    CHECK (frequency IN ('weekly','biweekly','monthly','quarterly','ad_hoc')),
  ADD COLUMN IF NOT EXISTS transcript TEXT;
