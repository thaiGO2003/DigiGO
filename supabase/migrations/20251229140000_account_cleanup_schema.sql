CREATE TABLE IF NOT EXISTS public.deleted_users_backup (
  user_id uuid NOT NULL,
  email text,
  username text,
  created_at timestamptz,
  total_deposited numeric DEFAULT 0,
  reason text,
  deleted_at timestamptz NOT NULL,
  extra jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_total_deposited_created_at
  ON public.users (total_deposited, created_at);

CREATE INDEX IF NOT EXISTS idx_transactions_user_type_status_created
  ON public.transactions (user_id, type, status, created_at);

