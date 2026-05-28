-- Global task number sequence (single sequence across all tasks/users/workspaces)
CREATE SEQUENCE IF NOT EXISTS task_number_seq START 1;

-- Add task_number column (auto-assigns next value on insert)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_number INT DEFAULT nextval('task_number_seq');

-- Backfill existing tasks (assigns sequential numbers preserving creation order)
WITH ordered AS (
  SELECT id FROM tasks WHERE task_number IS NULL ORDER BY created_at
)
UPDATE tasks SET task_number = nextval('task_number_seq')
FROM ordered WHERE tasks.id = ordered.id;

-- Enforce non-null and uniqueness going forward
ALTER TABLE tasks ALTER COLUMN task_number SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS tasks_task_number_key ON tasks(task_number);
