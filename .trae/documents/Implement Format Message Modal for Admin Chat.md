I will implement a "Format Message" feature in the Admin Chat Tab.

### 1. New Component: `FormatMessageModal.tsx`
- Create a new component `src/components/admin/FormatMessageModal.tsx`.
- **Props**: `isOpen`, `onClose`, `onSend(message: string)`.
- **State**:
    - `activeTab`: 'cursor' (default).
    - `key`: string input.
    - `tokenKey`: string input.
- **UI**:
    - Modal overlay and container.
    - Header with title "Gửi tin nhắn định dạng".
    - Tabs (start with "Cursor").
    - Input fields for "Key" and "Token key".
    - Footer with "Hủy" and "Gửi" buttons.
- **Logic**:
    - On "Gửi" click:
        - Validate inputs (optional, maybe check if empty).
        - Construct message: `Key: ${key}\nToken key: ${tokenKey}`.
        - Call `onSend` with the constructed message.
        - Close modal and show success alert (or rely on the main chat to show the sent message).

### 2. Update `ChatTab.tsx`
- Import `FormatMessageModal`.
- Add state `showFormatModal` (boolean).
- Add "Gửi Key" button in the Chat Input area (next to the input field or Send button).
    - Icon: `FileJson` or `Code` or `Key` from `lucide-react`.
    - Tooltip: "Gửi Key/Token".
- Handle `onSend` from the modal:
    - Call the existing `onMessageChange` to set the message text (or directly append/replace).
    - OR directly call `onSendMessage` logic if we want to send immediately.
    - *Decision*: The user requested "khi click sẽ hiển thị modal... xử lý khi admin nhấn gửi... tạo chuỗi tin nhắn". To make it seamless, the modal's "Gửi" button should trigger the actual sending of the message.
    - I will pass a handler `handleSendFormattedMessage` to the modal. This handler will take the formatted string, set it as the `newMessage`, and then trigger the send submission (or just update the input so the admin can review before sending, but the requirement says "Xử lý khi admin nhấn gửi... tạo chuỗi...").
    - Refinement: The requirement says "Xử lý khi admin nhấn gửi" (in modal) -> "Tạo chuỗi tin nhắn" -> "Hiển thị thông báo xác nhận".
    - So I will:
        1. Receive formatted string from modal.
        2. Set it to `newMessage` state.
        3. Programmatically submit the form (or call a new prop `onSendDirectly` if `onSendMessage` expects an event).
        4. Or simpler: Update `ChatTab` to accept a `onSendText` prop (which `AdminPage` likely has logic for) or just reuse `onMessageChange` + manual submit.
        - Looking at `ChatTab.tsx`, `onSendMessage` takes `React.FormEvent`. I'll need to refactor or adapt.
        - I'll modify `ChatTab` to handle the text sending. Since `onSendMessage` is passed from parent, I might need to change `AdminPage` or just simulate the event.
        - Better approach: Modify `ChatTab` to just update the input with the formatted text, or ask parent to send.
        - Let's look at `AdminPage.tsx` again (from memory/context). `handleSendMessage` in `AdminPage` uses `newMessage` state.
        - So in `ChatTab`, if I set `onMessageChange(formattedText)`, it updates the state in `AdminPage`. Then I need to trigger sending.
        - I will expose a way to trigger send, or just set the text and let the user press send?
        - User requirement: "Hiển thị thông báo xác nhận sau khi gửi thành công". This implies immediate sending.
        - I will modify `ChatTab` to handle this sequence: `onMessageChange(text)` -> `onSendMessage(fakeEvent)`.

### 3. Implementation Details
- **Button Location**: Inside the `form` tag in `ChatTab`, before the input or between input and send button. Let's place it left of the input for clarity, or inside the input area? Left of input seems standard for attachments/tools.
- **Design**: Icon button, maybe with a distinct color or just gray/blue.
- **Responsive**: Modal should use `max-w-md w-full` and handle mobile width.

### Plan Steps
1. Create `src/components/admin/FormatMessageModal.tsx`.
2. Modify `src/components/admin/ChatTab.tsx` to include the new button and modal.
3. Implement the logic to construct the message and send it.
