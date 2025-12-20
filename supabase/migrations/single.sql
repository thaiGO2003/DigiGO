/*
  DigiGO - Single SQL Migration (authoritative)

  Gom các phần sau vào 1 file:
  - Core schema: users, transactions, chat_messages
  - Product schema mới: products, product_variants, product_keys
  - RLS + policies
  - Trigger handle_new_user
  - RPC: get_products_with_variants, purchase_product
  - Seed data mẫu (3 sản phẩm + variants + 1 key mẫu)

  Lưu ý:
  - Phần product schema sẽ DROP & CREATE lại để đảm bảo đúng cấu trúc mới.
*/

-- Required extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- Core tables
-- =========================

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  balance bigint DEFAULT 0,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Ensure full_name column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE users ADD COLUMN full_name text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'referral_code'
  ) THEN
    ALTER TABLE users ADD COLUMN referral_code text UNIQUE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'referred_by'
  ) THEN
    ALTER TABLE users ADD COLUMN referred_by uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  amount bigint NOT NULL,
  type text CHECK (type IN ('top_up', 'purchase')) NOT NULL,
  status text CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES users(id) ON DELETE SET NULL,
  message text NOT NULL,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referral_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE,
  amount bigint NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- =========================
-- Product schema (NEW) - drop & recreate
-- =========================

DROP TABLE IF EXISTS product_keys CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS products CASCADE;

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mechanism text,
  recommended_model text,
  strengths text,
  weaknesses text,
  image_url text,
  category text DEFAULT 'software',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL,
  price bigint NOT NULL,
  discount_percent integer DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  duration_days integer,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE product_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  key_value text NOT NULL,
  is_used boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT product_keys_key_value_format_chk CHECK (
    key_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  )
);

