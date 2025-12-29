# Kế hoạch Tách code UtilitiesPage

Dựa trên yêu cầu và phân tích mã nguồn hiện tại, tôi sẽ thực hiện việc tách code từ `src/components/UtilitiesPage.tsx` thành các component riêng biệt để code gọn gàng và dễ bảo trì hơn.

## 1. Cấu trúc file mới
Tôi sẽ tạo thư mục `src/components/utilities/` để chứa các component con:

1.  **`src/components/utilities/CursorTab.tsx`**:
    *   Chứa toàn bộ logic và giao diện của component `CursorTokenPanel` hiện tại (đang nằm trong file UtilitiesPage.tsx từ dòng 63 đến 443).
    *   Bao gồm cả các hàm helper liên quan như `generateMachineId`, `getWorkTimeStatus`.
    *   Component này sẽ hoạt động độc lập.

2.  **`src/components/utilities/ProgramsTab.tsx`**:
    *   Chứa logic fetch dữ liệu (`fetchPrograms`), tracking (`handleSimpleTrack`) và giao diện hiển thị danh sách chương trình (đang nằm trực tiếp trong `UtilitiesPage` từ dòng 447 đến 600).
    *   Sẽ nhận props (nếu cần) hoặc tự quản lý state của nó.

3.  **`src/components/utilities/index.ts`**:
    *   File export để import gọn gàng hơn.

## 2. Cập nhật `UtilitiesPage.tsx`
Sau khi tách code, file `src/components/UtilitiesPage.tsx` sẽ được viết lại để chỉ đóng vai trò là "container" chính:
*   Giữ lại state `activeTab` để chuyển đổi giữa các tab.
*   Import `CursorTab` và `ProgramsTab` từ thư mục mới.
*   Render giao diện tab switcher và nội dung tương ứng.

## 3. Các bước thực hiện
1.  **Tạo thư mục**: `src/components/utilities`
2.  **Tạo file `CursorTab.tsx`**: Copy logic `CursorTokenPanel` sang đây và đổi tên thành `CursorTab`. Đảm bảo import đủ các dependency (lucide-react, supabase, etc.).
3.  **Tạo file `ProgramsTab.tsx`**: Chuyển logic fetch và render programs từ `UtilitiesPage` sang đây.
4.  **Tạo file `index.ts`**: Export 2 component trên.
5.  **Refactor `UtilitiesPage.tsx`**: Xóa code cũ, import component mới và kết nối lại.
6.  **Kiểm tra**: Đảm bảo không có lỗi import và tính năng hoạt động bình thường.

## 4. Lưu ý
*   Do dự án dùng TypeScript (`.tsx`), tôi sẽ tạo file `.tsx` thay vì `.js` như trong yêu cầu ban đầu để đảm bảo tính nhất quán với dự án.
*   Logic của `CursorTab` khá phức tạp (xử lý auth key, machine ID, cooldown), việc tách file sẽ giúp `UtilitiesPage` nhẹ đi rất nhiều (giảm khoảng 400 dòng code).

Bạn có đồng ý với kế hoạch này không?
