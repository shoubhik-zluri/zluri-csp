CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, depends_on_id),
  CHECK (task_id != depends_on_id)
);
CREATE INDEX IF NOT EXISTS idx_task_deps_task ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_deps_depends_on ON task_dependencies(depends_on_id);

ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can read task_dependencies"
  ON task_dependencies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "users can insert task_dependencies for their tasks"
  ON task_dependencies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE id = task_id
        AND (owner_id = auth.uid() OR created_by = auth.uid())
    )
  );

CREATE POLICY "users can delete task_dependencies for their tasks"
  ON task_dependencies FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE id = task_id
        AND (owner_id = auth.uid() OR created_by = auth.uid())
    )
  );
