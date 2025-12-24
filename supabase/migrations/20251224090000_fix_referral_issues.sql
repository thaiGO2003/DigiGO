-- 1. Function to check if a referral code exists (for frontend validation)
CREATE OR REPLACE FUNCTION check_referral_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users WHERE referral_code = upper(p_code)
  );
END;
$$;

-- 2. Ensure there is no UNIQUE constraint on referred_by
DO $$
BEGIN
  -- Check and drop unique constraint if it exists (by name convention)
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_referred_by_key'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_referred_by_key;
  END IF;

  -- Also check for unique index
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'users_referred_by_key' AND n.nspname = 'public'
  ) THEN
    DROP INDEX IF EXISTS users_referred_by_key;
  END IF;
END $$;

-- 3. Ensure referred_by index exists (non-unique) for performance
CREATE INDEX IF NOT EXISTS users_referred_by_idx ON users(referred_by);

NOTIFY pgrst, 'reload schema';
