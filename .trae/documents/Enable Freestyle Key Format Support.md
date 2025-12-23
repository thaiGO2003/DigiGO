# Implementation Plan - Add Freestyle Key Input Option

## 1. Update `KeyModal.tsx` to Support Multiple Input Modes
- **Goal**: Provide two input methods for admins: Standard UUID and Freestyle.
- **Changes**:
    - Add a toggle or radio button group to switch between "UUID Mode" and "Freestyle Mode".
    - **UUID Mode**: Keep the existing input with the strict pattern validation and placeholder.
    - **Freestyle Mode**: Add a new input (or reuse the existing one with conditional props) that has **no pattern validation** and a generic placeholder.
    - Update `handleAddKey` to handle the input from whichever mode is active.

## 2. UI Layout in `KeyModal.tsx`
- **Layout**:
    - Add a segment control or tabs: `[ UUID Format ]` | `[ Freestyle ]`.
    - **UUID Tab**: Shows the existing UUID input field.
    - **Freestyle Tab**: Shows a simple text input (or textarea for bulk?) - *For now, sticking to single input as requested*.

## 3. Verification
- **Database**: `key_value` is `text`, so it supports both.
- **Display**: Existing display logic works for both.

## Execution Steps
1.  Modify `src/components/admin/KeyModal.tsx`:
    - Add state `inputMode`: `'uuid' | 'freestyle'`.
    - Render radio buttons/tabs to switch mode.
    - Conditionally render the `<input>`:
        - If `uuid`: Keep `pattern` and placeholder.
        - If `freestyle`: Remove `pattern`, change placeholder to "Nhập key tùy ý...".
