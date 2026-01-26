-- supabase/migrations/009_fix_accept_invite_ambiguity.sql
-- Fix ambiguous column reference in accept_family_invite function

CREATE OR REPLACE FUNCTION accept_family_invite(
  p_invite_code TEXT,
  p_user_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  workspace_id UUID,
  workspace_name TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite RECORD;
  v_workspace_name TEXT;
BEGIN
  -- Find the invite
  SELECT * INTO v_invite
  FROM fk_invites fi
  WHERE fi.invite_code = UPPER(p_invite_code)
    AND fi.status IN ('pending', 'sent', 'opened')
    AND (fi.expires_at IS NULL OR fi.expires_at > NOW());

  IF v_invite IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'Invalid or expired invite code'::TEXT;
    RETURN;
  END IF;

  -- Check if user is already a member (FIX: qualify column names with table alias)
  IF EXISTS (
    SELECT 1 FROM fk_workspace_members wm
    WHERE wm.workspace_id = v_invite.workspace_id
      AND wm.user_id = p_user_id
  ) THEN
    SELECT w.name INTO v_workspace_name FROM fk_workspaces w WHERE w.id = v_invite.workspace_id;
    RETURN QUERY SELECT true, v_invite.workspace_id, v_workspace_name, 'Already a member'::TEXT;
    RETURN;
  END IF;

  -- Add user to workspace
  INSERT INTO fk_workspace_members (
    workspace_id,
    user_id,
    role,
    relationship_code,
    invited_by,
    joined_at
  ) VALUES (
    v_invite.workspace_id,
    p_user_id,
    'member',
    v_invite.relationship_code,
    v_invite.invited_by,
    NOW()
  );

  -- Update invite status
  UPDATE fk_invites fi
  SET status = 'accepted', accepted_at = NOW()
  WHERE fi.id = v_invite.id;

  -- Get workspace name for response
  SELECT w.name INTO v_workspace_name FROM fk_workspaces w WHERE w.id = v_invite.workspace_id;

  RETURN QUERY SELECT true, v_invite.workspace_id, v_workspace_name, NULL::TEXT;
END;
$$;

-- Re-grant execute permission
GRANT EXECUTE ON FUNCTION accept_family_invite(TEXT, UUID) TO authenticated;
