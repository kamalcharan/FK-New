  -- supabase/migrations/010_workspace_members_management.sql
  -- Add functions to get workspace members with details and remove members

  -- ============================================
  -- FUNCTION: Get workspace members with full details
  -- ============================================

  CREATE OR REPLACE FUNCTION get_workspace_members_with_details(p_workspace_id UUID)
  RETURNS TABLE (
    member_id UUID,
    user_id UUID,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    role TEXT,
    relationship_code TEXT,
    relationship_label TEXT,
    relationship_icon TEXT,
    invited_by_id UUID,
    invited_by_name TEXT,
    joined_at TIMESTAMPTZ,
    is_owner BOOLEAN
  )
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  AS $$
    SELECT
      wm.id as member_id,
      wm.user_id,
      COALESCE(up.full_name, u.email, 'Unknown') as full_name,
      u.email,
      u.phone,
      wm.role,
      wm.relationship_code,
      r.label as relationship_label,
      r.icon as relationship_icon,
      wm.invited_by as invited_by_id,
      COALESCE(inviter_profile.full_name, inviter.email, 'Family') as invited_by_name,
      wm.joined_at,
      (w.owner_id = wm.user_id) as is_owner
    FROM fk_workspace_members wm
    INNER JOIN fk_workspaces w ON w.id = wm.workspace_id
    INNER JOIN fk_users u ON u.id = wm.user_id
    LEFT JOIN fk_user_profiles up ON up.user_id = wm.user_id
    LEFT JOIN m_relationships r ON r.code = wm.relationship_code
    LEFT JOIN fk_users inviter ON inviter.id = wm.invited_by
    LEFT JOIN fk_user_profiles inviter_profile ON inviter_profile.user_id = wm.invited_by
    WHERE wm.workspace_id = p_workspace_id
      AND wm.is_active = true
    ORDER BY
      (w.owner_id = wm.user_id) DESC,  -- Owner first
      wm.joined_at ASC;
  $$;

  -- ============================================
  -- FUNCTION: Remove workspace member
  -- ============================================

  CREATE OR REPLACE FUNCTION remove_workspace_member(
    p_workspace_id UUID,
    p_member_user_id UUID,
    p_requesting_user_id UUID
  )
  RETURNS TABLE (
    success BOOLEAN,
    error_message TEXT
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
    v_workspace_owner_id UUID;
    v_requester_role TEXT;
  BEGIN
    -- Get workspace owner
    SELECT owner_id INTO v_workspace_owner_id
    FROM fk_workspaces
    WHERE id = p_workspace_id;

    IF v_workspace_owner_id IS NULL THEN
      RETURN QUERY SELECT false, 'Workspace not found'::TEXT;
      RETURN;
    END IF;

    -- Owner cannot be removed
    IF p_member_user_id = v_workspace_owner_id THEN
      RETURN QUERY SELECT false, 'Cannot remove the workspace owner'::TEXT;
      RETURN;
    END IF;

    -- Check if requester is owner or admin
    SELECT role INTO v_requester_role
    FROM fk_workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = p_requesting_user_id
      AND is_active = true;

    -- Only owner can remove members (or user can remove themselves)
    IF p_requesting_user_id != v_workspace_owner_id AND p_requesting_user_id != p_member_user_id THEN
      RETURN QUERY SELECT false, 'Only the workspace owner can remove members'::TEXT;
      RETURN;
    END IF;

    -- Soft delete: set is_active = false
    UPDATE fk_workspace_members
    SET is_active = false
    WHERE workspace_id = p_workspace_id
      AND user_id = p_member_user_id;

    IF NOT FOUND THEN
      RETURN QUERY SELECT false, 'Member not found'::TEXT;
      RETURN;
    END IF;

    RETURN QUERY SELECT true, NULL::TEXT;
  END;
  $$;

  -- ============================================
  -- FUNCTION: Cancel/revoke pending invite
  -- ============================================

  CREATE OR REPLACE FUNCTION revoke_invite(
    p_invite_id UUID,
    p_requesting_user_id UUID
  )
  RETURNS TABLE (
    success BOOLEAN,
    error_message TEXT
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
    v_invite RECORD;
    v_workspace_owner_id UUID;
  BEGIN
    -- Get invite details
    SELECT i.*, w.owner_id as workspace_owner_id
    INTO v_invite
    FROM fk_invites i
    INNER JOIN fk_workspaces w ON w.id = i.workspace_id
    WHERE i.id = p_invite_id;

    IF v_invite IS NULL THEN
      RETURN QUERY SELECT false, 'Invite not found'::TEXT;
      RETURN;
    END IF;

    -- Only owner or the person who invited can revoke
    IF p_requesting_user_id != v_invite.workspace_owner_id
      AND p_requesting_user_id != v_invite.invited_by THEN
      RETURN QUERY SELECT false, 'Not authorized to revoke this invite'::TEXT;
      RETURN;
    END IF;

    -- Can only revoke pending/sent invites
    IF v_invite.status NOT IN ('pending', 'sent', 'opened') THEN
      RETURN QUERY SELECT false, 'Can only revoke pending invites'::TEXT;
      RETURN;
    END IF;

    -- Update invite status
    UPDATE fk_invites
    SET status = 'revoked'
    WHERE id = p_invite_id;

    RETURN QUERY SELECT true, NULL::TEXT;
  END;
  $$;

  -- ============================================
  -- Grant permissions
  -- ============================================

  GRANT EXECUTE ON FUNCTION get_workspace_members_with_details(UUID) TO authenticated;
  GRANT EXECUTE ON FUNCTION remove_workspace_member(UUID, UUID, UUID) TO authenticated;
  GRANT EXECUTE ON FUNCTION revoke_invite(UUID, UUID) TO authenticated;
