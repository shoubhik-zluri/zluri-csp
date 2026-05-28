CREATE TABLE IF NOT EXISTS sync_run_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'scheduled', 'mcp')),
  sources TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  calls_fetched INTEGER NOT NULL DEFAULT 0,
  calls_matched INTEGER NOT NULL DEFAULT 0,
  calls_skipped INTEGER NOT NULL DEFAULT 0,
  tasks_suggested INTEGER NOT NULL DEFAULT 0,
  error_text TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_run_logs_status ON sync_run_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_run_logs_started_at ON sync_run_logs(started_at DESC);

CREATE TRIGGER sync_run_logs_updated_at
  BEFORE UPDATE ON sync_run_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE sync_run_logs ENABLE ROW LEVEL SECURITY;

-- Drop policies before creating (idempotency guard)
DROP POLICY IF EXISTS sync_run_logs_admin ON sync_run_logs;
DROP POLICY IF EXISTS sync_run_logs_select_all ON sync_run_logs;

-- Admins have full access (read + write)
CREATE POLICY sync_run_logs_admin ON sync_run_logs
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- All authenticated users can read sync logs (needed for status polling in UI)
CREATE POLICY sync_run_logs_select_all ON sync_run_logs
  FOR SELECT
  USING (auth.role() = 'authenticated');
