/*
  # Initial Database Schema for DigiGO

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `balance` (bigint, default 0)
      - `is_admin` (boolean, default false)
      - `created_at` (timestamptz)
    
    - `products`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `price` (bigint)
      - `category` (text)
      - `type` (text: 'email', 'key', 'package')
      - `image_url` (text)
      - `created_at` (timestamptz)
    
    - `transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `amount` (bigint)
      - `type` (text: 'top_up', 'purchase')
      - `status` (text: 'pending', 'completed', 'failed')
      - `created_at` (timestamptz)
    
    - `chat_messages`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `admin_id` (uuid, foreign key to users, nullable)
      - `message` (text)
      - `is_admin` (boolean, default false)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for user access control
    - Admin access for luongquocthai.thaigo.2003@gmail.com

  3. Functions
    - Auto-create user profile on auth signup
    - Set admin status for specified email
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  balance bigint DEFAULT 0,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  price bigint NOT NULL DEFAULT 0,
  category text DEFAULT '',
  type text CHECK (type IN ('email', 'key', 'package')) DEFAULT 'email',
  image_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  amount bigint NOT NULL,
  type text CHECK (type IN ('top_up', 'purchase')) NOT NULL,
  status text CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES users(id) ON DELETE SET NULL,
  message text NOT NULL,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Products policies (public read, admin write)
CREATE POLICY "Anyone can read products"
  ON products
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage products"
  ON products
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.is_admin = true
  ));

-- Transactions policies
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
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.is_admin = true
  ));

-- Chat messages policies
CREATE POLICY "Users can read own chat messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.is_admin = true
  ));

CREATE POLICY "Users can create own chat messages"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.is_admin = true
  ));

-- Function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO users (id, email, is_admin)
  VALUES (
    NEW.id, 
    NEW.email, 
    CASE WHEN NEW.email = 'luongquocthai.thaigo.2003@gmail.com' THEN true ELSE false END
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user creation
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

-- Insert sample products
INSERT INTO products (name, description, price, category, type, image_url) VALUES
('Microsoft Office 365', 'Bộ ứng dụng văn phòng đầy đủ từ Microsoft', 200000, 'software', 'key', 'https://images.pexels.com/photos/5076513/pexels-photo-5076513.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Adobe Creative Suite', 'Bộ công cụ thiết kế chuyên nghiệp', 500000, 'software', 'key', 'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Windows 11 Pro', 'Hệ điều hành Windows 11 Professional', 300000, 'software', 'key', 'https://images.pexels.com/photos/39284/macbook-apple-imac-computer-39284.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Netflix Premium Account', 'Tài khoản Netflix Premium 1 tháng', 100000, 'entertainment', 'email', 'https://images.pexels.com/photos/265685/pexels-photo-265685.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Spotify Premium', 'Tài khoản Spotify Premium 1 tháng', 50000, 'entertainment', 'email', 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Canva Pro', 'Gói thiết kế Canva Professional', 150000, 'software', 'package', 'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=400');