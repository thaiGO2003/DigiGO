-- Thêm cột guide_url vào bảng products và product_variants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'guide_url'
  ) THEN
    ALTER TABLE products ADD COLUMN guide_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_variants' AND column_name = 'guide_url'
  ) THEN
    ALTER TABLE product_variants ADD COLUMN guide_url text;
  END IF;
END $$;
