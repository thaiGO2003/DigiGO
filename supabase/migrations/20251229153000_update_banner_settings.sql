-- Migration to update notification banner settings structure
-- Add fields: position, height, opacity, closable, autoHide, autoHideDelay

DO $$
DECLARE
  current_val jsonb;
BEGIN
  -- Get current value to preserve text if exists
  SELECT value INTO current_val FROM global_settings WHERE key = 'marquee_banner';

  IF current_val IS NULL THEN
    current_val := '{}'::jsonb;
  END IF;

  -- Merge new defaults
  INSERT INTO global_settings (key, value)
  VALUES (
    'marquee_banner',
    jsonb_build_object(
      'enabled', COALESCE((current_val->>'enabled')::boolean, true),
      'text', COALESCE(current_val->>'text', 'Cursor phải chờ Dev gửi nên khuyến nghị mua từ 10h30 sáng đến 9h tối'),
      'speed', COALESCE((current_val->>'speed')::numeric, 12), -- Keep for backward compatibility if needed, though unused now
      'position', 'top',
      'height', 40,
      'opacity', 1,
      'closable', true,
      'autoHide', false,
      'autoHideDelay', 10
    )
  )
  ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value;
END $$;
