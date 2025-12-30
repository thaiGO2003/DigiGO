## Điều chỉnh Theo Yêu Cầu

* Bỏ cột has_deposited; tiêu chí xóa chỉ dựa vào users.total_deposited <= 0 và thời gian tồn tại >= 7 ngày.

* Đảm bảo total_deposited phản ánh đúng tất cả luồng nạp (bao gồm SePay webhook) trước khi áp dụng xóa tự động.

## Bối cảnh Hiện Tại

* Trường total_deposited đã có trong users ([database.types.ts](file:///p:\DigiGO\AiNangVang\src\lib\database.types.ts#L378-L433)).

* SePay webhook hiện chỉ cộng balance, không cập nhật total_deposited ([sepay-webhook/index.ts](file:///p:\DigiGO\AiNangVang\supabase\functions\sepay-webhook\index.ts#L156-L161)).

## Thay đổi Schema (Tối thiểu)

1. Tạo bảng public.deleted_users_backup để sao lưu dữ liệu khi xóa.
2. Thêm index:
   * users(total_deposited, created_at)
   * transactions(user_id, type, status, created_at)

## Bổ Sung Tính Đúng Đắn Cho total_deposited

1. Backfill một lần: cập nhật users.total_deposited = SUM(amount) của các transactions có type = 'top_up' AND status = 'completed' theo từng user.
2. Sửa SePay webhook: ngoài việc tăng balance, đồng thời tăng total_deposited theo amount đã nạp.

## Scheduled Job (Supabase)

* Tạo Supabase Edge Function: cleanup-weekly-accounts.
* Cron: 1:00 sáng Thứ 2 hằng tuần ("0 1 * * 1"), timezone Asia/Ho_Chi_Minh.
* Chạy bằng service role để gọi SQL function và vượt RLS.

## Logic Quét 

1. (Trước khi xóa) đảm bảo backfill đã chạy, và webhook đã chỉnh.
2. Chọn candidates:
   * COALESCE(users.total_deposited, 0) <= 0
   * users.created_at <= now() - interval '7 days'
3. Sao lưu vào deleted_users_backup rồi xóa vĩnh viễn.

## Sao Lưu & Giao Dịch

* Viết SQL function SECURITY DEFINER, atomic:
  1. INSERT backup snapshot từ users cho tập candidates.
  2. Xóa liên quan (referral_earnings, chat_messages, transactions).
  3. Xóa public.users và auth.users/auth.identities.
* Chạy theo batch (ví dụ 1000 user/lần) để tránh lock dài.

## Tối Ưu & Giám Sát

* Truy vấn set-based, dùng index để quét nhanh.
* Bảng job_runs để log số lượng xóa, thời gian, lỗi.
* Cảnh báo khi số lượng xóa vượt ngưỡng.

## Triển Khai Chi Tiết

1. Migration SQL:
   * CREATE TABLE public.deleted_users_backup (...);
   * CREATE INDEX ... trên users và transactions.
   * CREATE OR REPLACE FUNCTION public.backfill_total_deposited() LANGUAGE sql SECURITY DEFINER AS $$
     UPDATE public.users u SET total_deposited = sub.sum_amount
     FROM (
       SELECT t.user_id, COALESCE(SUM(t.amount),0) AS sum_amount
       FROM public.transactions t
       WHERE t.type = 'top_up' AND t.status = 'completed'
       GROUP BY t.user_id
     ) sub
     WHERE u.id = sub.user_id; $$;
   * CREATE OR REPLACE FUNCTION public.cleanup_inactive_unfunded_users(p_batch_size int DEFAULT 1000) RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
     DECLARE v_deleted int; BEGIN
     WITH candidates AS (
       SELECT u.id FROM public.users u
       WHERE COALESCE(u.total_deposited,0) <= 0
       AND u.created_at <= now() - interval '7 days'
       LIMIT p_batch_size
     )
     INSERT INTO public.deleted_users_backup (user_id, email, username, created_at, total_deposited, reason, deleted_at)
     SELECT u.id, u.email, u.username, u.created_at, COALESCE(u.total_deposited,0), 'no_top_up_7_days', now()
     FROM public.users u JOIN candidates c ON c.id = u.id;
     DELETE FROM public.referral_earnings re WHERE re.referred_user_id IN (SELECT id FROM candidates) OR re.referrer_id IN (SELECT id FROM candidates);
     DELETE FROM public.chat_messages cm WHERE cm.user_id IN (SELECT id FROM candidates);
     DELETE FROM public.transactions tr WHERE tr.user_id IN (SELECT id FROM candidates);
     DELETE FROM public.users u WHERE u.id IN (SELECT id FROM candidates);
     DELETE FROM auth.identities ai WHERE ai.user_id IN (SELECT id FROM candidates);
     DELETE FROM auth.users au WHERE au.id IN (SELECT id FROM candidates);
     GET DIAGNOSTICS v_deleted = ROW_COUNT; RETURN v_deleted; END; $$;
2. Edge Function cleanup-weekly-accounts:
   * Gọi RPC backfill_total_deposited() trước (một lần, hoặc mỗi lần cho an toàn).
   * Loop gọi cleanup_inactive_unfunded_users(p_batch_size) cho tới khi trả về 0.
   * Ghi log job_runs.
3. Sửa [sepay-webhook/index.ts](file:///p:\DigiGO\AiNangVang\supabase\functions\sepay-webhook\index.ts): khi xử lý thành công, update { balance: balance + amount, total_deposited: COALESCE(total_deposited,0) + amount }.

## Xác Minh

* Dữ liệu mẫu: A (>=7 ngày, total_deposited=0) → xóa; B (>=7 ngày, có top_up, total_deposited>0) → giữ; C (<7 ngày) → giữ.
* Kiểm tra backup, xác nhận số lượng xóa khớp điều kiện.
* Benchmark với nhiều user để xác nhận index hoạt động.
