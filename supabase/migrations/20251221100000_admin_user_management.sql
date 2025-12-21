-- Thêm cột is_banned vào bảng users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

-- RPC để khóa/mở khóa user
CREATE OR REPLACE FUNCTION admin_toggle_ban_user(
  p_user_id uuid,
  p_status boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Kiểm tra quyền admin
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
    AND (email = 'luongquocthai.thaigo.2003@gmail.com' OR is_admin = true)
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Không thể ban chính mình
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot ban yourself';
  END IF;

  UPDATE users
  SET is_banned = p_status
  WHERE id = p_user_id;
END;
$$;

-- RPC để xóa user
CREATE OR REPLACE FUNCTION admin_delete_user(
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Kiểm tra quyền admin
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Không thể xóa chính mình
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete yourself';
  END IF;

  -- Xóa dữ liệu liên quan (Cascade logical delete hoặc hard delete tùy nhu cầu)
  -- Ở đây ta sẽ xóa trực tiếp trong bảng public.users
  -- Các bảng khác như transactions, messages nên có constraint ON DELETE CASCADE hoặc SET NULL
  -- Nếu chưa có, ta cần xóa thủ công trước
  
  DELETE FROM referral_earnings WHERE referrer_id = p_user_id OR referred_user_id = p_user_id;
  DELETE FROM chat_messages WHERE user_id = p_user_id;
  
  -- Transactions: Giữ hay xóa? Thường nên giữ để đối soát tài chính, nhưng nếu xóa user thì transactions tham chiếu user_id sẽ lỗi nếu không có ON DELETE CASCADE
  -- Nếu muốn xóa sạch:
  DELETE FROM transactions WHERE user_id = p_user_id;

  -- Cuối cùng xóa user profile
  DELETE FROM users WHERE id = p_user_id;
  
  -- Lưu ý: User trong auth.users vẫn còn nhưng sẽ không đăng nhập được app vì không có public profile
END;
$$;
