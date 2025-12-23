# Implementation Plan

## 1. Product Sorting Configuration
- **Goal**: Allow admins to define how variants are sorted for each specific product (e.g., by Price, Duration, or Best Selling).
- **Steps**:
    1.  **Update Type Definitions (`src/lib/supabase.ts`)**:
        -   Add `variant_sort_strategy` field to the `Product` interface.
        -   Type: `'default' | 'price_asc' | 'price_desc' | 'duration_asc' | 'duration_desc' | 'bestselling'`.
    2.  **Update Admin UI (`src/components/admin/ProductModal.tsx`)**:
        -   Add a dropdown (combobox) to the "Thêm/Sửa sản phẩm" form.
        -   Options:
            -   Mặc định (theo thứ tự set tay)
            -   Giá: Thấp đến Cao
            -   Giá: Cao đến Thấp
            -   Thời hạn: Ngắn đến Dài
            -   Thời hạn: Dài đến Ngắn
            -   Bán chạy nhất (Best Selling)
    3.  **Update User UI (`src/components/ProductsPage.tsx`)**:
        -   Modify the sorting logic.
        -   When the user's global filter is set to "Default", apply the **product-specific** sort strategy defined by the admin.

## 2. Transactions Tab Improvements
- **Goal**: Group transactions by day and show detailed timestamps.
- **Steps**:
    1.  **Modify `src/components/admin/TransactionsTab.tsx`**:
        -   **Group by Date**: Iterate through transactions and check if the date has changed compared to the previous row. Insert a section header row (e.g., `div` or `tr` with `colspan`) showing the date (e.g., "23/12/2025") when it changes.
        -   **Detailed Timestamp**: Update the "Ngày tạo" column to show the full time: `HH:mm:ss dd/MM/yyyy` (e.g., `14:30:05 23/12/2025`).

## 3. Database Note
-   I will update the frontend code to handle the `variant_sort_strategy` field.
-   **Note**: This assumes the `products` table in Supabase either allows unstructured data (if using JSON) or you will need to add the column `variant_sort_strategy` (text) to the `products` table. Since I cannot run SQL migrations directly without permission/tools, I will implement the code assuming the field is available or will be ignored if missing (non-breaking).

## Execution Order
1.  Update `supabase.ts` types.
2.  Update `ProductModal.tsx` form.
3.  Update `ProductsPage.tsx` logic.
4.  Update `TransactionsTab.tsx` rendering.
