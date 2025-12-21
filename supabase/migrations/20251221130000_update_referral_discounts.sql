-- Cập nhật giảm giá cho người được giới thiệu: từ 5% xuống 1%
UPDATE global_settings 
SET value = '{"percent": 1}' 
WHERE key = 'referral_buyer_discount';

-- Cập nhật hoa hồng cho người giới thiệu: 1% cho mỗi người, tối đa 10%
UPDATE global_settings 
SET value = '{"percent": 1, "max_percent": 10}' 
WHERE key = 'referral_commission_base';

NOTIFY pgrst, 'reload schema';