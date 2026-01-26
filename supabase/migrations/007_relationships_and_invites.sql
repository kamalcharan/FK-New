-- supabase/migrations/007_relationships_and_invites.sql
-- Add relationships master table and update fk_invites for family invite feature

-- ============================================
-- MASTER TABLE: Family Relationships
-- ============================================

CREATE TABLE m_relationships (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  label_hindi TEXT,
  icon TEXT NOT NULL,              -- Emoji or icon name
  display_order INTEGER DEFAULT 100,
  is_constellation BOOLEAN DEFAULT false,  -- Show in main constellation view
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert relationships (constellation = top 6, rest in +More)
INSERT INTO m_relationships (code, label, label_hindi, icon, display_order, is_constellation) VALUES
  -- Constellation relationships (most common)
  ('mom', 'Mom', 'माँ', '👩', 1, true),
  ('dad', 'Dad', 'पापा', '👨', 2, true),
  ('spouse', 'Spouse', 'पति/पत्नी', '💑', 3, true),
  ('sibling', 'Sibling', 'भाई/बहन', '👫', 4, true),
  ('child', 'Child', 'बच्चा', '👶', 5, true),
  ('other', 'Other', 'अन्य', '➕', 6, true),

  -- Extended relationships (+More section)
  ('grandpa', 'Grandpa', 'दादा/नाना', '👴', 10, false),
  ('grandma', 'Grandma', 'दादी/नानी', '👵', 11, false),
  ('uncle', 'Uncle', 'चाचा/मामा', '👨‍🦳', 12, false),
  ('aunt', 'Aunt', 'चाची/मामी', '👩‍🦳', 13, false),
  ('cousin', 'Cousin', 'भतीजा/भतीजी', '🧑‍🤝‍🧑', 14, false),
  ('in_law', 'In-Law', 'ससुराल', '👨‍👩‍👧', 15, false),
  ('friend', 'Trusted Friend', 'मित्र', '🤝', 16, false);

-- ============================================
-- UPDATE fk_invites: Add relationship_type
-- ============================================

-- Add relationship column to fk_invites
ALTER TABLE fk_invites
  ADD COLUMN relationship_code TEXT REFERENCES m_relationships(code),
  ADD COLUMN invitee_name TEXT,
  ADD COLUMN message_content TEXT;

-- Add index for faster lookups
CREATE INDEX idx_fk_invites_workspace ON fk_invites(workspace_id);
CREATE INDEX idx_fk_invites_status ON fk_invites(status);
CREATE INDEX idx_fk_invites_code ON fk_invites(invite_code);

-- ============================================
-- UPDATE fk_workspace_members: Add relationship
-- ============================================

-- When invite is accepted, we store the relationship in workspace_members
ALTER TABLE fk_workspace_members
  ADD COLUMN relationship_code TEXT REFERENCES m_relationships(code),
  ADD COLUMN invited_by UUID REFERENCES fk_users(id);

-- ============================================
-- FUNCTION: Generate unique invite code
-- ============================================

CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- No I, O, 0, 1 to avoid confusion
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- ============================================
-- FUNCTION: Create family invite
-- ============================================

CREATE OR REPLACE FUNCTION create_family_invite(
  p_workspace_id UUID,
  p_invited_by UUID,
  p_relationship_code TEXT,
  p_invitee_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  invite_id UUID,
  invite_code TEXT,
  invite_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite_id UUID;
  v_invite_code TEXT;
  v_workspace_name TEXT;
  v_inviter_name TEXT;
  v_relationship_label TEXT;
  v_message TEXT;
BEGIN
  -- Generate unique invite code
  LOOP
    v_invite_code := generate_invite_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM fk_invites WHERE fk_invites.invite_code = v_invite_code);
  END LOOP;

  -- Get workspace name
  SELECT name INTO v_workspace_name FROM fk_workspaces WHERE id = p_workspace_id;

  -- Get inviter name
  SELECT COALESCE(fp.full_name, fu.email, 'Someone') INTO v_inviter_name
  FROM fk_users fu
  LEFT JOIN fk_user_profiles fp ON fp.user_id = fu.id
  WHERE fu.id = p_invited_by;

  -- Get relationship label
  SELECT label INTO v_relationship_label FROM m_relationships WHERE code = p_relationship_code;

  -- Create invite message
  v_message := format(
    E'Hey! 👋\n\n%s has invited you to join *%s* on FamilyKnows as their *%s*.\n\nFamilyKnows helps families keep track of loans, insurance policies, and important renewals - all in one secure place.\n\n🔐 Your invite code: *%s*\n\nDownload the app and enter this code to join:\n[App Link]\n\nThis invite expires in 7 days.',
    v_inviter_name,
    v_workspace_name,
    COALESCE(v_relationship_label, 'Family Member'),
    v_invite_code
  );

  -- Insert invite record
  INSERT INTO fk_invites (
    workspace_id,
    invited_by,
    invite_type,
    relationship_code,
    invitee_name,
    phone,
    email,
    invite_code,
    message_content,
    status,
    sent_at,
    expires_at
  ) VALUES (
    p_workspace_id,
    p_invited_by,
    'workspace',
    p_relationship_code,
    p_invitee_name,
    p_phone,
    p_email,
    v_invite_code,
    v_message,
    'sent',
    NOW(),
    NOW() + INTERVAL '7 days'
  )
  RETURNING id INTO v_invite_id;

  RETURN QUERY SELECT v_invite_id, v_invite_code, v_message;
END;
$$;

-- ============================================
-- FUNCTION: Accept invite and join workspace
-- ============================================

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
  FROM fk_invites
  WHERE invite_code = UPPER(p_invite_code)
    AND status IN ('pending', 'sent', 'opened')
    AND (expires_at IS NULL OR expires_at > NOW());

  IF v_invite IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'Invalid or expired invite code';
    RETURN;
  END IF;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM fk_workspace_members
    WHERE workspace_id = v_invite.workspace_id AND user_id = p_user_id
  ) THEN
    SELECT name INTO v_workspace_name FROM fk_workspaces WHERE id = v_invite.workspace_id;
    RETURN QUERY SELECT true, v_invite.workspace_id, v_workspace_name, 'Already a member';
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
  UPDATE fk_invites
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = v_invite.id;

  -- Get workspace name for response
  SELECT name INTO v_workspace_name FROM fk_workspaces WHERE id = v_invite.workspace_id;

  RETURN QUERY SELECT true, v_invite.workspace_id, v_workspace_name, NULL::TEXT;
