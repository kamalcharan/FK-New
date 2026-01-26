-- supabase/migrations/005_fix_workspace_recursion.sql
-- Fix infinite recursion in fk_workspace_members RLS policies

-- ============================================
-- FIX 1: Make add_owner_as_member SECURITY DEFINER
-- ============================================

-- The trigger function needs SECURITY DEFINER to bypass RLS
-- when automatically adding the owner as a workspace member
CREATE OR REPLACE FUNCTION add_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO fk_workspace_members (workspace_id, user_id, role, joined_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FIX 2: Add INSERT policy for fk_workspace_members
-- ============================================

-- Allow workspace owners to add members
DROP POLICY IF EXISTS "Owners can add members" ON fk_workspace_members;
CREATE POLICY "Owners can add members" ON fk_workspace_members
  FOR INSERT WITH CHECK (
    -- User is the owner of the workspace
    workspace_id IN (
      SELECT id FROM fk_workspaces WHERE owner_id = auth.uid()
    )
    -- Or user is adding themselves (for invite flow)
    OR user_id = auth.uid()
  );

-- Allow admins to add members
DROP POLICY IF EXISTS "Admins can add members" ON fk_workspace_members;
CREATE POLICY "Admins can add members" ON fk_workspace_members
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM fk_workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND is_active = true
    )
  );

-- ============================================
-- FIX 3: Simplify SELECT policy to avoid self-reference
-- ============================================

-- Drop the problematic SELECT policy
DROP POLICY IF EXISTS "Members can view workspace members" ON fk_workspace_members;

-- Create a simpler policy that uses fk_workspaces instead
CREATE POLICY "Members can view workspace members" ON fk_workspace_members
  FOR SELECT USING (
    -- User is a member of this workspace (direct check, not subquery on same table)
    user_id = auth.uid()
    OR
    -- User owns the workspace
    workspace_id IN (SELECT id FROM fk_workspaces WHERE owner_id = auth.uid())
    OR
    -- User is in the same workspace (using EXISTS to avoid recursion)
    EXISTS (
      SELECT 1 FROM fk_workspace_members wm
      WHERE wm.workspace_id = fk_workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.is_active = true
    )
  );

-- ============================================
-- FIX 4: Add UPDATE and DELETE policies
-- ============================================

DROP POLICY IF EXISTS "Owners can update members" ON fk_workspace_members;
CREATE POLICY "Owners can update members" ON fk_workspace_members
  FOR UPDATE USING (
    workspace_id IN (
      SELECT id FROM fk_workspaces WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can remove members" ON fk_workspace_members;
CREATE POLICY "Owners can remove members" ON fk_workspace_members
  FOR DELETE USING (
    workspace_id IN (
      SELECT id FROM fk_workspaces WHERE owner_id = auth.uid()
    )
    -- Members can remove themselves
    OR user_id = auth.uid()
  );
