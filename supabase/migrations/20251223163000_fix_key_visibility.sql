-- Enable RLS on product_keys (already enabled but good to ensure)
ALTER TABLE product_keys ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view purchased keys" ON product_keys;

-- Create policy for users to view keys linked to their transactions
CREATE POLICY "Users can view purchased keys" ON product_keys
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT key_id 
    FROM transactions 
    WHERE user_id = auth.uid()
  )
);
