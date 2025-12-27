-- 1. Add referral_count column to users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS referral_count integer DEFAULT 0;

-- 2. Function to recalculate referral counts (maintenance)
CREATE OR REPLACE FUNCTION recalculate_referral_counts()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Reset all counts
  UPDATE public.users SET referral_count = 0;
  
  -- Update with actual counts
  UPDATE public.users u
  SET referral_count = (
    SELECT count(*) 
    FROM public.users r 
    WHERE r.referred_by = u.id
  );
END;
$$;

-- 3. Trigger to maintain referral_count
CREATE OR REPLACE FUNCTION update_referral_count_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF NEW.referred_by IS NOT NULL THEN
      UPDATE public.users SET referral_count = referral_count + 1 WHERE id = NEW.referred_by;
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    IF OLD.referred_by IS NOT NULL THEN
      UPDATE public.users SET referral_count = referral_count - 1 WHERE id = OLD.referred_by;
    END IF;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD.referred_by IS DISTINCT FROM NEW.referred_by THEN
      IF OLD.referred_by IS NOT NULL THEN
        UPDATE public.users SET referral_count = referral_count - 1 WHERE id = OLD.referred_by;
      END IF;
      IF NEW.referred_by IS NOT NULL THEN
        UPDATE public.users SET referral_count = referral_count + 1 WHERE id = NEW.referred_by;
      END IF;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_maintain_referral_count ON public.users;
CREATE TRIGGER trigger_maintain_referral_count
AFTER INSERT OR UPDATE OR DELETE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_referral_count_trigger();

-- 4. Initial calculation
SELECT recalculate_referral_counts();

NOTIFY pgrst, 'reload schema';
