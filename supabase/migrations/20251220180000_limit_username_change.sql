-- Add last_username_change column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_username_change timestamptz;

-- RPC to update username with time constraint (once per 24h)
CREATE OR REPLACE FUNCTION update_username(p_new_username text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_last_change timestamptz;
  v_current_username text;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  -- Validate username format
  IF p_new_username !~ '^[a-zA-Z0-9_]{3,50}$' THEN
    RETURN json_build_object('success', false, 'message', 'Tên đăng nhập không hợp lệ (3-50 ký tự, chỉ chữ, số và gạch dưới)');
  END IF;

  -- Get current user info
  SELECT username, last_username_change INTO v_current_username, v_last_change
  FROM users
  WHERE id = v_user_id;

  -- If username hasn't changed, do nothing
  IF v_current_username = p_new_username THEN
    RETURN json_build_object('success', true, 'message', 'Không có thay đổi');
  END IF;

  -- Check time constraint (24 hours)
  IF v_last_change IS NOT NULL AND v_last_change > (now() - interval '24 hours') THEN
     RETURN json_build_object(
       'success', false, 
       'message', 'Bạn chỉ có thể đổi tên đăng nhập 1 lần mỗi 24 giờ. Vui lòng thử lại sau ' || 
       to_char((v_last_change + interval '24 hours'), 'DD/MM/YYYY HH24:MI')
     );
  END IF;

  -- Check uniqueness
  IF EXISTS (SELECT 1 FROM users WHERE username = p_new_username AND id != v_user_id) THEN
    RETURN json_build_object('success', false, 'message', 'Tên đăng nhập đã tồn tại');
  END IF;

  -- Update username
  UPDATE users
  SET 
    username = p_new_username,
    last_username_change = now()
  WHERE id = v_user_id;

  -- Also update raw_user_meta_data in auth.users for consistency (optional but good for auth hooks)
  UPDATE auth.users
  SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('username', p_new_username)
  WHERE id = v_user_id;

  RETURN json_build_object('success', true, 'message', 'Cập nhật tên đăng nhập thành công');
END;
$$;
