-- supabase/migrations/012_loan_verification.sql
-- Loan verification via 6-digit code (WhatsApp sharing)

-- ============================================
-- Add verification response columns to fk_invites
-- ============================================

ALTER TABLE fk_invites ADD COLUMN IF NOT EXISTS verified_by_name TEXT;
ALTER TABLE fk_invites ADD COLUMN IF NOT EXISTS verified_by_phone TEXT;
ALTER TABLE fk_invites ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- ============================================
-- Function: Create loan verification code
-- ============================================

CREATE OR REPLACE FUNCTION create_loan_verification(
  p_loan_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  verification_code TEXT,
  shareable_message TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_loan RECORD;
  v_code TEXT;
  v_existing_code TEXT;
  v_expires_at TIMESTAMPTZ;
  v_message TEXT;
BEGIN
  -- Get loan details
  SELECT
    l.id,
    l.workspace_id,
    l.loan_type,
    l.counterparty_name,
    l.counterparty_phone,
    l.principal_amount,
    l.verification_status,
    l.created_by
  INTO v_loan
  FROM fk_loans l
  WHERE l.id = p_loan_id;

  -- Validate loan exists
  IF v_loan.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, 'Loan not found'::TEXT;
    RETURN;
  END IF;

  -- Validate user created this loan
  IF v_loan.created_by != p_user_id THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, 'Only loan creator can request verification'::TEXT;
    RETURN;
  END IF;

  -- Check if already verified
  IF v_loan.verification_status = 'verified' THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, 'Loan is already verified'::TEXT;
    RETURN;
  END IF;

  -- Check for existing pending verification
  SELECT invite_code INTO v_existing_code
  FROM fk_invites
  WHERE loan_id = p_loan_id
    AND invite_type = 'loan_verification'
    AND status = 'pending'
    AND expires_at > NOW();

  IF v_existing_code IS NOT NULL THEN
    -- Return existing code
    v_message := format(
      'Please verify our loan record in FamilyKnows.%sAmount: ₹%s%sVerification Code: %s%sVerify at: https://familyknows.in/v/%s',
      E'\n', v_loan.principal_amount::TEXT, E'\n', v_existing_code, E'\n', v_existing_code
    );
    RETURN QUERY SELECT true, v_existing_code, v_message, NULL::TEXT;
    RETURN;
  END IF;

  -- Generate new 6-digit code (ensure uniqueness)
  LOOP
    v_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM fk_invites
      WHERE invite_code = v_code
        AND status = 'pending'
    );
  END LOOP;

  -- Set expiry (7 days like workspace invites)
  v_expires_at := NOW() + INTERVAL '7 days';

  -- Create invite record
  INSERT INTO fk_invites (
    workspace_id,
    invited_by,
    invite_type,
    phone,
    invite_code,
    status,
    expires_at,
    loan_id
  ) VALUES (
    v_loan.workspace_id,
    p_user_id,
    'loan_verification',
    v_loan.counterparty_phone,
    v_code,
    'pending',
    v_expires_at,
    p_loan_id
  );

  -- Update loan verification_sent_at
  UPDATE fk_loans
  SET verification_sent_at = NOW()
  WHERE id = p_loan_id;

  -- Build shareable message
  v_message := format(
    'Please verify our loan record in FamilyKnows.%sAmount: ₹%s%sVerification Code: %s%sVerify at: https://familyknows.in/v/%s',
    E'\n', v_loan.principal_amount::TEXT, E'\n', v_code, E'\n', v_code
  );

  RETURN QUERY SELECT true, v_code, v_message, NULL::TEXT;
END;
$$;

-- ============================================
-- Function: Verify loan by code
-- ============================================

