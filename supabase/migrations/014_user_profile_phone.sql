-- supabase/migrations/014_user_profile_phone.sql
-- Add phone and country_code fields to fk_user_profiles for profile setup

-- ============================================
-- Add phone and country_code columns
-- ============================================

ALTER TABLE fk_user_profiles
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'IN';

-- ============================================
-- Create index for phone lookup
-- ============================================

CREATE INDEX IF NOT EXISTS idx_fk_user_profiles_phone
ON fk_user_profiles(phone)
WHERE phone IS NOT NULL;

-- ============================================
-- Comment on columns
-- ============================================

COMMENT ON COLUMN fk_user_profiles.phone IS 'User phone number with country code (e.g., +919876543210)';
COMMENT ON COLUMN fk_user_profiles.country_code IS 'ISO country code (e.g., IN, US, AE)';
