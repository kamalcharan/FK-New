-- supabase/migrations/008_verify_invite_function.sql
-- Add function to verify invite code without accepting it

-- ============================================
-- FUNCTION: Verify invite code (read-only check)
-- ============================================
-- This function checks if an invite code is valid without accepting it
-- Used for the verify-invite screen before signup

CREATE OR REPLACE FUNCTION verify_invite_code(p_invite_code TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  workspace_id UUID,
  workspace_name TEXT,
  inviter_id UUID,
  inviter_name TEXT,
  relationship_code TEXT,
  relationship_label TEXT,
  relationship_icon TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite RECORD;
  v_workspace RECORD;
  v_inviter_name TEXT;
  v_relationship RECORD;
BEGIN
  -- Find the invite
  SELECT * INTO v_invite
  FROM fk_invites
  WHERE invite_code = UPPER(p_invite_code)
    AND invite_type = 'workspace';

  -- Check if invite exists
  IF v_invite IS NULL THEN
    RETURN QUERY SELECT
      false, NULL::UUID, NULL::TEXT, NULL::UUID, NULL::TEXT,
      NULL::TEXT, NULL::TEXT, NULL::TEXT, 'Invalid invite code'::TEXT;
    RETURN;
  END IF;

  -- Check if invite is expired
  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < NOW() THEN
    RETURN QUERY SELECT
      false, NULL::UUID, NULL::TEXT, NULL::UUID, NULL::TEXT,
      NULL::TEXT, NULL::TEXT, NULL::TEXT, 'This invite code has expired'::TEXT;
    RETURN;
  END IF;

  -- Check if invite is already accepted
  IF v_invite.status = 'accepted' THEN
    RETURN QUERY SELECT
      false, NULL::UUID, NULL::TEXT, NULL::UUID, NULL::TEXT,
      NULL::TEXT, NULL::TEXT, NULL::TEXT, 'This invite has already been used'::TEXT;
    RETURN;
  END IF;

  -- Get workspace details
  SELECT * INTO v_workspace
  FROM fk_workspaces
  WHERE id = v_invite.workspace_id;

  -- Get inviter name
  SELECT COALESCE(fp.full_name, fu.email, 'Someone') INTO v_inviter_name
  FROM fk_users fu
  LEFT JOIN fk_user_profiles fp ON fp.user_id = fu.id
  WHERE fu.id = v_invite.invited_by;

  -- Get relationship details
  SELECT * INTO v_relationship
  FROM m_relationships
  WHERE code = v_invite.relationship_code;

  -- Return valid invite details
  RETURN QUERY SELECT
    true,
    v_workspace.id,
    v_workspace.name,
    v_invite.invited_by,
    v_inviter_name,
    v_invite.relationship_code,
    COALESCE(v_relationship.label, 'Family Member'),
    COALESCE(v_relationship.icon, '👤'),
    NULL::TEXT;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION verify_invite_code(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION verify_invite_code(TEXT) TO authenticated;
