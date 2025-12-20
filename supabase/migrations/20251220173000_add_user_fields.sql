-- Thêm cột username vào bảng users
ALTER TABLE users ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Cập nhật trigger handle_new_user để lấy metadata (full_name, username) từ auth.users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_code text;
BEGIN
  -- Generate unique referral code (8 random hex chars)
  v_referral_code := upper(substring(md5(random()::text || NEW.id::text) from 1 for 8));
  
  INSERT INTO users (id, email, is_admin, referral_code, full_name, username)
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN NEW.email = 'luongquocthai.thaigo.2003@gmail.com' THEN true ELSE false END,
    v_referral_code,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'username'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    username = EXCLUDED.username;

  RETURN NEW;
END;
$$;
