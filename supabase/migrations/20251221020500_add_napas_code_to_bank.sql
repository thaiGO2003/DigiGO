-- Thêm cột napas_code vào bảng bank_configs để hỗ trợ tạo QR chính xác hơn
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_configs' AND column_name = 'napas_code'
  ) THEN
    ALTER TABLE bank_configs ADD COLUMN napas_code text;
  END IF;
END $$;
