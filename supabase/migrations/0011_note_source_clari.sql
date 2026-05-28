-- Add clari_copilot to meeting_notes source CHECK constraint
-- Postgres does not support ALTER CONSTRAINT for CHECK constraints;
-- drop the existing one and re-add with the expanded enum.
ALTER TABLE meeting_notes DROP CONSTRAINT IF EXISTS meeting_notes_source_check;
ALTER TABLE meeting_notes ADD CONSTRAINT meeting_notes_source_check
  CHECK (source IN ('manual', 'granola', 'google_meet', 'zoom', 'clari_copilot'));
