-- Migration: Create OTP Verification Tables for FamilyKnows
-- Run this on your FamilyKnows database

-- ================================================
-- 1. OTP Verifications Table
-- ================================================
CREATE TABLE IF NOT EXISTS otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    otp_hash VARCHAR(64) NOT NULL,  -- SHA256 hash of OTP
    expires_at TIMESTAMP NOT NULL,
    attempts INTEGER DEFAULT 0,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),

    -- Unique constraint to prevent duplicate active OTPs
    CONSTRAINT unique_phone_otp UNIQUE (phone)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_verifications(phone);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_verifications(expires_at);

-- ================================================
-- 2. User Sessions Table
-- ================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    user_id UUID REFERENCES fk_users(id) ON DELETE CASCADE,  -- Link to user after registration
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    device_info JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    last_active_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT unique_phone_session UNIQUE (phone)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_session_phone ON user_sessions(phone);
CREATE INDEX IF NOT EXISTS idx_session_user ON user_sessions(user_id);

-- ================================================
-- 3. Cleanup Function (run periodically)
-- ================================================
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM otp_verifications
    WHERE expires_at < NOW() - INTERVAL '1 hour'
       OR verified_at IS NOT NULL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 4. Rate Limiting Table (Optional but recommended)
-- ================================================
CREATE TABLE IF NOT EXISTS otp_rate_limits (
    phone VARCHAR(20) PRIMARY KEY,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP DEFAULT NOW(),
    blocked_until TIMESTAMP
);

-- Function to check rate limit (max 5 OTPs per hour)
CREATE OR REPLACE FUNCTION check_otp_rate_limit(p_phone VARCHAR)
RETURNS JSONB AS $$
DECLARE
    rate_record RECORD;
    max_requests INTEGER := 5;
    window_minutes INTEGER := 60;
BEGIN
    -- Get or create rate limit record
    SELECT * INTO rate_record FROM otp_rate_limits WHERE phone = p_phone;

    IF NOT FOUND THEN
        INSERT INTO otp_rate_limits (phone, request_count, window_start)
        VALUES (p_phone, 1, NOW());
        RETURN jsonb_build_object('allowed', true, 'remaining', max_requests - 1);
    END IF;

    -- Check if blocked
    IF rate_record.blocked_until IS NOT NULL AND rate_record.blocked_until > NOW() THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'message', 'Too many requests. Please try again later.',
            'blocked_until', rate_record.blocked_until
        );
    END IF;

    -- Check if window has expired (reset counter)
    IF rate_record.window_start < NOW() - (window_minutes || ' minutes')::INTERVAL THEN
        UPDATE otp_rate_limits
        SET request_count = 1, window_start = NOW(), blocked_until = NULL
        WHERE phone = p_phone;
        RETURN jsonb_build_object('allowed', true, 'remaining', max_requests - 1);
    END IF;

    -- Check if over limit
    IF rate_record.request_count >= max_requests THEN
        UPDATE otp_rate_limits
        SET blocked_until = NOW() + INTERVAL '1 hour'
        WHERE phone = p_phone;
        RETURN jsonb_build_object(
            'allowed', false,
            'message', 'Maximum OTP requests exceeded. Please try again in 1 hour.'
        );
    END IF;

    -- Increment counter
    UPDATE otp_rate_limits
    SET request_count = request_count + 1
    WHERE phone = p_phone;

    RETURN jsonb_build_object('allowed', true, 'remaining', max_requests - rate_record.request_count - 1);
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 5. Permissions (adjust based on your setup)
-- ================================================
-- Grant permissions to your N8N database user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON otp_verifications TO n8n_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_sessions TO n8n_user;
-- GRANT SELECT, INSERT, UPDATE ON otp_rate_limits TO n8n_user;
-- GRANT EXECUTE ON FUNCTION cleanup_expired_otps() TO n8n_user;
-- GRANT EXECUTE ON FUNCTION check_otp_rate_limit(VARCHAR) TO n8n_user;
