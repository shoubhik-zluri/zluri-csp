-- API keys table for CSM Claude integration
CREATE TABLE IF NOT EXISTS api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  key_hash     TEXT NOT NULL UNIQUE,       -- SHA-256 hex of the raw key
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
-- Users can only see/manage their own keys
CREATE POLICY "api_keys_owner" ON api_keys FOR ALL USING (auth.uid() = user_id);

-- Scheduled jobs registry (for future server-side scheduling)
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_type    TEXT NOT NULL,              -- 'daily_briefing' | 'overdue_check'
  cron_expr   TEXT NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scheduled_jobs_owner" ON scheduled_jobs FOR ALL USING (auth.uid() = user_id);
