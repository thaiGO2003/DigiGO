-- Function to get referrer info safely
CREATE OR REPLACE FUNCTION get_referrer_info(p_referrer_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  -- Check if user exists
  SELECT COALESCE(full_name, username, split_part(email, '@', 1))
  INTO v_name
  FROM public.users
  WHERE id = p_referrer_id;

  IF v_name IS NULL THEN
    RETURN json_build_object('name', 'Người dùng ẩn danh');
  END IF;

  RETURN json_build_object('name', v_name);
END;
$$;

GRANT EXECUTE ON FUNCTION get_referrer_info(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