-- Add new columns to transactions (variant_id, key_id) if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'variant_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN variant_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'key_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN key_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_variant_id_fkey'
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_variant_id_fkey
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_key_id_fkey'
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_key_id_fkey
      FOREIGN KEY (key_id) REFERENCES product_keys(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =========================
-- RLS enable
-- =========================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_keys ENABLE ROW LEVEL SECURITY;

-- =========================
-- Policies (drop & recreate where applicable)
-- =========================

-- USERS
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- TRANSACTIONS
DROP POLICY IF EXISTS "Users can read own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can create own transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can read all transactions" ON transactions;

CREATE POLICY "Users can read own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- CHAT
DROP POLICY IF EXISTS "Users can read own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can create own chat messages" ON chat_messages;

CREATE POLICY "Users can read own chat messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

CREATE POLICY "Users can create own chat messages"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

-- PRODUCTS
DROP POLICY IF EXISTS "Anyone can read products" ON products;
DROP POLICY IF EXISTS "Admins can manage products" ON products;

CREATE POLICY "Anyone can read products" ON products
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage products" ON products
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

-- VARIANTS
DROP POLICY IF EXISTS "Anyone can read variants" ON product_variants;
DROP POLICY IF EXISTS "Admins can manage variants" ON product_variants;

CREATE POLICY "Anyone can read variants" ON product_variants
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage variants" ON product_variants
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

-- KEYS
DROP POLICY IF EXISTS "Admins can manage keys" ON product_keys;

CREATE POLICY "Admins can manage keys" ON product_keys
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

-- REFERRAL EARNINGS
DROP POLICY IF EXISTS "Users can read own referral earnings" ON referral_earnings;

CREATE POLICY "Users can read own referral earnings" ON referral_earnings
  FOR SELECT TO authenticated
  USING (referrer_id = auth.uid());

-- =========================
-- Trigger: auto-create user profile
-- =========================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_code text;
BEGIN
  -- Generate unique referral code (8 random hex chars)
  v_referral_code := upper(substring(md5(random()::text || NEW.id::text) from 1 for 8));
  
  INSERT INTO users (id, email, is_admin, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN NEW.email = 'luongquocthai.thaigo.2003@gmail.com' THEN true ELSE false END,
    v_referral_code
  )
  ON CONFLICT (email) DO NOTHING;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_user();
  END IF;
END $$;

-- =========================
-- RPC: get_products_with_variants
-- =========================

CREATE OR REPLACE FUNCTION get_products_with_variants()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_agg(
    json_build_object(
      'id', p.id,
      'name', p.name,
      'mechanism', p.mechanism,
      'recommended_model', p.recommended_model,
      'strengths', p.strengths,
      'weaknesses', p.weaknesses,
      'image_url', p.image_url,
      'category', p.category,
      'created_at', p.created_at,
      'variants', (
        SELECT json_agg(
          json_build_object(
            'id', pv.id,
            'name', pv.name,
            'price', pv.price,
            'duration_days', pv.duration_days,
            'description', pv.description,
            'stock', (
              SELECT count(*)
              FROM product_keys pk
              WHERE pk.variant_id = pv.id AND pk.is_used = false
            )
          ) ORDER BY pv.price
        )
        FROM product_variants pv
        WHERE pv.product_id = p.id
      )
    ) ORDER BY p.created_at DESC
  )
  FROM products p;
$$;

-- =========================
-- RPC: purchase_product
-- =========================

CREATE OR REPLACE FUNCTION purchase_product(
  p_variant_id uuid,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_variant_price bigint;
  v_user_balance bigint;
  v_key_id uuid;
  v_key_value text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Invalid user';
  END IF;

  -- 1. Get variant price (with discount applied)
  SELECT 
    ROUND(price * (100 - COALESCE(discount_percent, 0)) / 100.0)
  INTO v_variant_price
  FROM product_variants
  WHERE id = p_variant_id;

  IF v_variant_price IS NULL THEN
    RAISE EXCEPTION 'Product variant not found';
  END IF;

  -- 2. Check user balance
  SELECT balance INTO v_user_balance
  FROM users
  WHERE id = p_user_id;

  IF v_user_balance < v_variant_price THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- 3. Find available key (lock row)
  SELECT id, key_value INTO v_key_id, v_key_value
  FROM product_keys
  WHERE variant_id = p_variant_id AND is_used = false
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_key_id IS NULL THEN
    RAISE EXCEPTION 'Out of stock';
  END IF;

  -- 4. Deduct balance
  UPDATE users
  SET balance = balance - v_variant_price
  WHERE id = p_user_id;

  -- 5. Mark key as used
  UPDATE product_keys
  SET is_used = true
  WHERE id = v_key_id;

  -- 6. Record transaction
  INSERT INTO transactions (user_id, amount, type, status, variant_id, key_id)
  VALUES (p_user_id, -v_variant_price, 'purchase', 'completed', p_variant_id, v_key_id);

  RETURN json_build_object(
    'success', true,
    'key_value', v_key_value,
    'message', 'Purchase successful'
  );
END;
$$;

-- =========================
-- RPC: set_referrer (called after signup with ref code)
-- =========================

CREATE OR REPLACE FUNCTION set_referrer(
  p_user_id uuid,
  p_referral_code text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
BEGIN
  -- Find referrer by code
  SELECT id INTO v_referrer_id
  FROM users
  WHERE referral_code = p_referral_code;

  IF v_referrer_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Invalid referral code');
  END IF;

  IF v_referrer_id = p_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Cannot refer yourself');
  END IF;

  -- Update user's referrer
  UPDATE users
  SET referred_by = v_referrer_id
  WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'message', 'Referrer set successfully');
END;
$$;

-- =========================
-- Seed data (sẽ chạy lại mỗi lần vì products bị drop)
-- =========================

DO $$
DECLARE
  cursor_id uuid;
  windsurf_id uuid;
  augment_id uuid;
  v_id uuid;
BEGIN
  -- 1) Cursor Pro Plan
  INSERT INTO products (name, mechanism, recommended_model, strengths, weaknesses, image_url, category)
  VALUES (
    'Cursor Pro Plan',
    'Cài thêm extension - Sử dụng API ngoài vô hạn request. 1- web token - 10 phút được new token -> GPT 5.2 Codex. 2- dùng api-worker -> chọn Gemini 3.0 Pro. 3- mặc định HTTP 2. -> GPT 5.2 Codex',
    'GPT 5 Codex, Gemini 3.0 Pro Thinking',
    'Nhiều chức năng đi trước thời đại: Agent mode, Plan mode',
    'Request chậm. Không sử dụng được model của Claude (lỗi global limit do chính sách mới của claude)',
    'https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&w=400',
    'software'
  ) RETURNING id INTO cursor_id;

  INSERT INTO product_variants (product_id, name, price, duration_days) VALUES
    (cursor_id, '1 ngày', 30000, 1),
    (cursor_id, '7 ngày', 120000, 7),
    (cursor_id, '30 ngày', 300000, 30),
    (cursor_id, '90 ngày', 700000, 90),
    (cursor_id, '1 năm', 2500000, 365);

  -- 2) Windsurf Trial Plan
  INSERT INTO products (name, mechanism, recommended_model, strengths, weaknesses, image_url, category)
  VALUES (
    'Windsurf Trial Plan',
    'Cài thêm extension - Sử dụng cơ chế credit của chính Windsurf, bạn sẽ có 300 acc, mỗi acc ~ 100 credit',
    'Gemini 3.0 Pro Thinking',
    'Tốc độ request nhanh, xác định vấn đề nhanh, rẻ trên mức giá',
    'Không sử dụng được model của Claude (lỗi global limit do chính sách mới của claude)',
    'https://images.pexels.com/photos/577585/pexels-photo-577585.jpeg?auto=compress&cs=tinysrgb&w=400',
    'software'
  ) RETURNING id INTO windsurf_id;

  INSERT INTO product_variants (product_id, name, price, duration_days) VALUES
    (windsurf_id, '1 ngày', 30000, 1),
    (windsurf_id, '7 ngày', 150000, 7),
    (windsurf_id, '15 ngày', 240000, 15);

  INSERT INTO product_variants (product_id, name, price, duration_days)
  VALUES (windsurf_id, '30 ngày', 300000, 30)
  RETURNING id INTO v_id;

  IF v_id IS NOT NULL THEN
    INSERT INTO product_keys (variant_id, key_value)
    VALUES (v_id, 'BC5B670D-F994-4180-9D01-27B7F9D7D452');
  END IF;

  -- 3) Augment Code
  INSERT INTO products (name, mechanism, recommended_model, strengths, weaknesses, image_url, category)
  VALUES (
    'Augment Code',
    'Cài thêm extension - Sử dụng API ngoài vô hạn request',
    'Gemini 3.0 Pro Thinking',
    'Hiểu codebase cực tốt, 80% khả năng giải quyết vấn đề',
    'Thực thi cực lâu, có thể nấu mỳ chờ nó xong. Không sử dụng được model của Claude. Token mau hết, giá rất đắt.',
    'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=400',
    'software'
  ) RETURNING id INTO augment_id;

  INSERT INTO product_variants (product_id, name, price, duration_days) VALUES
    (augment_id, '1 ngày', 40000, 1),
    (augment_id, '7 ngày', 150000, 7),
    (augment_id, '14 ngày', 250000, 14),
    (augment_id, '30 ngày', 400000, 30),
    (augment_id, '30 ngày (52$ credit)', 500000, 30);
END $$;
