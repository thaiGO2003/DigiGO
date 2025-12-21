-- Cập nhật trigger handle_new_user để hỗ trợ mã giới thiệu ngay khi đăng ký
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
BEGIN
  -- 1. Tạo mã giới thiệu riêng cho user mới (8 ký tự hex viết hoa)
  v_referral_code := upper(substring(md5(random()::text || NEW.id::text) from 1 for 8));
  
  -- 2. Lấy mã giới thiệu được cung cấp (nếu có) từ metadata
  v_provided_referral_code := NEW.raw_user_meta_data->>'referral_code';
  
  -- 3. Tìm ID người giới thiệu nếu mã hợp lệ
  IF v_provided_referral_code IS NOT NULL AND v_provided_referral_code <> '' THEN
    SELECT id INTO v_referred_by
    FROM public.users
    WHERE referral_code = upper(v_provided_referral_code);
  END IF;

  -- 4. Thêm user vào bảng public.users
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
    CASE WHEN NEW.email = 'luongquocthai.thaigo.2003@gmail.com' THEN true ELSE false END,
    v_referral_code,
    v_referred_by,
    upper(NEW.raw_user_meta_data->>'username')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    username = EXCLUDED.username,
    referred_by = COALESCE(users.referred_by, EXCLUDED.referred_by);

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
