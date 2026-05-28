-- ============================================================
-- 0019_task_views.sql
-- Sprint 3E: per-user saved task views (filter + sort + column config)
-- ============================================================

CREATE TABLE IF NOT EXISTS task_views (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  view_mode    TEXT NOT NULL CHECK (view_mode IN ('list', 'table')),
  config       JSONB NOT NULL DEFAULT '{}',
  is_default   BOOLEAN NOT NULL DEFAULT FALSE,
  workspace_id TEXT,   -- reserved for workspace-level views
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_views_user_id ON task_views(user_id);

CREATE OR REPLACE FUNCTION trg_fn_task_views_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_task_views_updated_at ON task_views;
CREATE TRIGGER trg_task_views_updated_at
  BEFORE UPDATE ON task_views
  FOR EACH ROW EXECUTE FUNCTION trg_fn_task_views_updated_at();

ALTER TABLE task_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_views_owner" ON task_views;
CREATE POLICY "task_views_owner" ON task_views
  FOR ALL USING (user_id = auth.uid());
