ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS section TEXT;
CREATE INDEX IF NOT EXISTS idx_tasks_section ON tasks(section);
