-- supabase/migrations/003_google_tokens.sql
-- Google OAuth Token Storage with Encryption
-- Version: 1.0.0

-- ============================================
-- ENABLE REQUIRED EXTENSIONS
-- ============================================

-- pgcrypto for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- pgsodium for key management (Supabase has this built-in)
-- Note: In production, use Supabase Vault for key storage


-- ============================================
-- ENCRYPTION KEY SETUP
-- ============================================

-- Store encryption key in Supabase Vault (recommended)
-- Run this separately in Supabase dashboard:
-- SELECT vault.create_secret('google_tokens_key', 'your-32-char-secret-key-here');

-- For development, we'll use a config table
-- In production, REPLACE this with Supabase Vault
CREATE TABLE IF NOT EXISTS _config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- IMPORTANT: Replace this key in production!
-- This is just a placeholder - generate a real 32+ character key
INSERT INTO _config (key, value)
VALUES ('google_tokens_encryption_key', 'REPLACE_WITH_SECURE_KEY_IN_PRODUCTION_32CHARS')
ON CONFLICT (key) DO NOTHING;

-- Restrict access to config table
ALTER TABLE _config ENABLE ROW LEVEL SECURITY;
-- No policies = no direct access from client


-- ============================================
-- GOOGLE TOKENS TABLE
-- ============================================

CREATE TABLE fk_user_google_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES fk_users(id) ON DELETE CASCADE,

  -- Encrypted tokens (using pgp_sym_encrypt)
  access_token_encrypted BYTEA NOT NULL,
  refresh_token_encrypted BYTEA NOT NULL,

  -- Token metadata (not sensitive, stored plain)
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ NOT NULL,

  -- Scopes granted by user
  scopes TEXT[] NOT NULL DEFAULT '{}',

  -- Google account info (for display)
  google_email TEXT,
  google_name TEXT,
  google_picture TEXT,

  -- Status
  is_valid BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  last_refresh_at TIMESTAMPTZ,

  -- Error tracking
  last_error TEXT,
  error_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One token set per user
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE fk_user_google_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only see their own token records (metadata only)
CREATE POLICY "Users can view own token metadata" ON fk_user_google_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own tokens
CREATE POLICY "Users can insert own tokens" ON fk_user_google_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own tokens
CREATE POLICY "Users can update own tokens" ON fk_user_google_tokens
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own tokens (disconnect)
CREATE POLICY "Users can delete own tokens" ON fk_user_google_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Index for lookups
CREATE INDEX idx_fk_user_google_tokens_user ON fk_user_google_tokens(user_id);
CREATE INDEX idx_fk_user_google_tokens_valid ON fk_user_google_tokens(is_valid) WHERE is_valid = true;


-- ============================================
-- UPDATE fk_users TABLE
-- ============================================

-- Add Google Drive linking status
ALTER TABLE fk_users
ADD COLUMN IF NOT EXISTS google_drive_linked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS google_drive_linked_at TIMESTAMPTZ;


-- ============================================
-- ENCRYPTION/DECRYPTION FUNCTIONS
-- ============================================

-- Get encryption key (internal function)
CREATE OR REPLACE FUNCTION _get_encryption_key()
RETURNS TEXT AS $$
DECLARE
  enc_key TEXT;
BEGIN
  -- In production, use: SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'google_tokens_key'
  SELECT value INTO enc_key FROM _config WHERE key = 'google_tokens_encryption_key';
  RETURN enc_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Encrypt token (used when storing)
