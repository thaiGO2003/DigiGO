/*
  # Fix User Update Policy and Schema

  1. Changes
    - Ensure `full_name` column exists in `users` table
    - Update RLS policy for `users` table to explicitly allow updates with CHECK
*/

-- Ensure full_name column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE users ADD COLUMN full_name text;
  END IF;
END $$;

-- Re-create update policy to ensure it works correctly
DROP POLICY IF EXISTS "Users can update own data" ON users;

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
