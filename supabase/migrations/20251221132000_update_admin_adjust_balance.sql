-- Cập nhật function admin_adjust_balance để cập nhật total_deposited khi nạp tiền
CREATE OR REPLACE FUNCTION admin_adjust_balance(
  p_user_id uuid,
  p_amount bigint,
  p_note text DEFAULT 'Điều chỉnh bởi Admin'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Kiểm tra quyền Admin
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Cập nhật số dư và tổng tiền nạp nếu là nạp tiền (amount > 0)
  UPDATE users
  SET balance = balance + p_amount,
      total_deposited = CASE 
        WHEN p_amount > 0 THEN total_deposited + p_amount 
        ELSE total_deposited 
      END
  WHERE id = p_user_id;

  -- Ghi nhận giao dịch điều chỉnh
  INSERT INTO transactions (user_id, amount, type, status, metadata)
  VALUES (p_user_id, p_amount, 'top_up', 'completed', jsonb_build_object('note', p_note, 'is_admin_adjustment', true));

  RETURN json_build_object('success', true, 'message', 'Đã điều chỉnh số dư thành công');
END;
$$;

NOTIFY pgrst, 'reload schema';