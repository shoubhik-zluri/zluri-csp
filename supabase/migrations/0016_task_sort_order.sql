-- Add sort_order column to tasks for drag-and-drop reordering
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order FLOAT DEFAULT 0;

-- Backfill: assign sort_order based on created_at epoch so existing tasks have meaningful order
UPDATE tasks SET sort_order = EXTRACT(EPOCH FROM created_at) WHERE sort_order = 0;

CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON tasks(sort_order);
