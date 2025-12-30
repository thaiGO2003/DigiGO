DO $$
DECLARE def text;
BEGIN
  SELECT pg_get_functiondef('purchase_product(uuid, uuid, integer)'::regprocedure) INTO def;
  IF def IS NULL OR position('order_codes' IN def) = 0 THEN
    RAISE EXCEPTION 'order_codes missing in purchase_product';
  END IF;
END $$;
