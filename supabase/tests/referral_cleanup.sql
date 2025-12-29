DO $$
DECLARE
  a_id uuid;
  b_id uuid;
  c_id uuid;
  a_email text := 'a_test@example.com';
  b_email text := 'b_test@example.com';
  c_email text := 'c_test@example.com';
  a_ref_code text;
  a2_ref_code text;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), a_email) RETURNING id INTO a_id;
  PERFORM handle_new_user() FROM auth.users WHERE id = a_id;
  SELECT referral_code INTO a_ref_code FROM public.users WHERE id = a_id;

  INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), b_email) RETURNING id INTO b_id;
  PERFORM handle_new_user() FROM auth.users WHERE id = b_id;
  PERFORM set_referrer(b_id, a_ref_code);

  DELETE FROM auth.users WHERE id = a_id;

  INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), a_email) RETURNING id INTO a_id;
  PERFORM handle_new_user() FROM auth.users WHERE id = a_id;
  SELECT referral_code INTO a2_ref_code FROM public.users WHERE id = a_id;

  INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), c_email) RETURNING id INTO c_id;
  PERFORM handle_new_user() FROM auth.users WHERE id = c_id;
  PERFORM set_referrer(c_id, a2_ref_code);

  ASSERT (SELECT referred_by IS NULL FROM public.users WHERE email = b_email);
  ASSERT (SELECT count(*) FROM public.users WHERE referred_by = a_id) = 1;
END $$;
