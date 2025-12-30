ALTER TABLE product_variants ADD COLUMN short_name text;
UPDATE product_variants
SET short_name = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '', 'g')) || '-' || substr(md5(id::text), 1, 6)
WHERE short_name IS NULL;
ALTER TABLE product_variants ALTER COLUMN short_name SET NOT NULL;
CREATE UNIQUE INDEX product_variants_short_name_unique ON product_variants ((lower(short_name)));
