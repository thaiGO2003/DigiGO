-- RPC để tìm email dựa trên username hoặc email
CREATE OR REPLACE FUNCTION get_email_by_identity(p_identity text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  -- Thử tìm theo username
  SELECT email INTO v_email
  FROM users
  WHERE username = p_identity
  LIMIT 1;

  -- Nếu không tìm thấy, thử tìm theo email (chính xác)
  IF v_email IS NULL THEN
    SELECT email INTO v_email
    FROM users
    WHERE email = p_identity
    LIMIT 1;
  END IF;

  RETURN v_email;
END;
$$;
