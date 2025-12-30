CREATE OR REPLACE FUNCTION public.cleanup_inactive_unfunded_users(p_batch_size int DEFAULT 1000)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE v_deleted int;
BEGIN
WITH candidates AS (
  SELECT u.id
  FROM public.users u
  WHERE COALESCE(u.total_deposited, 0) <= 0
    AND u.created_at <= now() - interval '7 days'
  LIMIT p_batch_size
)
INSERT INTO public.deleted_users_backup (user_id, email, username, created_at, total_deposited, reason, deleted_at)
SELECT u.id, u.email, u.username, u.created_at, COALESCE(u.total_deposited, 0), 'no_top_up_7_days', now()
FROM public.users u
JOIN candidates c ON c.id = u.id;

DELETE FROM public.referral_earnings re
WHERE re.referred_user_id IN (SELECT id FROM candidates)
   OR re.referrer_id IN (SELECT id FROM candidates);

DELETE FROM public.chat_messages cm
WHERE cm.user_id IN (SELECT id FROM candidates);

DELETE FROM public.transactions tr
WHERE tr.user_id IN (SELECT id FROM candidates);

DELETE FROM public.users u
WHERE u.id IN (SELECT id FROM candidates);

DELETE FROM auth.identities ai
WHERE ai.user_id IN (SELECT id FROM candidates);

DELETE FROM auth.users au
WHERE au.id IN (SELECT id FROM candidates);

GET DIAGNOSTICS v_deleted = ROW_COUNT;
RETURN v_deleted;
END;
$$;

