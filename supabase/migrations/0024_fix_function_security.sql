-- Fix Supabase security advisor warnings:
-- 1. Function Search Path Mutable — add SET search_path = '' to all 6 functions
-- 2. Public/anon can execute SECURITY DEFINER functions — revoke where not needed
--
-- get_my_role: keep EXECUTE for authenticated (legitimately called by signed-in users)
-- handle_new_user: revoke from all roles (trigger only, never called directly)

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY INVOKER
   SET search_path = '';

CREATE OR REPLACE FUNCTION public.trg_fn_custom_field_defs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY INVOKER
   SET search_path = '';

CREATE OR REPLACE FUNCTION public.trg_fn_custom_field_values_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY INVOKER
   SET search_path = '';

CREATE OR REPLACE FUNCTION public.trg_fn_task_views_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY INVOKER
   SET search_path = '';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = '';

CREATE OR REPLACE FUNCTION public.sync_project_task_counts()
RETURNS trigger LANGUAGE plpgsql
   SECURITY INVOKER
   SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.project_id IS NOT NULL THEN
      UPDATE public.projects SET
        tasks_total = (SELECT count(*) FROM public.tasks WHERE project_id = OLD.project_id),
        tasks_done  = (SELECT count(*) FROM public.tasks WHERE project_id = OLD.project_id AND status = 'completed')
      WHERE id = OLD.project_id;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.project_id IS NOT NULL THEN
    UPDATE public.projects SET
      tasks_total = (SELECT count(*) FROM public.tasks WHERE project_id = NEW.project_id),
      tasks_done  = (SELECT count(*) FROM public.tasks WHERE project_id = NEW.project_id AND status = 'completed')
    WHERE id = NEW.project_id;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.project_id IS NOT NULL AND OLD.project_id IS DISTINCT FROM NEW.project_id THEN
    UPDATE public.projects SET
      tasks_total = (SELECT count(*) FROM public.tasks WHERE project_id = OLD.project_id),
      tasks_done  = (SELECT count(*) FROM public.tasks WHERE project_id = OLD.project_id AND status = 'completed')
    WHERE id = OLD.project_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;

REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- Addendum: switch get_my_role to SECURITY INVOKER (no elevated privileges needed)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;
