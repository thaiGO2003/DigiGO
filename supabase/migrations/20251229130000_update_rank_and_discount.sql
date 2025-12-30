-- Cập nhật hệ thống rank và giảm giá theo rank
-- - Ngưỡng nạp: Đồng 100k, Sắt 200k, Vàng 300k, Lục Bảo 400k, Kim Cương 500k
-- - Giảm giá theo rank: 1% mỗi bậc, tối đa 5%

-- 1. Cập nhật function xác định rank theo tổng tiền nạp
CREATE OR REPLACE FUNCTION update_user_rank_on_deposit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_rank text;
BEGIN
  IF NEW.total_deposited >= 500000 THEN
    v_new_rank := 'kim_cuong';      -- ≥500k
  ELSIF NEW.total_deposited >= 400000 THEN
    v_new_rank := 'luc_bao';        -- ≥400k
  ELSIF NEW.total_deposited >= 300000 THEN
    v_new_rank := 'vang';           -- ≥300k
  ELSIF NEW.total_deposited >= 200000 THEN
    v_new_rank := 'sat';            -- ≥200k
  ELSIF NEW.total_deposited >= 100000 THEN
    v_new_rank := 'dong';           -- ≥100k
  ELSE
    v_new_rank := 'newbie';         -- <100k
  END IF;

  IF NEW.rank IS NULL OR NEW.rank != v_new_rank THEN
    NEW.rank := v_new_rank;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Di trú dữ liệu hiện có sang hệ thống rank mới
UPDATE users 
SET rank = CASE 
  WHEN total_deposited >= 500000 THEN 'kim_cuong'
  WHEN total_deposited >= 400000 THEN 'luc_bao'
  WHEN total_deposited >= 300000 THEN 'vang'
  WHEN total_deposited >= 200000 THEN 'sat'
  WHEN total_deposited >= 100000 THEN 'dong'
  ELSE 'newbie'
END;

