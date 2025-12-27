-- Remove '@' from the beginning of usernames
UPDATE users 
SET username = REGEXP_REPLACE(username, '^@+', '') 
WHERE username LIKE '@%';
