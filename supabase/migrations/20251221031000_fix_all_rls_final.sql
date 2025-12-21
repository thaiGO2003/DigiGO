-- 1. Tạo hàm kiểm tra Admin an toàn (không gây đệ quy RLS)
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT is_admin FROM users WHERE id = p_user_id;
$$;

-- 2. Cập nhật lại chính sách bảo mật cho bảng users
-- Xóa các chính sách cũ để tránh xung đột
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Cho phép người dùng đọc dữ liệu của chính mình
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Cho phép Admin đọc tất cả dữ liệu người dùng (Dùng hàm is_admin để tránh đệ quy)
CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Cho phép người dùng cập nhật dữ liệu của chính mình
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Cho phép Admin cập nhật tất cả dữ liệu người dùng
CREATE POLICY "Admins can update all users"
  ON users FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- 3. Đảm bảo các bảng khác cũng dùng hàm is_admin() để đồng bộ và an toàn
DROP POLICY IF EXISTS "Admins can read all transactions" ON transactions;
CREATE POLICY "Admins can read all transactions"
  ON transactions FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all transactions" ON transactions;
CREATE POLICY "Admins can update all transactions"
  ON transactions FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- 4. Reload cache PostgREST lần cuối
NOTIFY pgrst, 'reload schema';
