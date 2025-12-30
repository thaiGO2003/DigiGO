CREATE OR REPLACE FUNCTION public.backfill_total_deposited()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
UPDATE public.users u
SET total_deposited = sub.sum_amount
FROM (
  SELECT t.user_id, COALESCE(SUM(t.amount), 0) AS sum_amount
  FROM public.transactions t
  WHERE t.type = 'top_up' AND t.status = 'completed'
  GROUP BY t.user_id
) sub
WHERE u.id = sub.user_id;
$$;

