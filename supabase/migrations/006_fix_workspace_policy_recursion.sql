-- supabase/migrations/006_fix_workspace_policy_recursion.sql
-- Fix circular RLS policy recursion between fk_workspaces and fk_workspace_members
-- Solution: Use SECURITY DEFINER helper functions that bypass RLS

-- ============================================
-- HELPER FUNCTION 1: Check if user is workspace member
-- ============================================
-- This function runs with elevated privileges (bypasses RLS)
-- to avoid circular policy evaluation

CREATE OR REPLACE FUNCTION is_workspace_member(ws_id UUID, usr_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM fk_workspace_members
    WHERE workspace_id = ws_id
      AND user_id = usr_id
      AND is_active = true
  );
$$;

-- ============================================
-- HELPER FUNCTION 2: Check if user owns workspace
-- ============================================

CREATE OR REPLACE FUNCTION is_workspace_owner(ws_id UUID, usr_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM fk_workspaces
    WHERE id = ws_id
      AND owner_id = usr_id
  );
$$;

-- ============================================
-- HELPER FUNCTION 3: Get user's workspace IDs
-- ============================================

CREATE OR REPLACE FUNCTION get_user_workspace_ids(usr_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT workspace_id FROM fk_workspace_members
  WHERE user_id = usr_id
    AND is_active = true;
$$;

-- ============================================
-- DROP ALL EXISTING POLICIES (clean slate)
-- ============================================

-- fk_workspaces policies
DROP POLICY IF EXISTS "Owners can view own workspaces" ON fk_workspaces;
DROP POLICY IF EXISTS "Members can view joined workspaces" ON fk_workspaces;
DROP POLICY IF EXISTS "Members can view workspace" ON fk_workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON fk_workspaces;
DROP POLICY IF EXISTS "Owners can update workspace" ON fk_workspaces;
DROP POLICY IF EXISTS "Owners can delete workspace" ON fk_workspaces;

-- fk_workspace_members policies
DROP POLICY IF EXISTS "Users can view own membership" ON fk_workspace_members;
DROP POLICY IF EXISTS "Owners can view all members" ON fk_workspace_members;
DROP POLICY IF EXISTS "Members can view workspace members" ON fk_workspace_members;
DROP POLICY IF EXISTS "Owners can add members" ON fk_workspace_members;
DROP POLICY IF EXISTS "Admins can add members" ON fk_workspace_members;
DROP POLICY IF EXISTS "Owners can update members" ON fk_workspace_members;
DROP POLICY IF EXISTS "Owners can remove members" ON fk_workspace_members;

-- ============================================
-- NEW POLICIES: fk_workspaces (non-recursive)
-- ============================================

-- SELECT: Users can view workspaces they own OR are members of
CREATE POLICY "workspace_select_policy" ON fk_workspaces
  FOR SELECT USING (
    owner_id = auth.uid()
    OR is_workspace_member(id, auth.uid())
  );

-- INSERT: Any authenticated user can create a workspace
CREATE POLICY "workspace_insert_policy" ON fk_workspaces
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND owner_id = auth.uid()
  );

-- UPDATE: Only owners can update their workspace
CREATE POLICY "workspace_update_policy" ON fk_workspaces
  FOR UPDATE USING (owner_id = auth.uid());

-- DELETE: Only owners can delete their workspace
CREATE POLICY "workspace_delete_policy" ON fk_workspaces
  FOR DELETE USING (owner_id = auth.uid());

-- ============================================
-- NEW POLICIES: fk_workspace_members (non-recursive)
-- ============================================

-- SELECT: Users can see their own membership OR memberships in workspaces they own
CREATE POLICY "member_select_policy" ON fk_workspace_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR is_workspace_owner(workspace_id, auth.uid())
  );

-- INSERT: Workspace owners can add members, or user can add themselves (for joining)
CREATE POLICY "member_insert_policy" ON fk_workspace_members
  FOR INSERT WITH CHECK (
    is_workspace_owner(workspace_id, auth.uid())
    OR user_id = auth.uid()
  );

-- UPDATE: Only workspace owners can update member records
CREATE POLICY "member_update_policy" ON fk_workspace_members
  FOR UPDATE USING (
    is_workspace_owner(workspace_id, auth.uid())
  );

-- DELETE: Workspace owners can remove members, users can remove themselves
CREATE POLICY "member_delete_policy" ON fk_workspace_members
  FOR DELETE USING (
    is_workspace_owner(workspace_id, auth.uid())
    OR user_id = auth.uid()
  );

-- ============================================
-- Grant execute on helper functions to authenticated users
-- ============================================

GRANT EXECUTE ON FUNCTION is_workspace_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_workspace_owner(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_workspace_ids(UUID) TO authenticated;
