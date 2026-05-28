-- ============================================================
-- 0018_custom_fields.sql
-- Sprint 3D: workspace-level custom field definitions + per-task values
-- ============================================================

-- 1. Field definitions (workspace-scoped, ordered by position)
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  field_type  TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'single_select', 'multi_select')),
  options     JSONB NOT NULL DEFAULT '[]',   -- string[] for select field choices
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  position    INTEGER NOT NULL DEFAULT 0,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_field_defs_position ON custom_field_definitions(position);

CREATE OR REPLACE FUNCTION trg_fn_custom_field_defs_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_custom_field_defs_updated_at ON custom_field_definitions;
CREATE TRIGGER trg_custom_field_defs_updated_at
  BEFORE UPDATE ON custom_field_definitions
  FOR EACH ROW EXECUTE FUNCTION trg_fn_custom_field_defs_updated_at();

-- 2. Per-task values (value stored as JSONB — typed by field_type)
CREATE TABLE IF NOT EXISTS custom_field_values (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  field_id   UUID NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  value      JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_field_values_task ON custom_field_values(task_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_field ON custom_field_values(field_id);

CREATE OR REPLACE FUNCTION trg_fn_custom_field_values_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_custom_field_values_updated_at ON custom_field_values;
CREATE TRIGGER trg_custom_field_values_updated_at
  BEFORE UPDATE ON custom_field_values
  FOR EACH ROW EXECUTE FUNCTION trg_fn_custom_field_values_updated_at();

-- 3. RLS — definitions readable/writable by all authenticated users for now
--    (workspace-level restriction can be added when multi-tenant is implemented)
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "custom_field_defs_auth" ON custom_field_definitions;
CREATE POLICY "custom_field_defs_auth" ON custom_field_definitions
  FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "custom_field_values_auth" ON custom_field_values;
CREATE POLICY "custom_field_values_auth" ON custom_field_values
  FOR ALL USING (auth.role() = 'authenticated');
