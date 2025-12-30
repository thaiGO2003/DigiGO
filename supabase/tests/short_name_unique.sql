DO $$
DECLARE a uuid; b uuid; s text;
BEGIN
  SELECT id, short_name INTO a, s FROM product_variants LIMIT 1;
  SELECT id INTO b FROM product_variants WHERE id <> a LIMIT 1;
  IF a IS NOT NULL AND b IS NOT NULL AND s IS NOT NULL THEN
    BEGIN
      UPDATE product_variants SET short_name = s WHERE id = b;
    EXCEPTION WHEN unique_violation THEN
      PERFORM 1;
    END;
  END IF;
END $$;
DO $$
DECLARE pid uuid; s text;
BEGIN
  SELECT product_id, short_name INTO pid, s FROM product_variants LIMIT 1;
  IF pid IS NOT NULL AND s IS NOT NULL THEN
    BEGIN
      INSERT INTO product_variants (product_id, name, price, short_name) VALUES (pid, 'Test', 1, s);
    EXCEPTION WHEN unique_violation THEN
      PERFORM 1;
    END;
  END IF;
END $$;
