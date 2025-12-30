## Mục Tiêu
- Hiển thị số lượng sản phẩm đã mua (cá nhân) và tổng đã mua (global) trên trang /profile.
- Hiển thị số lượng đã bán (global) ở phía khách (storefront) và phía quản lý (admin).

## Nguồn Dữ Liệu
- Cá nhân đã mua: đếm transactions của user với type = "purchase" và status = "completed" từ bảng transactions.
- Đã bán (global): cộng tổng trường total_sold của tất cả variants trong bảng product_variants.
- Đã mua (global): dùng cùng tổng total_sold (mỗi lần bán tương ứng một lượt mua; total_sold đã tính đủ số lượng).

## Thay Đổi UI & Vị Trí Hiển Thị
- /profile (khách hàng):
  - Tại [ProfilePage.tsx](file:///p:/DigiGO/AiNangVang/src/components/ProfilePage.tsx), thêm khối "Tóm tắt" (hoặc thêm vào [ProfileSidebar.tsx](file:///p:/DigiGO/AiNangVang/src/components/profile/ProfileSidebar.tsx)) hiển thị:
    - Đã mua của bạn: số giao dịch mua thành công của user hiện tại.
    - Đã mua toàn hệ thống: tổng total_sold toàn hệ thống.
    - Sản phẩm đã bán (global): tổng total_sold toàn hệ thống (nhãn hiển thị là "Đã bán").
- Storefront (phía khách):
  - Trong [ProductCard.tsx](file:///p:/DigiGO/AiNangVang/src/components/ProductCard.tsx), hiển thị badge "Đã bán: {variant.total_sold}" gần phần "Còn lại".
  - Tùy chọn: tại [ProductsPage.tsx](file:///p:/DigiGO/AiNangVang/src/components/ProductsPage.tsx) hiển thị "Tổng đã bán: X" (tổng của tất cả total_sold) dưới tiêu đề "Sản Phẩm".
- Admin (phía quản lý):
  - Trong [ProductsTab.tsx](file:///p:/DigiGO/AiNangVang/src/components/admin/ProductsTab.tsx), thêm dòng "Đã bán: {variant.total_sold}" ngay dưới "Stock" cho từng gói.
  - Trong [TransactionsTab.tsx](file:///p:/DigiGO/AiNangVang/src/components/admin/TransactionsTab.tsx), thêm thẻ tóm tắt bên cạnh "Tổng tiền nạp":
    - "Sản phẩm đã bán": đếm số giao dịch mua thành công từ người dùng không phải admin. Tận dụng mảng `transactions` đã truyền vào để tính.
  - [StatsTab.tsx](file:///p:/DigiGO/AiNangVang/src/components/admin/StatsTab.tsx) đã có chỉ số "Sản phẩm đã bán" theo khoảng thời gian; giữ nguyên.

## Triển Khai (Frontend)
- Thêm state và hàm fetch ở ProfilePage:
  - `personalPurchaseCount`, `globalPurchaseCount` (dùng tổng total_sold), `globalSoldCount` (cùng giá trị).
  - Hàm `fetchCounts()`:
    - Cá nhân: `supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('type','purchase').eq('status','completed')`.
    - Global sold/mua: `supabase.from('product_variants').select('total_sold')` rồi cộng tổng client-side.
  - Gọi `fetchCounts()` sau khi có `user/session` và khi nhấn "Làm mới".
- ProductCard:
  - Thêm hiển thị `Đã bán: {variant.total_sold || 0}` cạnh nhãn "Còn lại".
- ProductsPage (tùy chọn):
  - Tính `const totalSold = products.flatMap(p => p.variants || []).reduce((s,v) => s + (v.total_sold || 0), 0)` và render dưới tiêu đề.
- Admin ProductsTab:
  - Thêm dòng hiển thị `Đã bán: {variant.total_sold || 0}` trong thẻ mỗi variant.
- Admin TransactionsTab:
  - Tính `const totalSold = transactions.filter(tx => tx.type==='purchase' && tx.status==='completed' && !tx.users?.is_admin).length` và render "Sản phẩm đã bán" trong thẻ Summary.

## Kiểm Tra & Xác Minh
- /profile: số "Đã mua của bạn" khớp với số item hiển thị trong tab "Đơn đã mua" có trạng thái "Thành công".
- Storefront: mỗi gói hiển thị "Đã bán" khớp với sắp xếp "bestselling" (đang dùng `total_sold`).
- Admin: ProductsTab hiển thị đúng tổng bán mỗi variant; TransactionsTab card hiển thị số lượng khớp với danh sách đã lọc.

## Hiệu Năng & Quy Ước
- Dùng truy vấn count với `head: true` cho cá nhân để giảm payload.
- Một truy vấn tổng hợp `product_variants.total_sold` là nhẹ; không cần join.
- Không thay đổi logic bảo mật; tiếp tục loại trừ admin trong phần thống kê bán ở admin như hiện tại trong StatsTab.

## Phạm Vi File Sẽ Chỉnh
- [ProfilePage.tsx](file:///p:/DigiGO/AiNangVang/src/components/ProfilePage.tsx)
- [ProfileSidebar.tsx](file:///p:/DigiGO/AiNangVang/src/components/profile/ProfileSidebar.tsx)
- [ProductCard.tsx](file:///p:/DigiGO/AiNangVang/src/components/ProductCard.tsx)
- (tùy chọn) [ProductsPage.tsx](file:///p:/DigiGO/AiNangVang/src/components/ProductsPage.tsx)
- [TransactionsTab.tsx](file:///p:/DigiGO/AiNangVang/src/components/admin/TransactionsTab.tsx)
- [ProductsTab.tsx](file:///p:/DigiGO/AiNangVang/src/components/admin/ProductsTab.tsx)

Bạn xác nhận kế hoạch này để mình tiến hành triển khai và kiểm thử?