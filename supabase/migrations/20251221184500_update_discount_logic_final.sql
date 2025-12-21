-- Update referral buyer discount to 1%
INSERT INTO global_settings (key, value)
VALUES 
  ('referral_buyer_discount', '{"percent": 1}'::jsonb),
  ('referral_commission_base', '{"percent": 1, "max_percent": 10}'::jsonb)
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value;

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
  v_variant_price bigint; -- Giá gốc của variant
  v_variant_info record;
  v_user_balance bigint;
  v_user_rank text;
  v_user_referral_count integer;
  v_rank_discount integer;
  v_referral_accum_discount integer;
  v_total_discount_percent integer;
  v_price_after_discount bigint;
  
  v_key_ids uuid[];
  v_key_values text[];
  v_transaction_ids uuid[];
  v_referrer_id uuid;
  v_commission_settings jsonb;
  v_buyer_discount_settings jsonb;
  v_buyer_discount_percent integer;
  v_final_unit_price bigint;
  v_total_price bigint;
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
    p.guide_url as product_guide_url,
    pv.is_manual_delivery,
    pv.manual_stock
  INTO v_variant_info
  FROM product_variants pv
  JOIN products p ON pv.product_id = p.id
  WHERE pv.id = p_variant_id;

  IF v_variant_info IS NULL THEN
    RAISE EXCEPTION 'Product variant not found';
  END IF;

  -- 2. Lấy thông tin User (Rank, Referral Count, Referrer)
  SELECT 
    rank, 
    referral_count,
    referred_by,
    balance
  INTO 
    v_user_rank, 
    v_user_referral_count,
    v_referrer_id,
    v_user_balance
  FROM users
  WHERE id = p_user_id;

  -- 3. Tính toán Discount tích hợp (Variant + Rank + Referral Accumulation)
  -- Rank Discount
  v_rank_discount := CASE
    WHEN v_user_rank = 'diamond' THEN 10
    WHEN v_user_rank = 'platinum' THEN 8
    WHEN v_user_rank = 'gold' THEN 6
    WHEN v_user_rank = 'silver' THEN 4
    WHEN v_user_rank = 'bronze' THEN 2
    ELSE 0
  END;

  -- Referral Accumulation Discount (1% per referral, max 10%)
  v_referral_accum_discount := LEAST(COALESCE(v_user_referral_count, 0), 10);

  -- Tổng discount (Cộng dồn, max 20%)
  v_total_discount_percent := LEAST(
    COALESCE(v_variant_info.discount_percent, 0) + v_rank_discount + v_referral_accum_discount,
    20
  );

  -- Giá sau khi áp dụng discount tích hợp
  v_price_after_discount := ROUND(v_variant_info.price * (100 - v_total_discount_percent) / 100.0);
  
  -- Gán vào biến final để tính tiếp Buyer Discount
  v_final_unit_price := v_price_after_discount;

  -- 4. Áp dụng thêm Referral Buyer Discount (nếu user này được giới thiệu bởi ai đó)
  IF v_referrer_id IS NOT NULL THEN
    SELECT value INTO v_buyer_discount_settings FROM global_settings WHERE key = 'referral_buyer_discount';
    
    -- Nếu không tìm thấy setting, mặc định là 0 hoặc 1 tùy logic cũ, ở đây query ra null thì coalesce
    v_buyer_discount_percent := COALESCE((v_buyer_discount_settings->>'percent')::integer, 0);
    
    IF v_buyer_discount_percent > 0 THEN
      -- Giảm thêm trên giá đã giảm
      v_final_unit_price := ROUND(v_final_unit_price * (100 - v_buyer_discount_percent) / 100.0);
    END IF;
  END IF;

  v_total_price := v_final_unit_price * p_quantity;

  -- 5. Check user balance
  IF v_user_balance < v_total_price THEN
    RAISE EXCEPTION 'Insufficient balance. Need: % VND, have: % VND', v_total_price, v_user_balance;
  END IF;

  -- Init IDs arrays
  v_transaction_ids := ARRAY[]::uuid[];
  v_key_values := ARRAY[]::text[];
  v_key_ids := ARRAY[]::uuid[];

  -- 6. Logic xử lý kho Key hoặc Manual Delivery (giữ nguyên logic cũ đã fix)
  IF v_variant_info.is_manual_delivery THEN
    -- MANUAL DELIVERY
    IF COALESCE(v_variant_info.manual_stock, 0) < p_quantity THEN
       RAISE EXCEPTION 'Not enough stock. Requested: %, available: %', p_quantity, COALESCE(v_variant_info.manual_stock, 0);
    END IF;

    FOR i IN 1..p_quantity LOOP
      INSERT INTO transactions (user_id, amount, type, status, variant_id, key_id, metadata)
      VALUES (
        p_user_id, 
        -v_final_unit_price, 
        'purchase', 
        'completed', 
        p_variant_id, 
        NULL, 
        jsonb_build_object(
          'original_price', v_variant_info.price, 
          'discount_percent_applied', v_total_discount_percent,
          'buyer_discount_percent', v_buyer_discount_percent,
          'quantity_in_order', p_quantity,
          'order_index', i,
          'guide_url', COALESCE(v_variant_info.variant_guide_url, v_variant_info.product_guide_url),
          'is_manual_delivery', true
        )
      )
      RETURNING id INTO v_current_tx_id;
      
      v_transaction_ids := array_append(v_transaction_ids, v_current_tx_id);
      v_key_values := array_append(v_key_values, 'Mã đơn (Chờ gửi key): ' || split_part(v_current_tx_id::text, '-', 1));
    END LOOP;
    
    UPDATE product_variants
    SET manual_stock = manual_stock - p_quantity
    WHERE id = p_variant_id;

  ELSE
    -- AUTO DELIVERY
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

    v_transaction_ids := ARRAY[]::uuid[];

    FOR i IN 1..p_quantity LOOP
        UPDATE product_keys
        SET is_used = true
        WHERE id = v_key_ids[i];

        INSERT INTO transactions (user_id, amount, type, status, variant_id, key_id, metadata)
        VALUES (
          p_user_id, 
          -v_final_unit_price, 
          'purchase', 
          'completed', 
          p_variant_id, 
          v_key_ids[i], 
          jsonb_build_object(
            'original_price', v_variant_info.price,
            'discount_percent_applied', v_total_discount_percent,
            'buyer_discount_percent', v_buyer_discount_percent, 
            'quantity_in_order', p_quantity,
            'order_index', i,
            'guide_url', COALESCE(v_variant_info.variant_guide_url, v_variant_info.product_guide_url)
          )
        )
        RETURNING id INTO v_current_tx_id;
        
        v_transaction_ids := array_append(v_transaction_ids, v_current_tx_id);
    END LOOP;
  END IF;

  -- 7. Deduct balance
  UPDATE users
  SET balance = balance - v_total_price
  WHERE id = p_user_id;

  -- 8. Calculate commission
  IF v_referrer_id IS NOT NULL THEN
    DECLARE
      v_referrer_referral_count integer;
      v_base_percent integer;
      v_max_percent integer;
      v_commission_percent integer;
      v_commission bigint;
    BEGIN
      SELECT value INTO v_commission_settings FROM global_settings WHERE key = 'referral_commission_base';
      v_base_percent := COALESCE((v_commission_settings->>'percent')::integer, 1);
      v_max_percent := COALESCE((v_commission_settings->>'max_percent')::integer, 10);

      SELECT COUNT(*) INTO v_referrer_referral_count
      FROM users
      WHERE referred_by = v_referrer_id;
      
      -- Tính commission (Mỗi ref được cộng base %, tối đa max %) 
      -- Logic cũ: LEAST(count * base, max).
      -- Logic mới: "Mỗi người giới thiệu sẽ nhận 1% hoa hồng". Có thể là cố định 1% hay tích lũy?
      -- Ảnh ghi: "Mỗi người giới thiệu sẽ nhận 1% hoa hồng từ giao dịch của họ". -> Nghe giống cố định 1%.
      -- Nhưng ảnh cũng có dòng "Hoa hồng tối đa: 10%". -> Có vẻ tích lũy giống cũ.
      -- Nên giữ logic LEAST(count * 1, 10).
      
      v_commission_percent := LEAST(v_referrer_referral_count * v_base_percent, v_max_percent);
      v_commission := (v_total_price * v_commission_percent) / 100;
      
      IF v_commission > 0 THEN
        UPDATE users
        SET balance = balance + v_commission
        WHERE id = v_referrer_id;
        
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
