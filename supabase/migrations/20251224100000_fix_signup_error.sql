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
  v_username text;
  v_full_name text;
BEGIN
  -- 1. Tạo mã giới thiệu ngẫu nhiên
  v_referral_code := upper(substring(md5(random()::text || NEW.id::text) from 1 for 8));
  
  -- 2. Lấy thông tin từ metadata
  v_provided_referral_code := NEW.raw_user_meta_data->>'referral_code';
  v_full_name := NEW.raw_user_meta_data->>'full_name';
  v_is_admin := (NEW.email = 'luongquocthai.thaigo.2003@gmail.com');
  
  -- Tạo username từ metadata hoặc từ email nếu không có
  v_username := upper(COALESCE(
    NEW.raw_user_meta_data->>'username', 
    substring(NEW.email from 1 for position('@' in NEW.email)-1)
  ));
  
  -- 3. Tìm người giới thiệu
  IF v_provided_referral_code IS NOT NULL AND v_provided_referral_code <> '' THEN
    SELECT id INTO v_referred_by
    FROM public.users
    WHERE referral_code = upper(v_provided_referral_code);
  END IF;

  -- 4. Insert an toàn với Exception Handling
  BEGIN
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
      v_full_name,
      v_is_admin,
      v_referral_code,
      v_referred_by,
      v_username
    );
  EXCEPTION 
    WHEN unique_violation THEN
      -- Nếu trùng ID (đã tồn tại), update lại thông tin
      -- Điều này xử lý trường hợp trigger chạy 2 lần hoặc retry
      UPDATE public.users SET
        email = NEW.email,
        full_name = v_full_name,
        username = v_username,
        is_admin = v_is_admin,
        referred_by = COALESCE(users.referred_by, v_referred_by) -- Chỉ update nếu chưa có người giới thiệu
      WHERE id = NEW.id;
    WHEN others THEN
      -- Log lỗi nhưng không chặn quy trình đăng ký Auth (để user vẫn được tạo trong Auth)
      -- Tuy nhiên, việc thiếu profile public.users sẽ gây lỗi sau này.
      -- Tốt nhất là RAISE WARNING để debug.
      RAISE WARNING 'Error creating public user profile: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
