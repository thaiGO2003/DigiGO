-- Cập nhật hệ thống hạng: thêm "newbie" (Tân binh) cho users chưa nạp 500K

-- Cập nhật function để bao gồm hạng tân binh
CREATE OR REPLACE FUNCTION update_user_rank_on_deposit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_rank text;
BEGIN
  -- Xác định rank mới dựa trên tổng tiền nạp
  IF NEW.total_deposited >= 5000000 THEN  -- 5 triệu -> Kim cương
    v_new_rank := 'diamond';
  ELSIF NEW.total_deposited >= 3000000 THEN  -- 3 triệu -> Platinum
    v_new_rank := 'platinum';
  ELSIF NEW.total_deposited >= 2000000 THEN  -- 2 triệu -> Vàng
    v_new_rank := 'gold';
  ELSIF NEW.total_deposited >= 1000000 THEN  -- 1 triệu -> Bạc
    v_new_rank := 'silver';
  ELSIF NEW.total_deposited >= 500000 THEN  -- 500K -> Đồng
    v_new_rank := 'bronze';
  ELSE
    v_new_rank := 'newbie';  -- Dưới 500K -> Tân binh
  END IF;

  -- Cập nhật rank nếu khác rank hiện tại
  IF NEW.rank IS NULL OR NEW.rank != v_new_rank THEN
    NEW.rank := v_new_rank;
  END IF;

  RETURN NEW;
END;
$$;

-- Cập nhật rank cho users hiện tại
UPDATE users 
SET rank = CASE 
  WHEN total_deposited >= 5000000 THEN 'diamond'
  WHEN total_deposited >= 3000000 THEN 'platinum'
  WHEN total_deposited >= 2000000 THEN 'gold'
  WHEN total_deposited >= 1000000 THEN 'silver'
  WHEN total_deposited >= 500000 THEN 'bronze'
  ELSE 'newbie'
END;

-- Đặt default cho users mới là 'newbie'
ALTER TABLE users ALTER COLUMN rank SET DEFAULT 'newbie';

NOTIFY pgrst, 'reload schema';
