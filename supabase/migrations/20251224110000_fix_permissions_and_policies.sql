-- 1. Grant permissions to allow profile creation
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.users TO service_role;
GRANT SELECT, UPDATE, INSERT ON TABLE public.users TO authenticated;
GRANT SELECT ON TABLE public.users TO anon;

-- 2. Add INSERT policy for users (Enable self-healing from client side if needed)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 3. Ensure Trigger is strictly Security Definier and Owner has rights
ALTER FUNCTION handle_new_user() OWNER TO postgres;
ALTER FUNCTION ensure_user_profile_exists() OWNER TO postgres;

-- 4. Re-apply Trigger just to be safe (and ensure it handles duplicates)
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
  
  -- Find referrer
  IF v_provided_referral_code IS NOT NULL AND v_provided_referral_code <> '' THEN
    SELECT id INTO v_referred_by FROM public.users WHERE referral_code = upper(v_provided_referral_code);
  END IF;

  -- Insert or Update
  INSERT INTO public.users (id, email, full_name, is_admin, referral_code, referred_by, username)
  VALUES (NEW.id, NEW.email, v_full_name, v_is_admin, v_referral_code, v_referred_by, v_username)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    username = EXCLUDED.username,
    is_admin = EXCLUDED.is_admin,
    referred_by = COALESCE(users.referred_by, EXCLUDED.referred_by);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the Auth transaction
  RAISE WARNING 'Trigger handle_new_user failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
