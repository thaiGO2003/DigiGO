-- Migration to fix price calculation logic (sync with client) and fix total_sold trigger bug

-- 1. Fix the trigger function to increment total_sold by 1 per transaction row
CREATE OR REPLACE FUNCTION update_total_sold_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'purchase' AND NEW.variant_id IS NOT NULL THEN
     -- Fix: Increment by 1 for each transaction row created
     -- Previous logic used quantity_in_order which caused inflation (e.g. 5 rows * 5 quantity = 25 sold instead of 5)
     UPDATE product_variants 
     SET total_sold = total_sold + 1
     WHERE id = NEW.variant_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Update purchase_product function to include Rank and Referral Count discounts
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

  -- 1. Get variant info (including cost_price)
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

  -- 2. Get user info (Rank, Referral Count, Referrer)
  SELECT rank, referral_count, referred_by 
  INTO v_user_rank, v_referral_count, v_referrer_id
  FROM users
  WHERE id = p_user_id;

  -- 3. Calculate Price (Sync with useDiscounts.ts)
  
  -- Get Global Settings for Max Referral Discount
  SELECT value INTO v_referral_max_settings FROM global_settings WHERE key = 'referral_max_discount';
  v_referral_max_percent := COALESCE((v_referral_max_settings->>'percent')::integer, 10);

  -- Calculate Rank Percent
  CASE v_user_rank
    WHEN 'bronze' THEN v_rank_percent := 2;
    WHEN 'silver' THEN v_rank_percent := 4;
    WHEN 'gold' THEN v_rank_percent := 6;
    WHEN 'platinum' THEN v_rank_percent := 8;
    WHEN 'diamond' THEN v_rank_percent := 10;
    ELSE v_rank_percent := 0;
  END CASE;

  -- Calculate Referral Count Percent
  v_referral_count_percent := LEAST(COALESCE(v_referral_count, 0) * 1, v_referral_max_percent);

  -- Variant Discount Percent
  v_variant_percent := COALESCE(v_variant_info.discount_percent, 0);

  -- Integrated Percent (Capped at 20%)
  v_integrated_percent := LEAST(v_variant_percent + v_rank_percent + v_referral_count_percent, 20);

  -- Price after Integrated Discount
  v_price_after_integrated := ROUND(v_variant_info.price * (100 - v_integrated_percent) / 100.0);

  -- Apply Buyer Discount (if referred) - Applied sequentially
  v_final_unit_price := v_price_after_integrated;

  IF v_referrer_id IS NOT NULL THEN
    SELECT value INTO v_buyer_discount_settings FROM global_settings WHERE key = 'referral_buyer_discount';
    v_buyer_discount_percent := COALESCE((v_buyer_discount_settings->>'percent')::integer, 1);
    
    IF v_buyer_discount_percent > 0 THEN
      v_final_unit_price := ROUND(v_price_after_integrated * (100 - v_buyer_discount_percent) / 100.0);
    END IF;
  END IF;

  v_total_price := v_final_unit_price * p_quantity;

  -- 4. Check user balance
  SELECT balance INTO v_user_balance
  FROM users
  WHERE id = p_user_id;

  IF v_user_balance < v_total_price THEN
    RAISE EXCEPTION 'Insufficient balance. Need: % VND, have: % VND', v_total_price, v_user_balance;
  END IF;

  -- Init IDs arrays
  v_transaction_ids := ARRAY[]::uuid[];
  v_key_values := ARRAY[]::text[];
  v_key_ids := ARRAY[]::uuid[];

  -- 5. Handle Stock Logic
  IF v_variant_info.is_manual_delivery THEN
    -- MANUAL DELIVERY
    
    -- Check Stock
    IF COALESCE(v_variant_info.manual_stock, 0) < p_quantity THEN
       RAISE EXCEPTION 'Not enough stock. Requested: %, available: %', p_quantity, COALESCE(v_variant_info.manual_stock, 0);
    END IF;

    -- Loop create transactions
    FOR i IN 1..p_quantity LOOP
      INSERT INTO transactions (user_id, amount, type, status, variant_id, key_id, cost_price, metadata)
      VALUES (
        p_user_id, 
        -v_final_unit_price, 
        'purchase', 
        'completed', 
        p_variant_id, 
        NULL, -- No key_id
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
      
      -- Set display key value
      v_key_values := array_append(v_key_values, 'Mã đơn (Chờ gửi key): ' || split_part(v_current_tx_id::text, '-', 1));
    END LOOP;
    
    -- Deduct Manual Stock
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

    -- Loop create transactions and mark used
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

  -- 6. Deduct balance (total)
  UPDATE users
  SET balance = balance - v_total_price
  WHERE id = p_user_id;

  -- 7. Calculate commission
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
        
        -- Record referral earning
        INSERT INTO referral_earnings (referrer_id, referred_user_id, transaction_id, amount)
        VALUES (v_referrer_id, p_user_id, v_transaction_ids[1], v_commission);
      END IF;
    END;
  END IF;

  -- 8. Update total_sold is handled by trigger "update_total_sold_on_transaction"
  -- We removed the explicit UPDATE to avoid double counting or conflicts.

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
