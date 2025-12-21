-- Thêm trường total_deposited để theo dõi tổng tiền nạp của user
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_deposited bigint DEFAULT 0;

-- Thêm trường rank nếu chưa có
ALTER TABLE users ADD COLUMN IF NOT EXISTS rank text DEFAULT 'bronze';

-- Tạo function để cập nhật rank dựa trên tổng tiền nạp
CREATE OR REPLACE FUNCTION update_user_rank_on_deposit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_rank text;
BEGIN
  -- Xác định rank mới dựa trên tổng tiền nạp
  IF NEW.total_deposited >= 5000000 THEN  -- 5 triệu
    v_new_rank := 'diamond';
  ELSIF NEW.total_deposited >= 3000000 THEN  -- 3 triệu
    v_new_rank := 'platinum';
  ELSIF NEW.total_deposited >= 2000000 THEN  -- 2 triệu
    v_new_rank := 'gold';
  ELSIF NEW.total_deposited >= 1000000 THEN  -- 1 triệu
    v_new_rank := 'silver';
  ELSIF NEW.total_deposited >= 500000 THEN  -- 500K
    v_new_rank := 'bronze';
  ELSE
    v_new_rank := 'bronze';
  END IF;

  -- Cập nhật rank nếu khác rank hiện tại
  IF NEW.rank IS NULL OR NEW.rank != v_new_rank THEN
    NEW.rank := v_new_rank;
  END IF;

  RETURN NEW;
END;
$$;

-- Tạo trigger để tự động cập nhật rank khi total_deposited thay đổi
CREATE TRIGGER trigger_update_user_rank
  BEFORE UPDATE OF total_deposited ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rank_on_deposit();

-- Cập nhật rank cho users hiện tại dựa trên tổng tiền đã nạp
UPDATE users 
SET rank = CASE 
  WHEN total_deposited >= 5000000 THEN 'diamond'
  WHEN total_deposited >= 3000000 THEN 'platinum'
  WHEN total_deposited >= 2000000 THEN 'gold'
  WHEN total_deposited >= 1000000 THEN 'silver'
  WHEN total_deposited >= 500000 THEN 'bronze'
  ELSE 'bronze'
END;

NOTIFY pgrst, 'reload schema';