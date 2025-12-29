# Phân tích nguyên nhân lỗi "Insufficient balance"
1. **Lệch giá giữa Client và Server**:
   - **Client (`useDiscounts.ts`)**: Áp dụng giảm giá Hạng (Rank) + Tích lũy giới thiệu + Mã giới thiệu.
   - **Server (`purchase_product`)**: Hiện tại CHỈ áp dụng giảm giá Mã giới thiệu (1%), **bỏ qua** giảm giá Hạng và Tích lũy giới thiệu.
   - Kết quả: Client tính ra giá 88.209đ (đã giảm nhiều), Server tính ra 89.100đ (chỉ giảm 1%). Do đó số dư 89.000đ đủ ở Client nhưng thiếu ở Server -> Lỗi.

2. **Lỗi logic cập nhật `total_sold` (Bug phụ phát hiện thêm)**:
   - Hệ thống hiện tại đang cộng `total_sold` (số lượng đã bán) gấp nhiều lần thực tế do Trigger bị sai logic (cộng `quantity_in_order` cho mỗi dòng transaction thay vì cộng 1).

# Giải pháp khắc phục
Tạo một migration mới để cập nhật toàn bộ logic tính giá và xử lý giao dịch trong database:

1. **Cập nhật hàm `purchase_product`**:
   - Bổ sung logic lấy `rank` và `referral_count` của người dùng.
   - Tính toán phần trăm giảm giá Hạng (Bronze 2%, Silver 4%...) và Tích lũy giới thiệu (1%/người, max 10%) giống hệt Client.
   - Áp dụng công thức tính giá đồng bộ: `Integrated Discount` (max 20%) trước, sau đó mới đến `Referral Buyer Discount`.
   - Loại bỏ bước cập nhật `total_sold` thủ công trong hàm (để Trigger tự xử lý, tránh trùng lặp).

2. **Sửa lỗi Trigger `update_total_sold_on_transaction`**:
   - Điều chỉnh Trigger để chỉ cộng 1 vào `total_sold` cho mỗi dòng transaction được tạo ra (vì hệ thống tạo 1 transaction cho mỗi item/key).

# Kế hoạch thực hiện
1. Tạo file migration `supabase/migrations/20251228100000_fix_price_and_totalsold.sql`.
2. Viết lại hàm `purchase_product` với logic giá đầy đủ.
3. Viết lại Trigger `update_total_sold_on_transaction`.
4. Deploy migration lên Supabase.
5. Kiểm tra lại bằng cách thực hiện mua hàng.