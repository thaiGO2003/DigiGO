## Mục tiêu
- Thêm tab Cài đặt trong trang quản lý để chỉnh nội dung thông báo.
- Hiển thị thông báo nền vàng chữ đen chạy lặp từ phải qua trái trên toàn site.
- Cho phép bật/tắt, chỉnh tốc độ và nội dung thông báo trong tab Cài đặt.

## Thay đổi UI quản lý
- Mở rộng mảng tabs trong [AdminPage.tsx](file:///p:\DigiGO\AiNangVang\src\components\AdminPage.tsx#L32-L41) để thêm `{ id: 'settings', label: 'Cài đặt', icon: Settings }` (import icon từ lucide-react).
- Tạo component mới SettingsTab tại `src/components/admin/SettingsTab.tsx`, và export trong [index.ts](file:///p:\DigiGO\AiNangVang\src\components\admin\index.ts).
- Render điều kiện trong [AdminPage.tsx](file:///p:\DigiGO\AiNangVang\src\components\AdminPage.tsx#L655-L656): `activeTab === 'settings' && <SettingsTab />`.
- Kiểu AdminTabType đã bao gồm 'settings' trong [types.ts](file:///p:\DigiGO\AiNangVang\src\components\admin\types.ts#L4).

## Cấu hình & Lưu trữ
- Dùng Supabase (client có sẵn ở [supabase.ts](file:///p:\DigiGO\AiNangVang\src\lib\supabase.ts)) để lưu vào bảng `global_settings` theo key `marquee_banner`.
- Cấu trúc value (jsonb): `{ enabled: boolean, text: string, speed: number }`.
- Trong SettingsTab:
  - Load giá trị hiện tại từ `global_settings` (key `marquee_banner`).
  - Form gồm: bật/tắt, nội dung, tốc độ (giây) với validate đơn giản.
  - Lưu bằng upsert vào `global_settings` (on conflict key).

## Banner cuộn
- Tạo component `ScrollingBanner.tsx` hiển thị site-wide với style `bg-yellow-300 text-black`.
- Lấy cấu hình từ `global_settings` (key `marquee_banner`). Nếu `enabled=false` hoặc `text` rỗng thì không render.
- Áp dụng animation marquee (CSS keyframes) chạy lặp từ phải qua trái; tốc độ dựa trên `speed`.
- Gắn component ngay dưới `<Header />` trong [App.tsx](file:///p:\DigiGO\AiNangVang\src\App.tsx#L46-L49) để hiển thị trên mọi trang.
- Tùy chọn: subscribe realtime vào `global_settings` để banner cập nhật tức thời khi admin thay đổi.

## Kiểm thử & Xác minh
- Mở trang Admin, tab Cài đặt: nhập nội dung “Thông báo khuyến mãi…” và bật banner, đặt tốc độ.
- Trở về trang sản phẩm: kiểm tra banner xuất hiện, chạy mượt, lặp liên tục từ phải qua trái.
- Tắt banner trong Cài đặt: xác minh banner biến mất.

## Tác động mã nguồn
- Thêm file: `src/components/admin/SettingsTab.tsx`, `src/components/ScrollingBanner.tsx`.
- Chỉnh: [AdminPage.tsx](file:///p:\DigiGO\AiNangVang\src\components\AdminPage.tsx), [admin/index.ts](file:///p:\DigiGO\AiNangVang\src\components\admin\index.ts), [App.tsx](file:///p:\DigiGO\AiNangVang\src\App.tsx).
- Không thay đổi logic hiện có khác; tuân thủ kiểu và thư viện đang dùng (React, lucide-react, Tailwind, Supabase).