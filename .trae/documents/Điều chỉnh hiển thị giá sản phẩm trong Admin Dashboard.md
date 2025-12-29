# Kế hoạch điều chỉnh hiển thị giá trong Admin Dashboard

Tôi sẽ thực hiện thay đổi mã nguồn trong file `src/components/admin/ProductsTab.tsx` để cập nhật cách hiển thị giá theo yêu cầu:

## Chi tiết thay đổi:

Tại dòng 157-162 trong file `ProductsTab.tsx`, tôi sẽ thay thế đoạn code hiển thị giá hiện tại bằng logic mới:

1.  **Giá gốc (Cost Price):**
    *   Hiển thị văn bản: `Giá gốc: {giá trị}`
    *   Style: Màu đỏ (`text-red-600`), không gạch ngang.
    *   Logic: Luôn hiển thị nếu có giá trị `cost_price`.

2.  **Giá bán (Price):**
    *   Hiển thị văn bản: `Giá bán: {giá trị}`
    *   Logic màu sắc:
        *   Nếu `price < cost_price`: Màu vàng đậm (`text-yellow-600`) để cảnh báo (giá bán thấp hơn giá vốn).
        *   Ngược lại: Màu xanh (`text-blue-600`) như mặc định.
    *   Style chung: Font đậm (`font-semibold`).

## Mã nguồn dự kiến:

```tsx
<div className="flex flex-col gap-0.5 text-xs sm:text-sm">
    <span className="font-medium break-words text-base">{variant.name}</span>
    
    {/* Hiển thị Giá gốc */}
    <span className="text-red-600">
        Giá gốc: {(variant.cost_price || 0).toLocaleString('vi-VN')}đ
    </span>

    {/* Hiển thị Giá bán với logic đổi màu */}
    <span className={`font-semibold ${
        (variant.price < (variant.cost_price || 0)) 
            ? 'text-yellow-600' // Màu vàng nếu Giá bán < Giá gốc
            : 'text-blue-600'   // Màu xanh mặc định
    }`}>
        Giá bán: {variant.price.toLocaleString('vi-VN')}đ
    </span>

    <span className="text-gray-500">Stock: {variant.stock || 0}</span>
</div>
```

Tôi sẽ nhóm các thông tin này lại theo dạng cột (`flex-col`) để hiển thị rõ ràng hơn trên cả desktop và mobile, tránh bị rối mắt khi thêm nhãn text "Giá gốc/Giá bán".
