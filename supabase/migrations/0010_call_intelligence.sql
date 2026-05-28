-- Extend pending_tasks with Call Intelligence fields
ALTER TABLE pending_tasks
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS task_type TEXT NOT NULL DEFAULT 'action_item'
    CHECK (task_type IN ('action_item', 'risk', 'expansion')),
  ADD COLUMN IF NOT EXISTS confidence TEXT
    CHECK (confidence IN ('high', 'medium', 'low')),
  ADD COLUMN IF NOT EXISTS justification TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT
    CHECK (priority IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS reference_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_call_id TEXT;

CREATE INDEX IF NOT EXISTS idx_pending_tasks_task_type ON pending_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_pending_tasks_confidence ON pending_tasks(confidence);
