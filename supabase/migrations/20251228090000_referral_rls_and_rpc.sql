DROP POLICY IF EXISTS "Users can read referred users" ON public.users;
CREATE POLICY "Users can read referred users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (referred_by = auth.uid());

CREATE OR REPLACE FUNCTION get_referral_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_total integer;
  v_monthly bigint;
  v_total_earn bigint;
  v_users json;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_agg(json_build_object(
    'id', u.id,
    'email', u.email,
    'full_name', u.full_name,
    'created_at', u.created_at
  ) ORDER BY u.created_at DESC) INTO v_users
  FROM public.users u
  WHERE u.referred_by = v_uid;

  SELECT count(*) INTO v_total FROM public.users WHERE referred_by = v_uid;

  SELECT coalesce(sum(amount), 0) INTO v_total_earn
  FROM public.referral_earnings
  WHERE referrer_id = v_uid;

  SELECT coalesce(sum(amount), 0) INTO v_monthly
  FROM public.referral_earnings
  WHERE referrer_id = v_uid
    AND date_trunc('month', created_at) = date_trunc('month', now());

  RETURN json_build_object(
    'totalReferrals', v_total,
    'monthlyEarnings', v_monthly,
    'totalEarnings', v_total_earn,
    'users', coalesce(v_users, '[]'::json)
  );
END;
$$;
