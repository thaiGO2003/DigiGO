-- Function to ensure user profile exists (self-healing)
CREATE OR REPLACE FUNCTION ensure_user_profile_exists()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_meta jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Check if profile exists
  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    RETURN json_build_object('success', true, 'message', 'Profile already exists');
  END IF;

  -- Get email and meta from auth.users (requires permission or assumption)
  -- Since we are SECURITY DEFINER, we might not have direct access to auth.users if not granted.
  -- But we can try to just insert with minimal info we know (id).
  -- Actually, we can't easily query auth.users from here without extra setup.
  -- However, we can use auth.jwt() to get email if available? 
  -- Or just Insert with defaults and let the user update later.
  
  -- Attempt to recover from auth.users info?
  -- A safer way is to just Insert a basic record.
  
  INSERT INTO public.users (id, email, full_name, username, referral_code)
  SELECT 
    v_user_id,
    auth.jwt() ->> 'email',
    COALESCE(auth.jwt() ->> 'full_name', 'User'),
    COALESCE(auth.jwt() ->> 'username', 'user_' || substring(v_user_id::text, 1, 8)),
    upper(substring(md5(random()::text || v_user_id::text) from 1 for 8))
  ON CONFLICT (id) DO NOTHING;

  RETURN json_build_object('success', true, 'message', 'Profile created');
END;
$$;

GRANT EXECUTE ON FUNCTION ensure_user_profile_exists() TO authenticated;

NOTIFY pgrst, 'reload schema';
