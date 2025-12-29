I will fix the detected syntax errors and missing imports.

1.  **Fix `AuthModal.tsx`**:
    - Remove the extra `</div>` tag at the end of the file (likely line 514) that is causing the JSX nesting error.

2.  **Fix `ChatWidget.tsx`**:
    - Import the missing `useMobileKeyboardFix` hook from `../hooks/useMobileKeyboardFix`.
    - Remove the unused `viewportHeight` variable destructuring, as the hook is primarily used for its side effects (scrolling inputs into view).

3.  **Verify**:
    - Ensure no new linter errors are introduced.