-- 3. Cập nhật purchase_product: giảm giá rank 1–5%
-- Lưu ý: Hàm đã tồn tại trong các migration trước, dùng CREATE OR REPLACE để cập nhật ánh xạ rank → %.
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
  v_user_rank text;
  v_referral_count integer;
  v_commission_settings jsonb;
  v_buyer_discount_settings jsonb;
  v_referral_max_settings jsonb;
  v_base_percent integer;
  v_max_percent integer;
  v_buyer_discount_percent integer;
  v_final_unit_price bigint;
  v_total_price bigint;
  v_current_tx_id uuid;
  v_rank_percent integer;
  v_referral_count_percent integer;
  v_referral_max_percent integer;
  v_variant_percent integer;
  v_integrated_percent integer;
  v_price_after_integrated bigint;
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

  SELECT 
    pv.id,
    pv.name,
    pv.price,
    pv.discount_percent,
    pv.guide_url as variant_guide_url,
    p.guide_url as product_guide_url,
    pv.is_manual_delivery,
    pv.manual_stock,
    pv.cost_price
  INTO v_variant_info
  FROM product_variants pv
  JOIN products p ON pv.product_id = p.id
  WHERE pv.id = p_variant_id;

  IF v_variant_info IS NULL THEN
    RAISE EXCEPTION 'Product variant not found';
  END IF;

  SELECT rank, referral_count, referred_by 
  INTO v_user_rank, v_referral_count, v_referrer_id
  FROM users
  WHERE id = p_user_id;

  SELECT value INTO v_referral_max_settings FROM global_settings WHERE key = 'referral_max_discount';
  v_referral_max_percent := COALESCE((v_referral_max_settings->>'percent')::integer, 10);

  -- Rank Percent: 1–5% theo rank mới
  CASE v_user_rank
    WHEN 'dong' THEN v_rank_percent := 1;
    WHEN 'sat' THEN v_rank_percent := 2;
    WHEN 'vang' THEN v_rank_percent := 3;
    WHEN 'luc_bao' THEN v_rank_percent := 4;
    WHEN 'kim_cuong' THEN v_rank_percent := 5;
    ELSE v_rank_percent := 0;
  END CASE;

  -- Referral Count Percent: giữ nguyên (1% mỗi referral, trần từ settings)
  v_referral_count_percent := LEAST(COALESCE(v_referral_count, 0) * 1, v_referral_max_percent);

  -- Variant Discount Percent
  v_variant_percent := COALESCE(v_variant_info.discount_percent, 0);

  -- Tích hợp giảm giá (trần tổng 20%)
  v_integrated_percent := LEAST(v_variant_percent + v_rank_percent + v_referral_count_percent, 20);

  v_price_after_integrated := ROUND(v_variant_info.price * (100 - v_integrated_percent) / 100.0);
  v_final_unit_price := v_price_after_integrated;

  IF v_referrer_id IS NOT NULL THEN
    SELECT value INTO v_buyer_discount_settings FROM global_settings WHERE key = 'referral_buyer_discount';
    v_buyer_discount_percent := COALESCE((v_buyer_discount_settings->>'percent')::integer, 1);
    IF v_buyer_discount_percent > 0 THEN
      v_final_unit_price := ROUND(v_price_after_integrated * (100 - v_buyer_discount_percent) / 100.0);
    END IF;
  END IF;

  v_total_price := v_final_unit_price * p_quantity;

  SELECT balance INTO v_user_balance
  FROM users
  WHERE id = p_user_id;

  IF v_user_balance < v_total_price THEN
    RAISE EXCEPTION 'Insufficient balance. Need: % VND, have: % VND', v_total_price, v_user_balance;
  END IF;

  v_transaction_ids := ARRAY[]::uuid[];
  v_key_values := ARRAY[]::text[];
  v_key_ids := ARRAY[]::uuid[];

  IF v_variant_info.is_manual_delivery THEN
    IF COALESCE(v_variant_info.manual_stock, 0) < p_quantity THEN
       RAISE EXCEPTION 'Not enough stock. Requested: %, available: %', p_quantity, COALESCE(v_variant_info.manual_stock, 0);
    END IF;

    FOR i IN 1..p_quantity LOOP
      INSERT INTO transactions (user_id, amount, type, status, variant_id, key_id, cost_price, metadata)
      VALUES (
        p_user_id, 
        -v_final_unit_price, 
        'purchase', 
        'completed', 
        p_variant_id, 
        NULL,
        COALESCE(v_variant_info.cost_price, 0),
        jsonb_build_object(
          'original_price', v_variant_info.price, 
          'final_price', v_final_unit_price,
          'discount_breakdown', jsonb_build_object(
             'variant', v_variant_percent,
             'rank', v_rank_percent,
             'referral_count', v_referral_count_percent,
             'integrated', v_integrated_percent,
             'buyer', COALESCE(v_buyer_discount_percent, 0)
          ),
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

    FOR i IN 1..p_quantity LOOP
        UPDATE product_keys
        SET is_used = true
        WHERE id = v_key_ids[i];

        INSERT INTO transactions (user_id, amount, type, status, variant_id, key_id, cost_price, metadata)
        VALUES (
          p_user_id, 
          -v_final_unit_price, 
          'purchase', 
          'completed', 
          p_variant_id, 
          v_key_ids[i], 
          COALESCE(v_variant_info.cost_price, 0),
          jsonb_build_object(
            'original_price', v_variant_info.price, 
            'final_price', v_final_unit_price,
            'discount_breakdown', jsonb_build_object(
              'variant', v_variant_percent,
              'rank', v_rank_percent,
              'referral_count', v_referral_count_percent,
              'integrated', v_integrated_percent,
              'buyer', COALESCE(v_buyer_discount_percent, 0)
            ),
            'quantity_in_order', p_quantity,
            'order_index', i,
            'guide_url', COALESCE(v_variant_info.variant_guide_url, v_variant_info.product_guide_url)
          )
        )
        RETURNING id INTO v_current_tx_id;
        v_transaction_ids := array_append(v_transaction_ids, v_current_tx_id);
    END LOOP;
  END IF;

  UPDATE users
  SET balance = balance - v_total_price
  WHERE id = p_user_id;

  IF v_referrer_id IS NOT NULL THEN
    DECLARE
      v_referrer_referral_count integer;
      v_commission_percent integer;
      v_commission bigint;
    BEGIN
      SELECT value INTO v_commission_settings FROM global_settings WHERE key = 'referral_commission_base';
      v_base_percent := (v_commission_settings->>'percent')::integer;
      v_max_percent := (v_commission_settings->>'max_percent')::integer;

      SELECT COUNT(*) INTO v_referrer_referral_count
      FROM users
      WHERE referred_by = v_referrer_id;
      
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
    'guide_url', COALESCE(v_variant_info.variant_guide_url, v_variant_info.product_guide_url),
    'order_codes', (
      SELECT array_agg(split_part(id::text, '-', 1))
      FROM unnest(v_transaction_ids) AS id
    )
  );
END;
$$;

NOTIFY pgrst, 'reload schema';

