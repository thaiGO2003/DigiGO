-- Drop the constraint that enforces UUID format on product_keys.key_value
ALTER TABLE product_keys DROP CONSTRAINT IF EXISTS product_keys_key_value_format_chk;
