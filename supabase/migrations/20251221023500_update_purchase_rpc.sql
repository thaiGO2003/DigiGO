-- Cập nhật hàm mua hàng để sử dụng cấu hình hoa hồng động
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
  v_base_percent integer;
  v_max_percent integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Invalid user';
  END IF;

  -- 1. Get variant price (with discount applied)
  SELECT 
    ROUND(price * (100 - COALESCE(discount_percent, 0)) / 100.0)
  INTO v_variant_price
  FROM product_variants
  WHERE id = p_variant_id;

  IF v_variant_price IS NULL THEN
    RAISE EXCEPTION 'Product variant not found';
  END IF;

  -- 2. Check user balance
  SELECT balance INTO v_user_balance
  FROM users
  WHERE id = p_user_id;

  IF v_user_balance < v_variant_price THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- 3. Find available key (lock row)
  SELECT id, key_value INTO v_key_id, v_key_value
  FROM product_keys
  WHERE variant_id = p_variant_id AND is_used = false
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_key_id IS NULL THEN
    RAISE EXCEPTION 'Out of stock';
  END IF;

  -- 4. Deduct balance
  UPDATE users
  SET balance = balance - v_variant_price
  WHERE id = p_user_id;

  -- 5. Mark key as used
  UPDATE product_keys
  SET is_used = true
  WHERE id = v_key_id;

  -- 6. Record transaction
  INSERT INTO transactions (user_id, amount, type, status, variant_id, key_id)
  VALUES (p_user_id, -v_variant_price, 'purchase', 'completed', p_variant_id, v_key_id)
  RETURNING id INTO v_transaction_id;

  -- 7. Check for referrer and calculate progressive commission
  SELECT referred_by INTO v_referrer_id
  FROM users
  WHERE id = p_user_id;

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

      -- Count how many people the referrer has referred
      SELECT COUNT(*) INTO v_referral_count
      FROM users
      WHERE referred_by = v_referrer_id;
      
      -- Calculate commission percentage: v_base_percent per referral, up to v_max_percent
      v_commission_percent := LEAST(v_referral_count * v_base_percent, v_max_percent);
      
      -- Calculate commission amount
      v_commission := (v_variant_price * v_commission_percent) / 100;
      
      -- Add commission to referrer balance
      UPDATE users
      SET balance = balance + v_commission
      WHERE id = v_referrer_id;
      
      -- Record referral earning
      INSERT INTO referral_earnings (referrer_id, referred_user_id, transaction_id, amount)
      VALUES (v_referrer_id, p_user_id, v_transaction_id, v_commission);
    END;
  END IF;

  RETURN json_build_object(
    'success', true,
    'key_value', v_key_value,
    'message', 'Purchase successful'
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
