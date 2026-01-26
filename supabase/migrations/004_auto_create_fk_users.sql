-- supabase/migrations/004_auto_create_fk_users.sql
-- Auto-create fk_users and fk_user_profiles when auth.users is created
-- This solves the RLS policy issue during signup

-- ============================================
-- DISABLE OLD TRIGGER (from schema.sql)
-- ============================================

-- Drop the old trigger that tries to create fk_user_profiles
-- This was causing: "relation fk_user_profiles does not exist" error
DROP TRIGGER IF EXISTS create_profile_on_user_insert ON fk_users;

-- ============================================
-- FUNCTION: Auto-create fk_users on signup
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create fk_users record
  INSERT INTO public.fk_users (
    id,
    email,
    phone,
    auth_provider,
    is_email_verified,
    is_phone_verified,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    CASE
      WHEN NEW.raw_app_meta_data->>'provider' = 'google' THEN 'google'
      WHEN NEW.phone IS NOT NULL THEN 'phone'
      ELSE 'email'
    END,
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    COALESCE(NEW.phone_confirmed_at IS NOT NULL, false),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, fk_users.email),
    phone = COALESCE(EXCLUDED.phone, fk_users.phone),
    is_email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, fk_users.is_email_verified),
    is_phone_verified = COALESCE(NEW.phone_confirmed_at IS NOT NULL, fk_users.is_phone_verified),
    updated_at = NOW();

  -- Create fk_user_profiles record (if table exists)
  BEGIN
    INSERT INTO public.fk_user_profiles (user_id, language)
    VALUES (NEW.id, 'en')
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist yet, skip profile creation
    NULL;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: On auth.users insert
-- ============================================

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================
-- TRIGGER: On auth.users update (for email/phone verification)
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (
    OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at OR
    OLD.phone_confirmed_at IS DISTINCT FROM NEW.phone_confirmed_at
  )
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================
-- UPDATE RLS POLICIES
-- ============================================

-- Allow users to insert their own record (backup for edge cases)
DROP POLICY IF EXISTS "Users can insert own record" ON fk_users;
CREATE POLICY "Users can insert own record" ON fk_users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- BACKFILL: Create fk_users for existing auth.users
-- ============================================

-- This will create fk_users records for any existing auth.users
-- that don't have a corresponding fk_users record
INSERT INTO public.fk_users (id, email, phone, auth_provider, created_at, updated_at)
SELECT
  au.id,
  au.email,
  au.phone,
  CASE
    WHEN au.raw_app_meta_data->>'provider' = 'google' THEN 'google'
    WHEN au.phone IS NOT NULL THEN 'phone'
    ELSE 'email'
  END,
  NOW(),
  NOW()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.fk_users fu WHERE fu.id = au.id
)
ON CONFLICT (id) DO NOTHING;
