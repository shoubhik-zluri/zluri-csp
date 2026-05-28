-- ============================================================
-- 0002_rls_policies.sql
-- Row Level Security + Auth Triggers
-- ============================================================

-- ----------------------------------------------------------------
-- Helper: auto-insert profiles row when a new user signs up
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ----------------------------------------------------------------
-- PROFILES RLS
-- ----------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "profiles_select_members_viewers" ON profiles;
CREATE POLICY "profiles_select_members_viewers" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('member', 'viewer', 'collaborator'))
  );

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ----------------------------------------------------------------
-- ACCOUNTS RLS
-- ----------------------------------------------------------------
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounts_select_admin_viewer" ON accounts;
CREATE POLICY "accounts_select_admin_viewer" ON accounts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'viewer', 'collaborator'))
  );

DROP POLICY IF EXISTS "accounts_select_member" ON accounts;
CREATE POLICY "accounts_select_member" ON accounts
  FOR SELECT USING (
    csm_id = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'member')
  );

DROP POLICY IF EXISTS "accounts_all_admin" ON accounts;
CREATE POLICY "accounts_all_admin" ON accounts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "accounts_update_member" ON accounts;
CREATE POLICY "accounts_update_member" ON accounts
  FOR UPDATE USING (
    csm_id = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'member')
  );

-- ----------------------------------------------------------------
-- CONTACTS RLS
-- ----------------------------------------------------------------
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contacts_select" ON contacts;
CREATE POLICY "contacts_select" ON contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM accounts a
      WHERE a.id = contacts.account_id
        AND (
          EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'viewer', 'collaborator'))
          OR (a.csm_id = auth.uid() AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'member'))
        )
    )
  );

DROP POLICY IF EXISTS "contacts_write" ON contacts;
CREATE POLICY "contacts_write" ON contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM accounts a
      JOIN profiles p ON p.id = auth.uid()
      WHERE a.id = contacts.account_id
        AND (p.role = 'admin' OR (p.role = 'member' AND a.csm_id = auth.uid()))
    )
  );

-- ----------------------------------------------------------------
-- SUCCESS_PLANS RLS
-- ----------------------------------------------------------------
ALTER TABLE success_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "success_plans_select" ON success_plans;
CREATE POLICY "success_plans_select" ON success_plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM accounts a
      WHERE a.id = success_plans.account_id
        AND (
          EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'viewer', 'collaborator'))
          OR (a.csm_id = auth.uid() AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'member'))
        )
    )
  );

DROP POLICY IF EXISTS "success_plans_write" ON success_plans;
CREATE POLICY "success_plans_write" ON success_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM accounts a
      JOIN profiles p ON p.id = auth.uid()
      WHERE a.id = success_plans.account_id
        AND (p.role = 'admin' OR (p.role = 'member' AND a.csm_id = auth.uid()))
    )
  );

-- ----------------------------------------------------------------
-- TASKS RLS
-- ----------------------------------------------------------------
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select" ON tasks;
CREATE POLICY "tasks_select" ON tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM accounts a
      WHERE a.id = tasks.account_id
        AND (
          EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'viewer', 'collaborator'))
          OR (a.csm_id = auth.uid() AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'member'))
        )
    )
  );

DROP POLICY IF EXISTS "tasks_write" ON tasks;
CREATE POLICY "tasks_write" ON tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM accounts a
      JOIN profiles p ON p.id = auth.uid()
      WHERE a.id = tasks.account_id
        AND (p.role = 'admin' OR (p.role = 'member' AND a.csm_id = auth.uid()))
    )
  );

-- ----------------------------------------------------------------
-- MEETING_NOTES RLS
-- ----------------------------------------------------------------
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meeting_notes_select" ON meeting_notes;
CREATE POLICY "meeting_notes_select" ON meeting_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM accounts a
      WHERE a.id = meeting_notes.account_id
        AND (
          EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'viewer', 'collaborator'))
          OR (a.csm_id = auth.uid() AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'member'))
        )
    )
  );

DROP POLICY IF EXISTS "meeting_notes_write" ON meeting_notes;
CREATE POLICY "meeting_notes_write" ON meeting_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM accounts a
      JOIN profiles p ON p.id = auth.uid()
      WHERE a.id = meeting_notes.account_id
        AND (p.role = 'admin' OR (p.role = 'member' AND a.csm_id = auth.uid()))
    )
  );

-- ----------------------------------------------------------------
-- ACCOUNT_INTEGRATIONS RLS (admin only)
-- ----------------------------------------------------------------
ALTER TABLE account_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "account_integrations_admin_only" ON account_integrations;
CREATE POLICY "account_integrations_admin_only" ON account_integrations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "account_integrations_select_members_viewers" ON account_integrations;
CREATE POLICY "account_integrations_select_members_viewers" ON account_integrations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('member', 'viewer'))
  );

-- ----------------------------------------------------------------
-- IMPORT_LOGS RLS (admin only)
-- ----------------------------------------------------------------
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "import_logs_admin_only" ON import_logs;
CREATE POLICY "import_logs_admin_only" ON import_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
