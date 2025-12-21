-- Cập nhật hàm purchase_product để hỗ trợ mua nhiều số lượng
CREATE OR REPLACE FUNCTION purchase_product(
  p_variant_id uuid,
  p_user_id uuid,
  p_quantity integer DEFAULT 1
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_variant_price bigint;
  v_variant_info record;
  v_user_balance bigint;
  v_key_ids uuid[];
  v_key_values text[];
  v_transaction_ids uuid[];
  v_referrer_id uuid;
  v_commission_settings jsonb;
  v_buyer_discount_settings jsonb;
  v_base_percent integer;
  v_max_percent integer;
  v_buyer_discount_percent integer;
  v_final_unit_price bigint;
  v_total_price bigint;
  v_current_key record;
  v_current_tx_id uuid;
  i integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Invalid user';
  END IF;

  IF p_quantity < 1 OR p_quantity > 10 THEN
    RAISE EXCEPTION 'Quantity must be between 1 and 10';
  END IF;

  -- 1. Lấy thông tin biến thể
  SELECT 
    pv.id,
    pv.name,
    pv.price,
    pv.discount_percent,
    pv.guide_url as variant_guide_url,
    p.guide_url as product_guide_url
  INTO v_variant_info
  FROM product_variants pv
  JOIN products p ON pv.product_id = p.id
  WHERE pv.id = p_variant_id;

  IF v_variant_info IS NULL THEN
    RAISE EXCEPTION 'Product variant not found';
  END IF;

  -- Tính giá sau giảm giá sản phẩm
  v_variant_price := ROUND(v_variant_info.price * (100 - COALESCE(v_variant_info.discount_percent, 0)) / 100.0);

  -- 2. Kiểm tra xem user có người giới thiệu không để áp dụng thêm giảm giá
  SELECT referred_by INTO v_referrer_id
  FROM users
  WHERE id = p_user_id;

  v_final_unit_price := v_variant_price;

  IF v_referrer_id IS NOT NULL THEN
    SELECT value INTO v_buyer_discount_settings FROM global_settings WHERE key = 'referral_buyer_discount';
    v_buyer_discount_percent := (v_buyer_discount_settings->>'percent')::integer;
    
    IF v_buyer_discount_percent > 0 THEN
      v_final_unit_price := ROUND(v_variant_price * (100 - v_buyer_discount_percent) / 100.0);
    END IF;
  END IF;

  v_total_price := v_final_unit_price * p_quantity;

  -- 3. Check user balance
  SELECT balance INTO v_user_balance
  FROM users
  WHERE id = p_user_id;

  IF v_user_balance < v_total_price THEN
    RAISE EXCEPTION 'Insufficient balance. Need: % VND, have: % VND', v_total_price, v_user_balance;
  END IF;

  -- 4. Find available keys (lock rows)
  SELECT array_agg(id), array_agg(key_value)
  INTO v_key_ids, v_key_values
  FROM (
    SELECT id, key_value
    FROM product_keys
    WHERE variant_id = p_variant_id AND is_used = false
    LIMIT p_quantity
    FOR UPDATE SKIP LOCKED
  ) keys;

  IF v_key_ids IS NULL OR array_length(v_key_ids, 1) < p_quantity THEN
    RAISE EXCEPTION 'Not enough stock. Requested: %, available: %', p_quantity, COALESCE(array_length(v_key_ids, 1), 0);
  END IF;

  -- 5. Deduct balance (total)
  UPDATE users
  SET balance = balance - v_total_price
  WHERE id = p_user_id;

  -- 6. Mark keys as used and create transactions for each
  v_transaction_ids := ARRAY[]::uuid[];
  v_key_values := ARRAY[]::text[]; -- Khởi tạo thêm mảng này nếu chưa có an toàn
  
  FOR i IN 1..p_quantity LOOP
    -- Mark key as used
    UPDATE product_keys
    SET is_used = true
    WHERE id = v_key_ids[i];

    -- Create transaction for each unit
    INSERT INTO transactions (user_id, amount, type, status, variant_id, key_id, metadata)
    VALUES (
      p_user_id, 
      -v_final_unit_price, 
      'purchase', 
      'completed', 
      p_variant_id, 
      v_key_ids[i], 
      jsonb_build_object(
        'original_price', v_variant_price, 
        'referral_discount_applied', v_final_unit_price < v_variant_price,
        'quantity_in_order', p_quantity,
        'order_index', i,
        'guide_url', COALESCE(v_variant_info.variant_guide_url, v_variant_info.product_guide_url)
      )
    )
    RETURNING id INTO v_current_tx_id;
    v_transaction_ids := array_append(v_transaction_ids, v_current_tx_id);
  END LOOP;

  -- 7. Calculate and add commission for referrer (based on total)
  IF v_referrer_id IS NOT NULL THEN
    DECLARE
      v_referral_count integer;
      v_commission_percent integer;
      v_commission bigint;
    BEGIN
      SELECT value INTO v_commission_settings FROM global_settings WHERE key = 'referral_commission_base';
      v_base_percent := (v_commission_settings->>'percent')::integer;
      v_max_percent := (v_commission_settings->>'max_percent')::integer;

      SELECT COUNT(*) INTO v_referral_count
      FROM users
      WHERE referred_by = v_referrer_id;
      
      v_commission_percent := LEAST(v_referral_count * v_base_percent, v_max_percent);
      
      -- Hoa hồng tính trên tổng giá
      v_commission := (v_total_price * v_commission_percent) / 100;
      
      IF v_commission > 0 THEN
        UPDATE users
        SET balance = balance + v_commission
        WHERE id = v_referrer_id;
        
        -- Ghi nhận hoa hồng cho transaction đầu tiên
        INSERT INTO referral_earnings (referrer_id, referred_user_id, transaction_id, amount)
        VALUES (v_referrer_id, p_user_id, v_transaction_ids[1], v_commission);
      END IF;
    END;
  END IF;

  RETURN json_build_object(
    'success', true,
    'key_values', v_key_values,
    'message', 'Purchase successful',
    'final_unit_price', v_final_unit_price,
    'total_price', v_total_price,
    'quantity', p_quantity,
    'guide_url', COALESCE(v_variant_info.variant_guide_url, v_variant_info.product_guide_url)
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
