-- 1. Add cost_price to product_variants and transactions
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS cost_price bigint DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cost_price bigint DEFAULT 0;

-- 2. Update purchase_product function to record cost_price
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
    pv.cost_price -- NEW: Get cost price
  INTO v_variant_info
  FROM product_variants pv
  JOIN products p ON pv.product_id = p.id
  WHERE pv.id = p_variant_id;

  IF v_variant_info IS NULL THEN
    RAISE EXCEPTION 'Product variant not found';
  END IF;

  -- Calculate price after discount
  v_variant_price := ROUND(v_variant_info.price * (100 - COALESCE(v_variant_info.discount_percent, 0)) / 100.0);

  -- 2. Check for referrer discount
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

  -- Init IDs arrays
  v_transaction_ids := ARRAY[]::uuid[];
  v_key_values := ARRAY[]::text[];
  v_key_ids := ARRAY[]::uuid[];

  -- 4. Handle Stock Logic
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
        COALESCE(v_variant_info.cost_price, 0), -- NEW: Record cost price
        jsonb_build_object(
          'original_price', v_variant_price, 
          'referral_discount_applied', v_final_unit_price < v_variant_price,
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
          COALESCE(v_variant_info.cost_price, 0), -- NEW: Record cost price
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
  END IF;

  -- 5. Deduct balance (total)
  UPDATE users
  SET balance = balance - v_total_price
  WHERE id = p_user_id;

  -- 6. Calculate commission
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

  -- 7. Update total_sold (Trigger handles this now, but kept for safety/legacy if trigger removed? No, relying on trigger is better to avoid double count. But the trigger is AFTER INSERT.
  -- The previous migration removed the explicit UPDATE and relied on trigger? Let's check.
  -- Wait, the previous migration restored the function AND added a trigger. The trigger updates total_sold.
  -- So I should NOT update total_sold explicitly here if the trigger is active.
  -- However, the code I read (20251223140000) INCLUDED explicit update at step 7.
  -- AND it added a trigger. This might double count!
  -- Let's check the trigger definition in 20251223140000.
  -- It says: "CREATE TRIGGER trigger_update_total_sold AFTER INSERT ON transactions".
  -- And the function body ALSO has "UPDATE product_variants SET total_sold = total_sold + p_quantity".
  -- This is definitely a bug in the previous migration (Double counting).
  -- I should probably fix it by REMOVING the explicit update in step 7 in this new version, relying on the trigger.
  -- OR remove the trigger.
  -- Given I am replacing the function, I will REMOVE Step 7 from the function body to rely on the trigger (which is safer for concurrent inserts).
  
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