CREATE OR REPLACE FUNCTION verify_loan_by_code(
  p_code TEXT,
  p_name TEXT,
  p_phone TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  loan_type TEXT,
  amount DECIMAL,
  loan_date DATE,
  lender_name TEXT,
  handshake_date TIMESTAMPTZ,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite RECORD;
  v_loan RECORD;
  v_creator_name TEXT;
  v_normalized_input_phone TEXT;
  v_normalized_loan_phone TEXT;
BEGIN
  -- Normalize phone numbers (remove spaces, dashes, +91)
  v_normalized_input_phone := REGEXP_REPLACE(p_phone, '[^0-9]', '', 'g');
  IF LENGTH(v_normalized_input_phone) > 10 THEN
    v_normalized_input_phone := RIGHT(v_normalized_input_phone, 10);
  END IF;

  -- Get invite record
  SELECT
    i.id,
    i.loan_id,
    i.status,
    i.expires_at
  INTO v_invite
  FROM fk_invites i
  WHERE i.invite_code = p_code
    AND i.invite_type = 'loan_verification';

  -- Validate invite exists
  IF v_invite.id IS NULL THEN
    RETURN QUERY SELECT
      false, NULL::TEXT, NULL::DECIMAL, NULL::DATE,
      NULL::TEXT, NULL::TIMESTAMPTZ, 'Invalid verification code'::TEXT;
    RETURN;
  END IF;

  -- Check if already used
  IF v_invite.status = 'accepted' THEN
    RETURN QUERY SELECT
      false, NULL::TEXT, NULL::DECIMAL, NULL::DATE,
      NULL::TEXT, NULL::TIMESTAMPTZ, 'This code has already been used'::TEXT;
    RETURN;
  END IF;

  -- Check if expired
  IF v_invite.expires_at < NOW() THEN
    UPDATE fk_invites SET status = 'expired' WHERE id = v_invite.id;
    RETURN QUERY SELECT
      false, NULL::TEXT, NULL::DECIMAL, NULL::DATE,
      NULL::TEXT, NULL::TIMESTAMPTZ, 'Verification code has expired'::TEXT;
    RETURN;
  END IF;

  -- Get loan details
  SELECT
    l.id,
    l.loan_type,
    l.counterparty_name,
    l.counterparty_phone,
    l.principal_amount,
    l.loan_date,
    l.created_by
  INTO v_loan
  FROM fk_loans l
  WHERE l.id = v_invite.loan_id;

  -- Normalize loan phone
  v_normalized_loan_phone := REGEXP_REPLACE(COALESCE(v_loan.counterparty_phone, ''), '[^0-9]', '', 'g');
  IF LENGTH(v_normalized_loan_phone) > 10 THEN
    v_normalized_loan_phone := RIGHT(v_normalized_loan_phone, 10);
  END IF;

  -- Validate name (exact match, case-insensitive)
  IF LOWER(TRIM(p_name)) != LOWER(TRIM(v_loan.counterparty_name)) THEN
    RETURN QUERY SELECT
      false, NULL::TEXT, NULL::DECIMAL, NULL::DATE,
      NULL::TEXT, NULL::TIMESTAMPTZ, 'Name does not match our records'::TEXT;
    RETURN;
  END IF;

  -- Validate phone (normalized comparison)
  IF v_normalized_input_phone != v_normalized_loan_phone THEN
    RETURN QUERY SELECT
      false, NULL::TEXT, NULL::DECIMAL, NULL::DATE,
      NULL::TEXT, NULL::TIMESTAMPTZ, 'Phone number does not match our records'::TEXT;
    RETURN;
  END IF;

  -- Get creator name for response
  SELECT COALESCE(up.full_name, fu.email, 'Unknown') INTO v_creator_name
  FROM fk_users fu
  LEFT JOIN fk_user_profiles up ON up.user_id = fu.id
  WHERE fu.id = v_loan.created_by;

  -- All validations passed - mark as verified

  -- Update invite
  UPDATE fk_invites
  SET
    status = 'accepted',
    accepted_at = NOW(),
    verified_by_name = p_name,
    verified_by_phone = p_phone,
    verified_at = NOW()
  WHERE id = v_invite.id;

  -- Update loan
  UPDATE fk_loans
  SET
    verification_status = 'verified',
    verified_at = NOW()
  WHERE id = v_loan.id;

  -- Return success with loan details
  RETURN QUERY SELECT
    true,
    v_loan.loan_type,
    v_loan.principal_amount,
    v_loan.loan_date,
    v_creator_name,
    NOW(),
    NULL::TEXT;
END;
$$;

-- ============================================
-- Function: Get loan verification status
-- ============================================

CREATE OR REPLACE FUNCTION get_loan_verification_details(p_loan_id UUID)
RETURNS TABLE (
  verification_status TEXT,
  verification_code TEXT,
  code_expires_at TIMESTAMPTZ,
  verified_by_name TEXT,
  verified_by_phone TEXT,
  verified_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    l.verification_status,
    i.invite_code,
    i.expires_at,
    i.verified_by_name,
    i.verified_by_phone,
    i.verified_at
  FROM fk_loans l
  LEFT JOIN fk_invites i ON i.loan_id = l.id
    AND i.invite_type = 'loan_verification'
    AND (i.status = 'pending' OR i.status = 'accepted')
  WHERE l.id = p_loan_id
  ORDER BY i.created_at DESC
  LIMIT 1;
$$;

-- ============================================
-- Grant permissions
-- ============================================

GRANT EXECUTE ON FUNCTION create_loan_verification(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_loan_by_code(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_loan_verification_details(UUID) TO authenticated;
