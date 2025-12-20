/*
  # Setup Admin User

  1. Admin Configuration
    - Set admin privileges for the specified email
    - Ensure admin can access all features
  
  2. Security
    - Admin has full access to all tables
    - Can manage products, users, and chat messages
*/

-- Update admin status for the specified email
UPDATE users 
SET is_admin = true 
WHERE email = 'luongquocthai.thaigo.2003@gmail.com';

-- If user doesn't exist, we'll handle it in the trigger function
-- The trigger will automatically set is_admin = true for this specific email

-- Update the handle_new_user function to automatically set admin for specific email
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    CASE 
      WHEN NEW.email = 'luongquocthai.thaigo.2003@gmail.com' THEN true
      ELSE false
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;