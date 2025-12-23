-- Cập nhật RPC admin_delete_user để xóa cả user trong auth (Supabase Auth)
CREATE OR REPLACE FUNCTION admin_delete_user(
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Kiểm tra quyền Admin an toàn
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Không cho phép xóa chính mình
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete yourself';
  END IF;

  -- Xóa dữ liệu liên quan trong schema public
  DELETE FROM referral_earnings WHERE referrer_id = p_user_id OR referred_user_id = p_user_id;
  DELETE FROM chat_messages WHERE user_id = p_user_id;
  DELETE FROM transactions WHERE user_id = p_user_id;
  DELETE FROM users WHERE id = p_user_id;

  -- Xóa trong Supabase Auth
  -- Xóa identities trước (nếu có), sau đó xóa auth.users
  DELETE FROM auth.identities WHERE user_id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;

  -- Reload schema cho PostgREST
  PERFORM pg_notify('pgrst', 'reload schema');
END;
$$;

