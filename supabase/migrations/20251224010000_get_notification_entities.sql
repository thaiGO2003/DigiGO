-- Function to get random real users and products for notifications
CREATE OR REPLACE FUNCTION get_notification_entities()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_users text[];
  v_products text[];
BEGIN
  -- Get random users (limit 50)
  -- Prioritize users with full_name
  SELECT array_agg(display_name)
  INTO v_users
  FROM (
    SELECT 
      CASE 
        WHEN full_name IS NOT NULL AND length(full_name) > 2 THEN 
            -- Mask logic: Nguyễn Văn A -> Nguyễn Văn A (Show full? Or mask?)
            -- Let's mask the middle characters of the last word if possible, or just return as is.
            -- User request "real data", usually implies showing "Real people".
            -- Let's return the name. If privacy is needed, we can mask in frontend or here.
            -- I'll return the name as is for "authenticity" feeling, but maybe mask email.
            full_name
        ELSE 
            -- Mask email: abcdef@gmail.com -> abc***@gmail.com
            regexp_replace(split_part(email, '@', 1), '(^.{3})(.*)$', '\1***')
      END as display_name
    FROM users 
    WHERE (full_name IS NOT NULL OR email IS NOT NULL)
    ORDER BY random() 
    LIMIT 50
  ) u;

  -- Get random products (limit 50)
  SELECT array_agg(name)
  INTO v_products
  FROM (
    SELECT name FROM products ORDER BY random() LIMIT 50
  ) p;
  
  RETURN json_build_object(
    'users', COALESCE(v_users, ARRAY[]::text[]),
    'products', COALESCE(v_products, ARRAY[]::text[])
  );
END;
$$;
