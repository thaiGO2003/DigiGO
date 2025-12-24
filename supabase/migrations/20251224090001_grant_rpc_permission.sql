-- Grant execute permission to anon (unauthenticated) users so they can check codes during registration
GRANT EXECUTE ON FUNCTION check_referral_code(text) TO anon;
GRANT EXECUTE ON FUNCTION check_referral_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_referral_code(text) TO service_role;

NOTIFY pgrst, 'reload schema';
