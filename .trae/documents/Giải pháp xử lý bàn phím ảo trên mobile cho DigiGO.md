# Kế hoạch xử lý vấn đề bàn phím ảo che khuất input trên mobile

Tôi sẽ thực hiện các bước sau để đảm bảo trải nghiệm nhập liệu tốt nhất trên thiết bị di động:

## 1. Tạo Hook xử lý chung (`src/hooks/useMobileKeyboardFix.ts`)
Tạo một custom hook mới để quản lý logic hiển thị khi bàn phím ảo xuất hiện:
- Lắng nghe sự kiện `focus` trên các trường nhập liệu (`input`, `textarea`).
- Lắng nghe sự kiện thay đổi kích thước `visualViewport` (API chuẩn trên mobile modern).
- Tự động cuộn (scroll) phần tử đang focus vào vùng hiển thị an toàn (`scrollIntoView`).
- Cung cấp thông số chiều cao viewport thực tế để các component có thể điều chỉnh layout nếu cần.

## 2. Cập nhật `src/components/AuthModal.tsx`
Hiện tại modal đang căn giữa (`items-center`) và `fixed`, điều này dễ gây lỗi khi bàn phím đẩy giao diện lên làm mất phần đầu hoặc cuối modal.
- **Thay đổi layout:** Chuyển container chính sang chế độ cuộn (`overflow-y-auto`) để người dùng có thể lướt xem toàn bộ nội dung khi không gian dọc bị thu hẹp.
- **Xử lý Mobile:** Đảm bảo modal có thể cuộn được ngay cả khi bàn phím chiếm 50% màn hình.
- **Tích hợp Hook:** Sử dụng `useMobileKeyboardFix` để đảm bảo input đang nhập luôn nằm trong vùng nhìn thấy.

## 3. Cập nhật `src/components/ChatWidget.tsx`
Chat widget đang dùng `fixed bottom-20`, vị trí này rất dễ bị bàn phím che mất trên một số trình duyệt mobile không tự resize viewport.
- **Điều chỉnh vị trí:** Cập nhật logic CSS để widget tự động đẩy lên hoặc thay đổi vị trí dựa trên `visualViewport` khi bàn phím mở.
- **Tối ưu trải nghiệm:** Đảm bảo input chat luôn nằm ngay trên bàn phím.

## 4. Kiểm thử và Tinh chỉnh
- Đảm bảo giải pháp hoạt động mượt mà, không gây giật (smooth scroll).
- Kiểm tra tương thích với layout hiện tại.
