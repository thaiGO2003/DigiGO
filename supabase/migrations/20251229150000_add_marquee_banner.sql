-- Migration to add marquee_banner settings
-- Default content: "Cursor phải chờ Dev gửi nên khuyến nghị mua từ 10h30 sáng đến 9h tối"
-- Enabled by default, speed 12 (though static now)

INSERT INTO global_settings (key, value)
VALUES (
  'marquee_banner', 
  '{
    "enabled": true, 
    "text": "Cursor phải chờ Dev gửi nên khuyến nghị mua từ 10h30 sáng đến 9h tối", 
    "speed": 12
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE
SET value = '{
    "enabled": true, 
    "text": "Cursor phải chờ Dev gửi nên khuyến nghị mua từ 10h30 sáng đến 9h tối", 
    "speed": 12
  }'::jsonb;
