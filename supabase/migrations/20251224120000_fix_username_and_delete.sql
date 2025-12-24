-- 1. Function to check username existence (safe for frontend)
CREATE OR REPLACE FUNCTION check_username_exists(p_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE username = upper(p_username)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION check_username_exists(text) TO anon, authenticated, service_role;

-- 2. Function to delete user completely (Auth + Public)
-- Only accessible by admins (checked via RLS or logic inside)
CREATE OR REPLACE FUNCTION delete_user_completely(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if requestor is admin
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can delete users';
  END IF;

  -- Delete from auth.users (This should cascade to public.users if FK is set ON DELETE CASCADE)
  -- We need to reference auth.users explicitly.
  -- Note: This requires the function to have permissions to delete from auth.users.
  -- SECURITY DEFINER with postgres/service_role usually works.
  DELETE FROM auth.users WHERE id = p_user_id;
  
  -- If FK is not set to cascade, we might need to delete from public.users manually first/after.
  -- But usually auth.users is the parent.
  -- Let's ensure we delete from public.users just in case constraint prevents it.
  -- DELETE FROM public.users WHERE id = p_user_id; 
  -- (Assuming auth.users delete cascades or we do it here)
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_completely(uuid) TO authenticated;

-- 3. Update Trigger to NOT swallow unique violations for Username
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
  -- Generate basic info
  v_referral_code := upper(substring(md5(random()::text || NEW.id::text) from 1 for 8));
  v_provided_referral_code := NEW.raw_user_meta_data->>'referral_code';
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'User');
  v_is_admin := (NEW.email = 'luongquocthai.thaigo.2003@gmail.com');
  v_username := upper(COALESCE(
    NEW.raw_user_meta_data->>'username', 
    substring(NEW.email from 1 for position('@' in NEW.email)-1)
  ));
  
  -- Check if username exists manually to give a clear error
  IF EXISTS (SELECT 1 FROM public.users WHERE username = v_username) THEN
    RAISE EXCEPTION 'Username % is already taken', v_username;
  END IF;

  -- Find referrer
  IF v_provided_referral_code IS NOT NULL AND v_provided_referral_code <> '' THEN
    SELECT id INTO v_referred_by FROM public.users WHERE referral_code = upper(v_provided_referral_code);
  END IF;

  -- Insert
  INSERT INTO public.users (id, email, full_name, is_admin, referral_code, referred_by, username)
  VALUES (NEW.id, NEW.email, v_full_name, v_is_admin, v_referral_code, v_referred_by, v_username);

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