END;
$$;

-- ============================================
-- FUNCTION: Get pending invites for workspace
-- ============================================

CREATE OR REPLACE FUNCTION get_workspace_invites(p_workspace_id UUID)
RETURNS TABLE (
  id UUID,
  invitee_name TEXT,
  relationship_code TEXT,
  relationship_label TEXT,
  relationship_icon TEXT,
  status TEXT,
  invite_code TEXT,
  sent_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    i.id,
    i.invitee_name,
    i.relationship_code,
    r.label as relationship_label,
    r.icon as relationship_icon,
    i.status,
    i.invite_code,
    i.sent_at,
    i.expires_at
  FROM fk_invites i
  LEFT JOIN m_relationships r ON r.code = i.relationship_code
  WHERE i.workspace_id = p_workspace_id
    AND i.invite_type = 'workspace'
  ORDER BY i.created_at DESC;
$$;

-- ============================================
-- RLS Policies for m_relationships
-- ============================================

ALTER TABLE m_relationships ENABLE ROW LEVEL SECURITY;

-- Everyone can read relationships
CREATE POLICY "Anyone can view relationships" ON m_relationships
  FOR SELECT USING (true);

-- ============================================
-- Grant permissions
-- ============================================

GRANT EXECUTE ON FUNCTION generate_invite_code() TO authenticated;
GRANT EXECUTE ON FUNCTION create_family_invite(UUID, UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_family_invite(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_invites(UUID) TO authenticated;