CREATE OR REPLACE FUNCTION encrypt_token(plain_token TEXT)
RETURNS BYTEA AS $$
BEGIN
  RETURN pgp_sym_encrypt(plain_token, _get_encryption_key());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Decrypt token (only for authenticated user's own tokens)
CREATE OR REPLACE FUNCTION decrypt_google_token(token_user_id UUID, token_type TEXT)
RETURNS TEXT AS $$
DECLARE
  encrypted_token BYTEA;
  decrypted TEXT;
BEGIN
  -- Security check: only allow decryption of own tokens
  IF auth.uid() IS NULL OR auth.uid() != token_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot decrypt tokens for other users';
  END IF;

  -- Get the encrypted token
  IF token_type = 'access' THEN
    SELECT access_token_encrypted INTO encrypted_token
    FROM fk_user_google_tokens
    WHERE user_id = token_user_id;
  ELSIF token_type = 'refresh' THEN
    SELECT refresh_token_encrypted INTO encrypted_token
    FROM fk_user_google_tokens
    WHERE user_id = token_user_id;
  ELSE
    RAISE EXCEPTION 'Invalid token type. Use "access" or "refresh"';
  END IF;

  IF encrypted_token IS NULL THEN
    RETURN NULL;
  END IF;

  -- Decrypt and return
  decrypted := pgp_sym_decrypt(encrypted_token, _get_encryption_key());
  RETURN decrypted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- HELPER FUNCTIONS FOR TOKEN MANAGEMENT
-- ============================================

-- Store Google tokens (encrypts automatically)
CREATE OR REPLACE FUNCTION store_google_tokens(
  p_access_token TEXT,
  p_refresh_token TEXT,
  p_expires_at TIMESTAMPTZ,
  p_scopes TEXT[],
  p_google_email TEXT DEFAULT NULL,
  p_google_name TEXT DEFAULT NULL,
  p_google_picture TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_token_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Must be logged in to store tokens';
  END IF;

  -- Upsert tokens
  INSERT INTO fk_user_google_tokens (
    user_id,
    access_token_encrypted,
    refresh_token_encrypted,
    expires_at,
    scopes,
    google_email,
    google_name,
    google_picture,
    is_valid,
    last_refresh_at
  ) VALUES (
    v_user_id,
    encrypt_token(p_access_token),
    encrypt_token(p_refresh_token),
    p_expires_at,
    p_scopes,
    p_google_email,
    p_google_name,
    p_google_picture,
    true,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    access_token_encrypted = encrypt_token(p_access_token),
    refresh_token_encrypted = encrypt_token(p_refresh_token),
    expires_at = p_expires_at,
    scopes = p_scopes,
    google_email = COALESCE(p_google_email, fk_user_google_tokens.google_email),
    google_name = COALESCE(p_google_name, fk_user_google_tokens.google_name),
    google_picture = COALESCE(p_google_picture, fk_user_google_tokens.google_picture),
    is_valid = true,
    last_refresh_at = NOW(),
    last_error = NULL,
    error_count = 0,
    updated_at = NOW()
  RETURNING id INTO v_token_id;

  -- Update user's Google Drive linked status
  UPDATE fk_users
  SET
    google_drive_linked = true,
    google_drive_linked_at = NOW(),
    updated_at = NOW()
  WHERE id = v_user_id;

  RETURN v_token_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Get current user's access token (decrypted)
CREATE OR REPLACE FUNCTION get_my_google_access_token()
RETURNS TABLE (
  access_token TEXT,
  expires_at TIMESTAMPTZ,
  is_expired BOOLEAN,
  scopes TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    decrypt_google_token(auth.uid(), 'access') as access_token,
    t.expires_at,
    (t.expires_at < NOW()) as is_expired,
    t.scopes
  FROM fk_user_google_tokens t
  WHERE t.user_id = auth.uid() AND t.is_valid = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Get current user's refresh token (decrypted) - use carefully!
CREATE OR REPLACE FUNCTION get_my_google_refresh_token()
RETURNS TEXT AS $$
BEGIN
  RETURN decrypt_google_token(auth.uid(), 'refresh');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Mark tokens as invalid (on error/revocation)
CREATE OR REPLACE FUNCTION invalidate_google_tokens(p_error_message TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE fk_user_google_tokens
  SET
    is_valid = false,
    last_error = p_error_message,
    error_count = error_count + 1,
    updated_at = NOW()
  WHERE user_id = v_user_id;

  UPDATE fk_users
  SET
    google_drive_linked = false,
    updated_at = NOW()
  WHERE id = v_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Disconnect Google (delete tokens completely)
CREATE OR REPLACE FUNCTION disconnect_google()
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  DELETE FROM fk_user_google_tokens WHERE user_id = v_user_id;

  UPDATE fk_users
  SET
    google_drive_linked = false,
    google_drive_linked_at = NULL,
    updated_at = NOW()
  WHERE id = v_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamp trigger
CREATE TRIGGER update_fk_user_google_tokens_updated_at
  BEFORE UPDATE ON fk_user_google_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- GOOGLE OAUTH SCOPES REFERENCE
-- ============================================

-- Required scopes for FamilyKnows:
-- 'openid'                                    - Basic auth
-- 'email'                                     - User's email
-- 'profile'                                   - User's name/picture
-- 'https://www.googleapis.com/auth/drive.file' - Access to files created by app
-- 'https://www.googleapis.com/auth/drive.appdata' - App-specific folder (hidden)

-- IMPORTANT: Request drive.file (not full drive access) for user trust


-- ============================================
-- PRODUCTION CHECKLIST
-- ============================================

-- 1. Generate a secure 32+ character encryption key
-- 2. Store it in Supabase Vault:
--    SELECT vault.create_secret('google_tokens_key', 'your-secure-key');
-- 3. Update _get_encryption_key() function to use Vault
-- 4. Delete the _config table placeholder
-- 5. Set up Google OAuth credentials in Google Cloud Console
-- 6. Configure redirect URIs for your app
