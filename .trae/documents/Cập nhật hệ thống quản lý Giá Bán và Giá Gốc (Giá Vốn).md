# Kế hoạch cập nhật hệ thống giá sản phẩm

Tôi đã phân tích hệ thống và nhận thấy:
1.  **Database & Logic xử lý:** Đã có sẵn cột `cost_price` (giá vốn) trong bảng `product_variants` và `transactions` (từ migration `20251226000000_add_cost_price.sql`). Hàm xử lý mua hàng (`purchase_product`) cũng đã có logic lưu giá vốn này.
2.  **Vấn đề:** Giao diện quản lý (`VariantModal.tsx`) chưa có chỗ nhập liệu cho `cost_price` và đang gọi `price` (giá bán) là "Giá gốc", gây nhầm lẫn.
3.  **Typescript:** Type `ProductVariant` trong code chưa cập nhật trường `cost_price`.

Dưới đây là các bước thực hiện chi tiết:

## 1. Cập nhật Typescript Definition
- Sửa file `src/lib/supabase.ts`.
- Thêm trường `cost_price?: number` vào interface `ProductVariant` để code nhận diện được trường mới này từ database.

## 2. Cập nhật Giao diện Quản lý Gói (Admin UI)
- Sửa file `src/components/admin/VariantModal.tsx`.
- **Đổi tên:** Thay đổi nhãn "Giá gốc (VNĐ)" hiện tại thành **"Giá bán (VNĐ)"** (tương ứng với trường `price`).
- **Thêm trường mới:** Thêm ô nhập liệu mới với nhãn **"Giá gốc (VNĐ)"** (tương ứng với trường `cost_price`).
- Cập nhật logic `useState` và `handleSubmit` để hỗ trợ lưu và hiển thị giá trị `cost_price`.

## 3. Kiểm tra (Self-Verification)
- Đảm bảo khi lưu gói, cả "Giá bán" và "Giá gốc" đều được gửi xuống database.
- Đảm bảo logic tính toán giá sau giảm vẫn dựa trên "Giá bán" (`price`), không bị ảnh hưởng bởi trường mới.

Sau khi thực hiện, admin sẽ có thể nhập cả giá nhập hàng (để tính lãi lỗ sau này) và giá bán niêm yết cho khách hàng.
