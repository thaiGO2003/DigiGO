-- Make short_name optional in product_variants
ALTER TABLE product_variants ALTER COLUMN short_name DROP NOT NULL;
