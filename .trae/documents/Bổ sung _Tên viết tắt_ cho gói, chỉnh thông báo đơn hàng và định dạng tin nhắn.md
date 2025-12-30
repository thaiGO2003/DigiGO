## Tổng Quan
- Thêm trường bắt buộc và duy nhất "Tên viết tắt" cho mỗi gói sản phẩm (variant).
- Cập nhật thông báo đơn hàng: giữ "Đơn hàng mới!", bổ sung "Hãy nhập hàng!" (không có giá), cả hai hiển thị rõ Mã đơn hàng.
- Chuẩn hóa định dạng tin nhắn từ khách hàng: "Họ tên" trước, "Username" sau, áp dụng nhất quán.
- Bổ sung kiểm thử cho tính duy nhất và các yêu cầu hiển thị.

## Cơ Sở Dữ Liệu
- Thêm cột mới vào bảng product_variants:
  - short_name TEXT NOT NULL.
  - Ràng buộc duy nhất hệ thống: UNIQUE INDEX trên lower(short_name) để đảm bảo không phân biệt chữ hoa/thường.
- Backfill dữ liệu hiện có: sinh short_name tạm thời an toàn, không trùng lặp (ví dụ: slug(product.name) + '-' + slug(variant.name) + '-' + 4 ký tự ngẫu nhiên). Tránh lỗi migration khi dữ liệu cũ chưa có short_name.
- Cập nhật RPC purchase_product để trả thêm mảng order_codes:
  - order_codes: lấy từ v_transaction_ids, dạng split_part(uuid, '-', 1) để dùng làm "Mã đơn hàng".
  - Với manual delivery, vẫn giữ key_values như hiện tại; ngoài ra trả thêm order_codes để đồng bộ cách lấy mã.
- Xem xét cập nhật RPC get_products_with_variants để trả short_name (không bắt buộc, nhưng hữu ích cho UI/quản trị).

## UI Quản Trị (Form Gói)
- Sửa [VariantModal.tsx](file:///p:\DigiGO\AiNangVang\src\components\admin\VariantModal.tsx):
  - Thêm input bắt buộc "Tên viết tắt" (short_name) vào form.
  - Debounce 300–500ms và kiểm tra tính duy nhất khi người dùng nhập:
    - Gọi Supabase: select id from product_variants where lower(short_name) = lower($input).
    - Khi edit, loại trừ chính variant hiện tại (id != currentId).
  - Hiển thị lỗi rõ ràng dưới ô nhập nếu trùng lặp và chặn submit.
  - Trước khi insert/update, kiểm tra lần cuối để tránh race condition; để DB UNIQUE đảm bảo tuyệt đối.

## Thông Báo Đơn Hàng
- Sửa [ProductsPage.tsx](file:///p:\DigiGO\AiNangVang\src\components\ProductsPage.tsx#L240-L252):
  - Sau khi gọi purchase_product, lấy orderCode = data.order_codes?.[0].
  - Gửi 2 tin nhắn qua Telegram:
    1) "Đơn hàng mới!": giữ nguyên nội dung hiện tại, bổ sung dòng "- Mã đơn hàng: <CODE>".
    2) "Hãy nhập hàng!": nội dung giống tin 1 nhưng loại bỏ "Đơn giá" và "Tổng tiền", vẫn giữ "Họ tên", "Username", "Sản phẩm", "Gói", "Số lượng", và thêm "- Mã đơn hàng: <CODE>".
  - Trường hợp fallback:
    - Nếu order_codes không trả về, với manual delivery, lấy mã từ data.key_values (đã chứa "Mã đơn...").
    - Với auto delivery, truy vấn nhanh giao dịch mới nhất của user cho variant đó (trong 1 phút) để lấy mã (tx.id.split('-')[0]).

## Định Dạng Tin Nhắn Khách Hàng
- Sửa [ChatWidget.tsx](file:///p:\DigiGO\AiNangVang\src\components\ChatWidget.tsx#L70-L74) và [ChatWidget.tsx](file:///p:\DigiGO\AiNangVang\src\components\ChatWidget.tsx#L203-L210):
  - Đổi thứ tự hiển thị thành "- Họ tên: <...>\n- Username: <...>".
  - Đảm bảo đồng nhất ở tất cả chỗ gửi Telegram.

## Kiểm Thử
- SQL test (Supabase): thêm file trong supabase/tests/ với các ca:
  - Nhập mới: insert product_variants với short_name mới → thành công.
  - Chỉnh sửa: update short_name sang giá trị chưa tồn tại → thành công.
  - Nhập trùng: insert/update với short_name đã tồn tại (khác id) → lỗi vi phạm UNIQUE.
- Thông báo đơn hàng:
  - Gọi purchase_product trong môi trường test và kiểm tra JSON trả về có order_codes.
  - Xác minh ở UI thủ công: cả hai tin nhắn đều hiển thị đúng Mã đơn hàng.
- Định dạng tin nhắn khách hàng:
  - Kiểm tra thủ công 2 luồng gửi (sendText, sendMessage): thứ tự "Họ tên" trước, "Username" sau.
- Xác nhận nội dung "Hãy nhập hàng!" không có thông tin "Đơn giá"/"Tổng tiền".

## Rủi Ro & Xử Lý
- Migration UNIQUE có thể thất bại nếu hai gói sinh short_name trùng. Dùng hậu tố ngẫu nhiên để đảm bảo khác biệt.
- Fallback lấy mã đơn đảm bảo không làm gián đoạn gửi thông báo nếu RPC chưa kịp cập nhật.
- Không thay đổi logic giá/tồn kho; chỉ bổ sung dữ liệu và thông báo.

## Công Việc Sẽ Thực Hiện
- Tạo migration thêm short_name + UNIQUE (lower(short_name)) và backfill an toàn.
- Cập nhật purchase_product trả order_codes.
- Cập nhật VariantModal.tsx: thêm field, validation duy nhất, chặn submit khi trùng.
- Cập nhật ProductsPage.tsx: thêm mã đơn vào 2 tin nhắn, tạo tin "Hãy nhập hàng!" bỏ thông tin giá.
- Cập nhật ChatWidget.tsx: đổi thứ tự "Họ tên" trước "Username" ở cả 2 đoạn.
- Thêm SQL tests cho tính duy nhất và order_codes.

## Tiêu Chí Hoàn Thành
- Form gói hiển thị "Tên viết tắt" bắt buộc; cảnh báo trùng lặp thời gian thực.
- CSDL đảm bảo duy nhất; insert/update trùng lặp bị chặn.
- Cả hai tin Telegram gồm mã đơn hàng; tin "Hãy nhập hàng!" không chứa giá.
- Tin nhắn khách hàng nhất quán: Họ tên trước, Username sau.
- Kiểm thử theo 4 mục yêu cầu đều đạt.