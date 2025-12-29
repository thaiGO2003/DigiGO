# Kết Quả Rà Soát
- Quan hệ referral hiện dùng cột users.referred_by với FK `ON DELETE SET NULL` (đúng, khi xóa A sẽ bỏ tham chiếu ở B/C). Xem: [20251220165711_single.sql](file:///p:/DigiGO/AiNangVang/supabase/migrations/20251220165711_single.sql#L39), [referral_earnings](file:///p:/DigiGO/AiNangVang/supabase/migrations/20251220165711_single.sql#L61-L68).
- /products áp dụng giảm giá dựa vào `referred_by` trong hàm RPC `purchase_product` (đúng, vẫn chạy). Xem: [20251226000000_add_cost_price.sql](file:///p:/DigiGO/AiNangVang/supabase/migrations/20251226000000_add_cost_price.sql#L69-L86).
- /profile#referral hiện đang truy vấn trực tiếp bảng `users` để lấy danh sách người được giới thiệu: `select ... from users where referred_by = user.id`. Xem: [ProfilePage.tsx](file:///p:/DigiGO/AiNangVang/src/components/ProfilePage.tsx#L137-L144).
- RLS hiện chỉ cho phép "Users can read own data" trên bảng `users`, vì vậy người dùng thường **không thể** đọc các dòng người khác có `referred_by = auth.uid()`. Xem: [single.sql policies](file:///p:/DigiGO/AiNangVang/supabase/migrations/20251220165711_single.sql#L166-L205).

=> Nguyên nhân: Lỗi logic quyền đọc (RLS) ở /profile, không phải do FK/trigger xoá. Khi A tạo lại tài khoản với ID mới, /products vẫn giảm giá (RPC dùng server-side), nhưng /profile không xem được danh sách C vì RLS chặn.

# Giải Pháp
## 1) Sửa RLS cho bảng users
- Thêm policy cho phép người dùng đọc các dòng `users` có `referred_by = auth.uid()`.
- Giữ nguyên các policy khác để đảm bảo bảo mật.

Mẫu migration (SQL):
```sql
-- Cho phép người dùng đọc danh sách người được họ giới thiệu
DROP POLICY IF EXISTS "Users can read referred users" ON users;
CREATE POLICY "Users can read referred users"
  ON users
  FOR SELECT
  TO authenticated
  USING (referred_by = auth.uid());
```

## 2) RPC bảo vệ và đồng bộ hiển thị
- Tạo RPC `get_referral_stats(referrer_id uuid)` SECURITY DEFINER:
  - Trả: tổng số người được giới thiệu, danh sách người được giới thiệu (ẩn bớt tên/email), tổng/thu nhập tháng từ `referral_earnings`.
  - Ưu tiên dùng auth.uid() bên trong để tự lấy referrer, không tin đầu vào.
- Cập nhật `ProfilePage.tsx` dùng RPC thay vì đọc trực tiếp bảng `users`.

Mẫu RPC (SQL):
```sql
CREATE OR REPLACE FUNCTION get_referral_stats()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid; v_total int; v_monthly bigint; v_total_earn bigint; v_users json;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT json_agg(json_build_object(
    'id', u.id,
    'customer_name', CASE WHEN u.full_name IS NULL THEN substr(u.email,1,3)||'***' ELSE substr(u.full_name,1,3)||'***' END,
    'created_at', u.created_at
  )) INTO v_users
  FROM users u WHERE u.referred_by = v_uid ORDER BY u.created_at DESC;
  SELECT count(*) INTO v_total FROM users WHERE referred_by = v_uid;
  SELECT coalesce(sum(amount),0) INTO v_total_earn FROM referral_earnings WHERE referrer_id = v_uid;
  SELECT coalesce(sum(amount),0) INTO v_monthly FROM referral_earnings WHERE referrer_id = v_uid AND date_trunc('month', created_at) = date_trunc('month', now());
  RETURN json_build_object('totalReferrals', v_total, 'monthlyEarnings', v_monthly, 'totalEarnings', v_total_earn, 'users', coalesce(v_users,'[]'::json));
END; $$;
```

## 3) Đồng bộ logic giảm giá ở frontend
- /products: đang tính -1% nếu `user.referred_by` và +% theo `referral_count`. Giữ nguyên.
- /profile: hiển thị cùng quy tắc phần trăm (min(totalReferrals*1, 10) + bonus 1% nếu có `referred_by`). Lấy số liệu từ RPC.

## 4) Dọn dẹp khi xóa tài khoản
- Xác nhận:
  - `users.referred_by` FK `ON DELETE SET NULL` — đúng.
  - `referral_earnings` FK `ON DELETE CASCADE` — đúng.
  - `delete_own_account()` xóa `public.users` rồi `auth.users` — đúng. Xem: [add_delete_account.sql](file:///p:/DigiGO/AiNangVang/supabase/migrations/20251224020000_add_delete_account.sql#L16-L23).
- Không cần thêm trigger xoá phụ trợ; nhưng sẽ thêm SQL unit test để đảm bảo.

## 5) Unit Test (SQL)
- Viết block test (migration/dev script):
  1. Tạo A,B; `set_referrer(B, A.code)` → kiểm tra `B.referred_by = A.id`.
  2. Xóa A (`delete_user_completely(A.id)` hoặc xóa từ auth) → kiểm tra `B.referred_by IS NULL` và `referral_earnings` của A bị xóa.
  3. Tạo lại A' (email cũ, id mới); tạo C; `set_referrer(C, A'.code)` → kiểm tra RPC `get_referral_stats()` trả `totalReferrals = 1` cho A'.

## 6) Triển khai
- Thêm migration cho policy mới và RPC `get_referral_stats`.
- Cập nhật `ProfilePage.tsx` để gọi RPC.
- Không thay đổi `purchase_product`.

## 7) Tiêu chuẩn hoàn thành
- Xóa tài khoản xóa sạch mọi thông tin referral liên quan.
- /profile và /products hiển thị/áp dụng giảm giá đồng bộ.
- Unit test xác nhận các ca A→B, delete A, A'→C đều đạt.

Nếu đồng ý, tôi sẽ tạo migration (policy + RPC), cập nhật ProfilePage.tsx dùng RPC và thêm script test SQL để bạn kiểm tra.