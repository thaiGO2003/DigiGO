-- 1. Cấp quyền Admin cho tài khoản chủ hệ thống trong database public.users
-- Điều này nhằm khắc phục lỗi RLS khiến Admin không xem được thông tin người dùng khác
UPDATE public.users 
SET is_admin = true 
WHERE email = 'luongquocthai.thaigo.2003@gmail.com';

-- 2. Cập nhật RLS cho bảng users để tránh lỗi đệ quy (RLS Recursion)
-- Chuyển sang dùng auth.jwt() hoặc subquery an toàn hơn
DROP POLICY IF EXISTS "Admins can read all users" ON users;
CREATE POLICY "Admins can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    (id = auth.uid()) OR 
    (EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.is_admin = true
    ))
  );

DROP POLICY IF EXISTS "Admins can update all users" ON users;
CREATE POLICY "Admins can update all users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- 3. Cập nhật Trigger để đảm bảo is_admin luôn được đồng bộ khi có update profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_code text;
  v_provided_referral_code text;
  v_referred_by uuid;
  v_is_admin boolean;
BEGIN
  v_referral_code := upper(substring(md5(random()::text || NEW.id::text) from 1 for 8));
  v_provided_referral_code := NEW.raw_user_meta_data->>'referral_code';
  v_is_admin := (NEW.email = 'luongquocthai.thaigo.2003@gmail.com');
  
  IF v_provided_referral_code IS NOT NULL AND v_provided_referral_code <> '' THEN
    SELECT id INTO v_referred_by
    FROM public.users
    WHERE referral_code = upper(v_provided_referral_code);
  END IF;

  INSERT INTO public.users (
    id, 
    email, 
    full_name, 
    is_admin, 
    referral_code, 
    referred_by,
    username
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    v_is_admin,
    v_referral_code,
    v_referred_by,
    upper(COALESCE(NEW.raw_user_meta_data->>'username', substring(NEW.email from 1 for position('@' in NEW.email)-1)))
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    username = EXCLUDED.username,
    is_admin = EXCLUDED.is_admin,
    referred_by = COALESCE(users.referred_by, EXCLUDED.referred_by);

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
