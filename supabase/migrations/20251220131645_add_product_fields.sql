/*
  # Add quantity and duration to products

  1. Changes
    - Add `quantity` column to `products` table (integer, default 0)
    - Add `duration` column to `products` table (text, default '')
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'quantity'
  ) THEN
    ALTER TABLE products ADD COLUMN quantity integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'duration'
  ) THEN
    ALTER TABLE products ADD COLUMN duration text DEFAULT '';
  END IF;
END $$;
