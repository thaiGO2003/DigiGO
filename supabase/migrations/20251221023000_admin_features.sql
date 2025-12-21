-- Tạo bảng settings để lưu cấu hình hệ thống
CREATE TABLE IF NOT EXISTS global_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Thêm quyền RLS cho global_settings
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings"
  ON global_settings FOR SELECT USING (true);

CREATE POLICY "Admins can manage settings"
  ON global_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));

-- Seed cấu hình mặc định cho hoa hồng mời bạn bè
INSERT INTO global_settings (key, value)
VALUES ('referral_commission_base', '{"percent": 2, "max_percent": 10}')
ON CONFLICT (key) DO NOTHING;

-- RPC điều chỉnh số dư người dùng (chỉ Admin)
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

  -- Cập nhật số dư
  UPDATE users
  SET balance = balance + p_amount
  WHERE id = p_user_id;

  -- Ghi nhận giao dịch điều chỉnh
  INSERT INTO transactions (user_id, amount, type, status, metadata)
  VALUES (p_user_id, p_amount, 'top_up', 'completed', jsonb_build_object('note', p_note, 'is_admin_adjustment', true));

  RETURN json_build_object('success', true, 'message', 'Đã điều chỉnh số dư thành công');
END;
$$;

NOTIFY pgrst, 'reload schema';
