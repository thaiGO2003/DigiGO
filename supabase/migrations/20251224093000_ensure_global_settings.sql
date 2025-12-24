-- 1. Create global_settings table if not exists
CREATE TABLE IF NOT EXISTS global_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Everyone can read settings (for frontend to display or functions to use)
DROP POLICY IF EXISTS "Everyone can read global_settings" ON global_settings;
CREATE POLICY "Everyone can read global_settings" ON global_settings
  FOR SELECT TO anon, authenticated
  USING (true);

-- 4. Policy: Only admin can update (optional, for now just ensure access)
-- (We assume direct DB access for admin or specific admin functions)

-- 5. Insert or Update configuration
-- Buyer discount: 1% (User reported text says 1%)
INSERT INTO global_settings (key, value)
VALUES ('referral_buyer_discount', '{"percent": 1}')
ON CONFLICT (key) DO UPDATE
SET value = '{"percent": 1}';

-- Referrer commission base: 1% per referral, max 10%
INSERT INTO global_settings (key, value)
VALUES ('referral_commission_base', '{"percent": 1, "max_percent": 10}')
ON CONFLICT (key) DO UPDATE
SET value = '{"percent": 1, "max_percent": 10}';

NOTIFY pgrst, 'reload schema';
