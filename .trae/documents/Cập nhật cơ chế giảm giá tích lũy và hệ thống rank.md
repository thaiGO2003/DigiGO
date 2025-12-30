## Mục tiêu
- Giảm mức giảm giá theo rank tối đa từ 10% xuống 5%.
- Điều chỉnh giảm giá theo rank từ 2%/bậc xuống 1%/bậc.
- Cập nhật ngưỡng nạp tiền theo rank mới: Đồng 100k, Sắt 200k, Vàng 300k, Lục Bảo 400k, Kim Cương 500k.
- Điều chỉnh business logic, stored procedure, giao diện, form/báo cáo và tài liệu; bổ sung kiểm thử và đảm bảo tương thích dữ liệu.

## Giả định
- Chỉ thay đổi cơ chế giảm giá theo rank; các giảm giá khác (variant/referral) giữ nguyên như hiện tại.
- Người dùng dưới 100k được coi là “chưa có rank” và không nhận giảm giá theo rank.
- Đơn vị là VND.

## Cập nhật Business Logic (DB/Server)
- Sửa logic rank discount trong hàm mua hàng:
  - Vị trí: [20251228100000_fix_price_and_totalsold.sql](file:///p:\DigiGO\AiNangVang\supabase\migrations\20251228100000_fix_price_and_totalsold.sql) và/hoặc [20251221184500_update_discount_logic_final.sql](file:///p:\DigiGO\AiNangVang\supabase\migrations\20251221184500_update_discount_logic_final.sql)
  - Thay CASE/logic ánh xạ rank → phần trăm: Đồng 1%, Sắt 2%, Vàng 3%, Lục Bảo 4%, Kim Cương 5%.
  - Đảm bảo tổng giảm giá do rank bị giới hạn tối đa 5%.
  - Giữ nguyên referral accumulation và variant discount, tổng hợp như hiện tại.
- Cập nhật xác định rank theo tổng nạp:
  - Vị trí: [20251221131000_update_rank_system.sql](file:///p:\DigiGO\AiNangVang\supabase\migrations\20251221131000_update_rank_system.sql)
  - Sửa `update_user_rank_on_deposit`: ngưỡng mới theo VND:
    - Đồng ≥100,000; Sắt ≥200,000; Vàng ≥300,000; Lục Bảo ≥400,000; Kim Cương ≥500,000.
  - Cập nhật trigger `trigger_update_user_rank` nếu cần để phản ánh tên rank mới.
- Di trú dữ liệu (migration):
  - Viết script SQL cập nhật lại rank cho toàn bộ người dùng dựa trên `total_deposited` theo ngưỡng mới.
  - Lưu lịch sử thay đổi rank nếu hệ thống có audit; nếu không, chỉ cập nhật trường `rank`.

## Cập nhật Giao Diện (UI)
- Bảng Rank quản trị:
  - Vị trí: [RanksTab.tsx](file:///p:\DigiGO\AiNangVang\src\components\admin\RanksTab.tsx)
  - Sửa `getRankInfo` để phản ánh tên/giảm giá/ngưỡng mới.
- Trang quản trị người dùng:
  - Vị trí: [UsersTab.tsx](file:///p:\DigiGO\AiNangVang\src\components\admin\UsersTab.tsx)
  - Hiển thị đúng nhãn rank và phần trăm giảm giá mới.
- Tab giới thiệu/tiến độ rank người dùng:
  - Vị trí: [ReferralTab.tsx](file:///p:\DigiGO\AiNangVang\src\components\profile\ReferralTab.tsx)
  - Cập nhật tiến độ lên rank kế tiếp theo ngưỡng mới và phần trăm giảm giá.
- Form nạp tiền:
  - Vị trí: [TopUpPage.tsx](file:///p:\DigiGO\AiNangVang\src\components\TopUpPage.tsx)
  - Hiển thị mốc rank mới; không bắt buộc đổi preset số tiền, nhưng bổ sung nhắc tới các mốc 100k–500k.
- Hook tính giảm giá phía client (nếu có):
  - Vị trí: [useDiscounts.ts](file:///p:\DigiGO\AiNangVang\src\hooks\useDiscounts.ts)
  - Đồng bộ với logic rank 1–5% và trần 5%.

## Form nhập liệu & Báo cáo
- Modal điều chỉnh số dư:
  - Vị trí: [AdjustBalanceModal.tsx](file:///p:\DigiGO\AiNangVang\src\components\admin\AdjustBalanceModal.tsx)
  - Đảm bảo mô tả/tooltip phản ánh mốc rank mới, và cập nhật rank realtime sau điều chỉnh.
- Báo cáo/Thống kê:
  - Vị trí: [StatsTab.tsx](file:///p:\DigiGO\AiNangVang\src\components\admin\StatsTab.tsx)
  - Cập nhật nhãn/legend theo tên rank mới để hiển thị đúng.
- Giao dịch:
  - Vị trí: [TransactionsTab.tsx](file:///p:\DigiGO\AiNangVang\src\components\admin\TransactionsTab.tsx)
  - Bảo toàn hiển thị rank đúng theo dữ liệu đã di trú.

## Cập nhật Tài Liệu
- README:
  - Vị trí: [README.md](file:///p:\DigiGO\AiNangVang\README.md)
  - Mô tả hệ thống rank mới, bảng ngưỡng và phần trăm giảm giá.
- Tài liệu nội bộ:
  - Vị trí: [.trae/documents/Sửa RLS Referral và Đồng Bộ Hiển Thị_Áp Dụng Giảm Giá.md](file:///p:\DigiGO\AiNangVang\.trae\documents\Sửa%20RLS%20Referral%20và%20Đồng%20Bộ%20Hiển%20Thị_Áp%20Dụng%20Giảm%20Giá.md)
  - Bổ sung ghi chú: rank giảm giá tối đa 5%, 1% mỗi bậc.

## Kiểm thử
- Công thức giảm giá:
  - Viết test SQL/integ: mua hàng với từng rank để xác nhận 1–5% và trần 5%.
  - Kịch bản kết hợp referral + variant vẫn hoạt động; tổng giảm giá theo rank không vượt 5%.
- Hiển thị UI:
  - Kiểm tra RanksTab/UsersTab/ReferralTab/TopUpPage hiển thị đúng tên, phần trăm, ngưỡng.
- Tương thích ngược:
  - Sau migration, xác nhận người dùng cũ nhận rank mới theo tổng nạp; không lỗi tham chiếu.
- Báo cáo:
  - StatsTab/TransactionsTab thống kê đúng sau thay đổi rank.

## Triển khai & Rollback
- Triển khai theo thứ tự: migration DB → cập nhật server logic → cập nhật UI → chạy script di trú → smoke test.
- Chuẩn bị script rollback khôi phục mapping rank cũ (10% tối đa, 2% mỗi bậc) nếu cần.

## Kết quả mong đợi
- Hệ thống áp dụng giảm giá theo rank mới (1–5%).
- Người dùng thấy đúng thông tin rank và mốc nạp.
- Báo cáo hoạt động bình thường, dữ liệu cũ được ánh xạ chính xác sang hệ thống mới.