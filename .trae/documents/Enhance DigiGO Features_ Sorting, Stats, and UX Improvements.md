# Implementation Plan

## 1. Product Sorting (Admin & User View)
- **Goal**: Allow Admin to set a specific order for product packages (variants) and ensure users see them sorted correctly.
- **Steps**:
    1.  **Update `VariantModal.tsx`**: Add an input field for `sort_order` (Number) so admins can define the default order.
    2.  **Database**: Ensure `product_variants` table has a `sort_order` column (verify/add if missing).
    3.  **Frontend**: The `ProductsPage.tsx` already has sorting logic that respects `sort_order`. This step ensures the data entry part is available.

## 2. Deposit Success Modal ("Modal Oke")
- **Goal**: Make the deposit success modal auto-close after 5 seconds.
- **Steps**:
    1.  **Modify `TopUpPage.tsx`**:
        -   The current implementation already has a 5-second timer.
        -   I will remove the manual "Đóng" (Close) button to enforce the "appear then disappear" behavior and simplify the UI as requested.

## 3. Order Display Format
- **Goal**: Display product name alongside order code for purchases.
- **Steps**:
    1.  **Modify `TransactionHistory.tsx`**:
        -   Update the transaction item display logic.
        -   For purchases (`type === 'purchase'`), change the main label to follow the format: `Mã đơn - Tên gói sản phẩm` (or `Product Name - Variant Name` if "Mã đơn" implies the code).
        -   Specifically for "Manual Delivery" items where "Mã đơn" is prominent, ensure the format `Mã đơn - [Product Name] - [Variant Name]` is clear.

## 4. Admin Statistics & Dashboard
- **Goal**: Enhance Admin Dashboard with charts, filtering, and better navigation.
- **Steps**:
    1.  **Install `recharts`**: For displaying charts (Revenue, Deposits, etc.).
    2.  **Update `StatsTab.tsx`**:
        -   Add a **Line/Area Chart** showing Revenue and Deposits over time.
        -   Add a **Bar Chart** for Best Selling products.
        -   Implement "Click on Chart" interaction: Clicking a data point (e.g., a specific date) redirects to the `Transactions` tab with that date filter applied.
    3.  **Update `TransactionsTab.tsx`**:
        -   Ensure it accepts date filters passed from the Stats tab (via state or props).
    4.  **Update `AdminPage.tsx`**:
        -   **Reorder Tabs**: Move "Thống kê" (Stats) to the first position (leftmost).
        -   **Hash Navigation**: Implement URL hash handling (e.g., `/admin#stats`, `/admin#transactions`) to support linking from charts and general navigation.

## 5. Refactor Profile Page
- **Goal**: Reduce file size of `ProfilePage.tsx`.
- **Steps**:
    1.  **Extract Components**:
        -   Create `src/components/profile/ProfileTabs.tsx` to handle the tab navigation UI.
        -   Move the main render logic into smaller sub-components if needed.

## 6. Navigation Anchors (Hash Routing)
- **Goal**: Add `#` support for easy navigation.
- **Steps**:
    1.  **`AdminPage.tsx`**: Already covering this in Step 4.
    2.  **`ProfilePage.tsx`**: It already has hash support, but I will ensure it's robust during refactoring.
    3.  **`ProductsPage.tsx`**: Add hash support for filters (e.g., `/products#category=software`).

## Execution Order
1.  **Refactor & Navigation**: AdminPage, ProfilePage, ProductsPage (Hash support).
2.  **Features**: Admin Stats (Charts), Product Sorting (Variant Modal).
3.  **UI Tweaks**: Success Modal, Transaction History display.
