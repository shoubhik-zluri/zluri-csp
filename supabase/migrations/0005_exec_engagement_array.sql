-- Convert exec_engagement from single TEXT to TEXT[] (multi-select)
-- Must drop CHECK constraint first before changing column type.

DO $$
DECLARE
  cname TEXT;
BEGIN
  FOR cname IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE t.relname = 'accounts'
      AND n.nspname = 'public'
      AND c.contype = 'c'
      AND a.attname = 'exec_engagement'
  LOOP
    EXECUTE 'ALTER TABLE accounts DROP CONSTRAINT ' || quote_ident(cname);
  END LOOP;
END $$;

ALTER TABLE accounts
  ALTER COLUMN exec_engagement TYPE TEXT[]
  USING CASE
    WHEN exec_engagement IS NULL THEN NULL
    ELSE ARRAY[exec_engagement]
  END;
