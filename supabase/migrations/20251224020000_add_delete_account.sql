-- Function to allow users to delete their own account
CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete from public.users (explicitly, in case no cascade or if we want to ensure cleanup)
  -- This will cascade to transactions, chat_messages, etc. based on their foreign keys
  DELETE FROM public.users WHERE id = v_user_id;

  -- Delete from auth.users (requires SECURITY DEFINER with sufficient privileges)
  -- This effectively removes the login
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;
