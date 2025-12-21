-- RPC cho phép người dùng tự cập nhật họ tên
CREATE OR REPLACE FUNCTION update_full_name(p_full_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  -- Chuẩn hóa input (trim) và giới hạn độ dài cơ bản
  IF p_full_name IS NULL OR length(trim(p_full_name)) = 0 THEN
    RETURN json_build_object('success', false, 'message', 'Họ tên không được bỏ trống');
  END IF;

  IF length(trim(p_full_name)) > 120 THEN
    RETURN json_build_object('success', false, 'message', 'Họ tên quá dài (tối đa 120 ký tự)');
  END IF;

  UPDATE users
  SET full_name = trim(p_full_name)
  WHERE id = v_user_id;

  -- Đồng bộ metadata trong auth.users (để các trigger/edge functions nhận được giá trị mới)
  UPDATE auth.users
  SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('full_name', trim(p_full_name))
  WHERE id = v_user_id;

  RETURN json_build_object('success', true, 'message', 'Cập nhật họ tên thành công');
END;
$$;
