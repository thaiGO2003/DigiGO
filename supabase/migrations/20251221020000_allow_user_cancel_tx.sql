-- Cho phép người dùng cập nhật trạng thái giao dịch của chính họ (để hủy đơn)
-- Chỉ cho phép cập nhật nếu trạng thái hiện tại là 'pending'
CREATE POLICY "Users can update own pending transactions"
  ON transactions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid() AND status IN ('failed', 'pending'));
