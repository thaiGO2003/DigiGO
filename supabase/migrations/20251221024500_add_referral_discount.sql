-- Thêm cấu hình giảm giá cho người được giới thiệu
INSERT INTO global_settings (key, value)
VALUES ('referral_buyer_discount', '{"percent": 5}')
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';

-- Cập nhật hàm mua hàng để áp dụng giảm giá cho người được giới thiệu
CREATE OR REPLACE FUNCTION purchase_product(
  p_variant_id uuid,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_variant_price bigint;
  v_user_balance bigint;
  v_key_id uuid;
  v_key_value text;
  v_transaction_id uuid;
  v_referrer_id uuid;
  v_commission_settings jsonb;
  v_buyer_discount_settings jsonb;
  v_base_percent integer;
  v_max_percent integer;
  v_buyer_discount_percent integer;
  v_final_price bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Invalid user';
  END IF;

  -- 1. Lấy giá gốc của biến thể (đã trừ % giảm giá chung của sản phẩm)
  SELECT 
    ROUND(price * (100 - COALESCE(discount_percent, 0)) / 100.0)
  INTO v_variant_price
  FROM product_variants
  WHERE id = p_variant_id;

  IF v_variant_price IS NULL THEN
    RAISE EXCEPTION 'Product variant not found';
  END IF;

  -- 2. Kiểm tra xem user có người giới thiệu không để áp dụng thêm giảm giá
  SELECT referred_by INTO v_referrer_id
  FROM users
  WHERE id = p_user_id;

  v_final_price := v_variant_price;

  IF v_referrer_id IS NOT NULL THEN
    SELECT value INTO v_buyer_discount_settings FROM global_settings WHERE key = 'referral_buyer_discount';
    v_buyer_discount_percent := (v_buyer_discount_settings->>'percent')::integer;
    
    IF v_buyer_discount_percent > 0 THEN
      v_final_price := ROUND(v_variant_price * (100 - v_buyer_discount_percent) / 100.0);
    END IF;
  END IF;

  -- 3. Check user balance
  SELECT balance INTO v_user_balance
  FROM users
  WHERE id = p_user_id;

  IF v_user_balance < v_final_price THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- 4. Find available key (lock row)
  SELECT id, key_value INTO v_key_id, v_key_value
  FROM product_keys
  WHERE variant_id = p_variant_id AND is_used = false
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_key_id IS NULL THEN
    RAISE EXCEPTION 'Out of stock';
  END IF;

  -- 5. Deduct balance
  UPDATE users
  SET balance = balance - v_final_price
  WHERE id = p_user_id;

  -- 6. Mark key as used
  UPDATE product_keys
  SET is_used = true
  WHERE id = v_key_id;

  -- 7. Record transaction
  INSERT INTO transactions (user_id, amount, type, status, variant_id, key_id, metadata)
  VALUES (
    p_user_id, 
    -v_final_price, 
    'purchase', 
    'completed', 
    p_variant_id, 
    v_key_id, 
    jsonb_build_object('original_price', v_variant_price, 'referral_discount_applied', v_final_price < v_variant_price)
  )
  RETURNING id INTO v_transaction_id;

  -- 8. Calculate and add commission for referrer
  IF v_referrer_id IS NOT NULL THEN
    DECLARE
      v_referral_count integer;
      v_commission_percent integer;
      v_commission bigint;
    BEGIN
      -- Lấy cấu hình hoa hồng từ settings
      SELECT value INTO v_commission_settings FROM global_settings WHERE key = 'referral_commission_base';
      v_base_percent := (v_commission_settings->>'percent')::integer;
      v_max_percent := (v_commission_settings->>'max_percent')::integer;

      -- Đếm số người referrer này đã mời (để tính % lũy tiến)
      SELECT COUNT(*) INTO v_referral_count
      FROM users
      WHERE referred_by = v_referrer_id;
      
      v_commission_percent := LEAST(v_referral_count * v_base_percent, v_max_percent);
      
      -- Hoa hồng tính trên giá cuối cùng user trả
      v_commission := (v_final_price * v_commission_percent) / 100;
      
      IF v_commission > 0 THEN
        UPDATE users
        SET balance = balance + v_commission
        WHERE id = v_referrer_id;
        
        INSERT INTO referral_earnings (referrer_id, referred_user_id, transaction_id, amount)
        VALUES (v_referrer_id, p_user_id, v_transaction_id, v_commission);
      END IF;
    END;
  END IF;

  RETURN json_build_object(
    'success', true,
    'key_value', v_key_value,
    'message', 'Purchase successful',
    'final_price', v_final_price
  );
END;
$$;
