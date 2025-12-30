-- Schedule the cleanup job using pg_cron
-- Note: pg_cron extension must be enabled in Supabase Dashboard first
-- Go to Database > Extensions and enable "pg_cron"
--
-- IMPORTANT:
-- We must not reference cron.* objects (cron.schedule, cron.job, etc.) directly
-- unless the schema exists, because Postgres can error during planning/parse time.
-- Use dynamic SQL (EXECUTE) so the names are only resolved at runtime.
DO $do$
DECLARE
  has_pg_cron boolean;
  has_cron_schema boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
    INTO has_pg_cron;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'cron'
  ) INTO has_cron_schema;

  IF has_pg_cron AND has_cron_schema THEN
    -- Unschedule if already exists (idempotent)
    EXECUTE $sql$
      DO $inner$
      BEGIN
        IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-weekly-accounts') THEN
          PERFORM cron.unschedule('cleanup-weekly-accounts');
        END IF;
      END
      $inner$;
    $sql$;

    -- Schedule the job
    EXECUTE $sql$
      SELECT cron.schedule(
        'cleanup-weekly-accounts',
        '0 18 * * 0',
        $job$
        SELECT
          net.http_post(
            url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/cleanup-weekly-accounts',
            headers := jsonb_build_object(
              'Content-type', 'application/json',
              'Authorization', 'Bearer ' || COALESCE((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret'), '')
            ),
            body := jsonb_build_object('time', now())
          );
        $job$
      );
    $sql$;

    RAISE NOTICE 'Scheduled cleanup-weekly-accounts job successfully';
  ELSE
    RAISE WARNING 'pg_cron extension / cron schema not available. Enable "pg_cron" in Supabase Dashboard (Database > Extensions). Cron job not scheduled.';
  END IF;
EXCEPTION
  WHEN invalid_schema_name THEN  -- SQLSTATE 3F000
    RAISE WARNING 'cron schema does not exist. Please enable pg_cron extension in Supabase Dashboard.';
  WHEN undefined_function THEN
    RAISE WARNING 'pg_cron functions not available. Please enable pg_cron extension in Supabase Dashboard.';
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to schedule cron job: %', SQLERRM;
END $do$;

