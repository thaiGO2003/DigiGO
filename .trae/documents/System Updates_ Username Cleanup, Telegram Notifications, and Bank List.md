I will implement the requested changes across the system to clean up usernames, update Telegram notifications, and add the new bank.

### 1. Database & User Data Cleanup
- **Migration**: Create a new SQL migration file `supabase/migrations/20251227010000_clean_usernames.sql` to remove the '@' character from the beginning of all existing usernames in the `users` table.
- **Frontend Validation**: Update `src/components/AuthModal.tsx` to automatically strip the '@' character when users enter their username during registration or login.

### 2. Telegram Notification Formatting
- **Purchase Notifications**: Update `src/components/ProductsPage.tsx` to format the order success message:
  - Change "User" to "- Họ tên" (using `full_name` if available).
  - Add "- Đơn giá" (Unit Price).
  - Add bullet points "- " to all lines.
- **Support Chat Messages**: Check and update `src/components/ChatWidget.tsx` to match the bullet point style if applicable.

### 3. Automated Top-up Notifications (Supabase Edge Function)
- **Webhook Update**: Modify `supabase/functions/sepay-webhook/index.ts` to send a Telegram notification upon successful payment processing.
- **Logic**: Implement a `sendTelegramNotification` helper within the Edge Function (as it runs in a Deno environment and cannot import the React helper).
- **Format**:
  ```
  <b>💰 Khách hàng nạp tiền!</b>
  
  - Họ tên: [Full Name]
  - Username: [Username]
  - Mã giao dịch: [Reference Number]
  - Số tiền: [Amount]đ
  ```

### 4. Bank Configuration
- **Update Bank List**: Add "Kien Long Bank" (Code: KLB) to the `VIETNAM_BANKS` list in `src/components/admin/types.ts` so it appears in the Admin Bank tab combobox.

### 5. Verification
- **Data**: Verify username cleanup via SQL.
- **UI**: Check the bank list in Admin.
- **Notifications**: Verify the message format in code reviews (cannot send actual Telegram messages without valid tokens/environment, but logic will be verified).
