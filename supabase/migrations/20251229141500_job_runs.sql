CREATE TABLE IF NOT EXISTS public.job_runs (
  id bigserial PRIMARY KEY,
  job_name text NOT NULL,
  started_at timestamptz NOT NULL,
  finished_at timestamptz NOT NULL,
  total_deleted int DEFAULT 0,
  batch_count int DEFAULT 0,
  error text
);

