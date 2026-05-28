-- ============================================================
-- 0001_initial_schema.sql
-- Zluri CSM Platform — Core Tables
-- ============================================================

-- ----------------------------------------------------------------
-- PROFILES
-- Extends auth.users with role and display info.
-- Auto-populated by the trigger in 0002_rls_policies.sql
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'member'
                CHECK (role IN ('admin', 'member', 'viewer', 'collaborator')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- ACCOUNTS
-- Core entity. org_id is the stable external identifier.
-- Enum values mirror ChurnZero vocabulary used at Zluri.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stable key: survives renames; used for CSV upsert dedup and Phase 2 agent syncs
  org_id            TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  arr               NUMERIC(12, 2),
  renewal_date      DATE,
  contract_type     TEXT
                    CHECK (contract_type IN ('monthly', 'annual', 'multi-year')),
  csm_id            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  health_score      SMALLINT CHECK (health_score BETWEEN 0 AND 100),
  -- CSM Pulse (ChurnZero equivalent)
  sentiment         TEXT CHECK (sentiment IN ('high_risk', 'some_risk', 'good')),
  -- 5A Lifecycle Stage
  lifecycle_stage   TEXT CHECK (lifecycle_stage IN (
                      'acquisition', 'activation', 'adoption',
                      'amplification', 'advocacy'
                    )),
  -- Executive Engagement (7-option enum)
  exec_engagement   TEXT CHECK (exec_engagement IN (
                      'platform_login',
                      'cadence_with_csm',
                      'qbr_current_quarter',
                      'meets_cs_leadership',
                      'personally_escalates',
                      'attends_cab',
                      'requests_report'
                    )),
  renewal_stage     TEXT CHECK (renewal_stage IN (
                      'not_started', 'in_discussion', 'quote_sent',
                      'negotiating', 'renewed', 'churned', 'at_risk'
                    )),
  -- e.g. ['low_usage', 'champion_left', 'open_escalation', 'no_exec_sponsor', 'competitive_threat']
  risk_signals      TEXT[] DEFAULT '{}',
  industry          TEXT,
  region            TEXT,
  employee_count    INTEGER,
  website           TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- CONTACTS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT,
  role          TEXT,  -- 'Champion', 'Economic Buyer', 'Admin', 'Technical Lead', etc.
  is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
  linkedin_url  TEXT,
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- SUCCESS_PLANS
-- Groups tasks into named plans (mirrors ChurnZero Success Plans)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS success_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  owner_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  due_date      DATE,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'completed', 'archived')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- TASKS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  plan_id       UUID REFERENCES success_plans(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  due_date      DATE,
  status        TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  owner_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- MEETING_NOTES
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meeting_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title         TEXT,
  content       TEXT NOT NULL,
  meeting_date  DATE NOT NULL,
  source        TEXT NOT NULL DEFAULT 'manual'
                CHECK (source IN ('manual', 'granola', 'google_meet', 'zoom')),
  attendees     TEXT[] DEFAULT '{}',
  -- Phase 2: external system ID for dedup (Granola note ID, Meet event ID, etc.)
  external_id   TEXT,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- ACCOUNT_INTEGRATIONS
-- Pre-wired for Phase 2 agents. CSMs can fill these manually in MVP.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS account_integrations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  slack_channel_id    TEXT,
  slack_channel_name  TEXT,
  granola_folder_id   TEXT,
  email_domain        TEXT,   -- used by Gmail agent for fuzzy matching
  jira_project_key    TEXT,
  notion_page_id      TEXT,
  clari_account_id    TEXT,
  salesforce_id       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id)
);

-- ----------------------------------------------------------------
-- IMPORT_LOGS
-- Audit trail for all CSV imports
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS import_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imported_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  filename        TEXT,
  total_rows      INTEGER NOT NULL DEFAULT 0,
  inserted_rows   INTEGER NOT NULL DEFAULT 0,
  updated_rows    INTEGER NOT NULL DEFAULT 0,
  error_rows      INTEGER NOT NULL DEFAULT 0,
  -- [{row: 3, field: 'arr', message: 'not a valid number'}, ...]
  errors          JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- INDEXES
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_accounts_csm_id ON accounts(csm_id);
CREATE INDEX IF NOT EXISTS idx_accounts_renewal_date ON accounts(renewal_date);
CREATE INDEX IF NOT EXISTS idx_accounts_sentiment ON accounts(sentiment);
CREATE INDEX IF NOT EXISTS idx_accounts_org_id ON accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_contacts_account_id ON contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_tasks_account_id ON tasks(account_id);
CREATE INDEX IF NOT EXISTS idx_tasks_owner_id ON tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_account_id ON meeting_notes(account_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_meeting_date ON meeting_notes(meeting_date);
CREATE INDEX IF NOT EXISTS idx_success_plans_account_id ON success_plans(account_id);

-- ----------------------------------------------------------------
-- updated_at TRIGGER
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_accounts_updated_at ON accounts;
CREATE TRIGGER trg_accounts_updated_at
  BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_contacts_updated_at ON contacts;
CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks;
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_success_plans_updated_at ON success_plans;
CREATE TRIGGER trg_success_plans_updated_at
  BEFORE UPDATE ON success_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_meeting_notes_updated_at ON meeting_notes;
CREATE TRIGGER trg_meeting_notes_updated_at
  BEFORE UPDATE ON meeting_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_account_integrations_updated_at ON account_integrations;
CREATE TRIGGER trg_account_integrations_updated_at
  BEFORE UPDATE ON account_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
