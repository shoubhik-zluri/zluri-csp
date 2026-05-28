-- Allow meeting notes to be stored without an account (unassigned calls)
ALTER TABLE meeting_notes ALTER COLUMN account_id DROP NOT NULL;

-- Track matching metadata on each note
ALTER TABLE meeting_notes
  ADD COLUMN IF NOT EXISTS match_confidence TEXT
    CHECK (match_confidence IN ('high', 'medium', 'low', 'none')),
  ADD COLUMN IF NOT EXISTS match_reasons JSONB DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_meeting_notes_unassigned ON meeting_notes(account_id) WHERE account_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_meeting_notes_match_confidence ON meeting_notes(match_confidence);

-- Track unmatched call count in sync run logs
ALTER TABLE sync_run_logs
  ADD COLUMN IF NOT EXISTS calls_unmatched INTEGER NOT NULL DEFAULT 0;
