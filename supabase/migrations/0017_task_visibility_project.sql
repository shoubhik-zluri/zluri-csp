-- ============================================================
-- 0017_task_visibility_project.sql
-- Sprint 3C: visibility enum (private/internal/external) +
--            make account_id nullable for private tasks +
--            update RLS to allow private-task access by owner/creator
-- ============================================================

-- 1. Visibility column
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'internal'
  CHECK (visibility IN ('private', 'internal', 'external'));

-- 2. Allow private tasks with no account
ALTER TABLE tasks ALTER COLUMN account_id DROP NOT NULL;

-- 3. Backfill: all existing tasks are internal account tasks
UPDATE tasks SET visibility = 'internal' WHERE visibility IS NULL OR visibility = '';

-- 4. Update RLS — replace both task policies to handle private tasks
--    Private tasks: only visible to owner or creator (visibility-scoped)
--    Account tasks: existing account-membership logic (unchanged)

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select" ON tasks;
CREATE POLICY "tasks_select" ON tasks
  FOR SELECT USING (
    -- Private: only the owner or creator may read
    (
      visibility = 'private'
      AND (owner_id = auth.uid() OR created_by = auth.uid())
    )
    OR
    -- Account-scoped (internal / external): account membership controls access
    (
      visibility != 'private'
      AND account_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM accounts a
        WHERE a.id = tasks.account_id
          AND (
            EXISTS (
              SELECT 1 FROM profiles p
              WHERE p.id = auth.uid()
                AND p.role IN ('admin', 'viewer', 'collaborator')
            )
            OR (
              a.csm_id = auth.uid()
              AND EXISTS (
                SELECT 1 FROM profiles p
                WHERE p.id = auth.uid() AND p.role = 'member'
              )
            )
          )
      )
    )
  );

DROP POLICY IF EXISTS "tasks_write" ON tasks;
CREATE POLICY "tasks_write" ON tasks
  FOR ALL USING (
    (
      visibility = 'private'
      AND (owner_id = auth.uid() OR created_by = auth.uid())
    )
    OR
    (
      visibility != 'private'
      AND account_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM accounts a
        JOIN profiles p ON p.id = auth.uid()
        WHERE a.id = tasks.account_id
          AND (p.role = 'admin' OR (p.role = 'member' AND a.csm_id = auth.uid()))
      )
    )
  );
