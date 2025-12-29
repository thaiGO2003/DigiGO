# Kế hoạch triển khai tính năng "Tiện ích" (Utilities)

Tôi sẽ thực hiện các bước sau để thêm tính năng "Tiện ích" theo yêu cầu của bạn:

## 1. Cơ sở dữ liệu (Supabase)
Tạo bảng mới `programs` để lưu trữ thông tin các chương trình tiện ích.
- **Tên bảng:** `programs`
- **Các trường:**
  - `id` (uuid, primary key)
  - `title` (text, required): Tên chương trình
  - `description` (text): Mô tả ngắn
  - `source_url` (text, required): Link source code
  - `download_url` (text, required): Link tải về
  - `is_active` (boolean): Trạng thái hiển thị (Mặc định: true)
  - `view_count` (integer): Đếm lượt xem/click (Mặc định: 0)
  - `download_count` (integer): Đếm lượt tải (Mặc định: 0)
  - `created_at` (timestamp)

## 2. Giao diện Người dùng (User UI)
Tạo trang `UtilitiesPage` với 2 tab con:
- **Tab "Cursor":**
  - Hiển thị thông báo "Đang xây dựng" với icon/animation phù hợp.
- **Tab "Chương trình":**
  - Hiển thị danh sách các chương trình dưới dạng thẻ (Card).
  - Mỗi thẻ bao gồm: Tên, Mô tả, nút "Source" (dẫn đến `source_url`), nút "Tải về" (dẫn đến `download_url`).
  - Khi click vào link sẽ cập nhật bộ đếm (`view_count`/`download_count`).
- **Responsive:** Đảm bảo hiển thị tốt trên cả mobile và desktop.

## 3. Giao diện Quản trị (Admin UI)
Thêm tab "Tiện ích" vào trang Admin hiện tại:
- **Danh sách:** Hiển thị bảng các chương trình đã thêm (Tên, Link, Trạng thái, Thống kê lượt xem/tải).
- **Thao tác:**
  - **Thêm mới:** Modal nhập liệu (Tên, Mô tả, Source URL, Download URL). Có validate URL hợp lệ.
  - **Chỉnh sửa:** Cập nhật thông tin.
  - **Xóa:** Xóa chương trình.
  - **Ẩn/Hiện:** Toggle trạng thái `is_active`.

## 4. Cập nhật Routing & Navigation
- **Header:** Thêm mục "Tiện ích" vào menu chính (giữa "Sản phẩm" và "Nạp tiền").
- **Router:** Thêm route `/utilities` trỏ đến `UtilitiesPage`.

## 5. Các bước thực hiện chi tiết
1.  **Tạo file migration SQL** để tạo bảng `programs` và setup chính sách bảo mật (RLS).
2.  **Cập nhật Types:** Thêm type `Program` vào `src/lib/database.types.ts`.
3.  **Tạo Component Admin:**
    - `src/components/admin/UtilitiesTab.tsx` (Quản lý chương trình)
    - `src/components/admin/ProgramModal.tsx` (Form thêm/sửa)
4.  **Tạo Component User:**
    - `src/components/UtilitiesPage.tsx` (Giao diện chính cho user)
5.  **Cập nhật App & Header:** Đăng ký route và menu mới.

Bạn có đồng ý với kế hoạch này không?
