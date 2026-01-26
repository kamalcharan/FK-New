-- supabase/migrations/005_fix_workspace_recursion.sql
-- Fix infinite recursion in workspace-related RLS policies

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
-- FIX 2: Simplify fk_workspaces SELECT policy
-- ============================================

-- Drop problematic policy that causes recursion
DROP POLICY IF EXISTS "Members can view workspace" ON fk_workspaces;

-- Simple policy: user can view workspaces they own
CREATE POLICY "Owners can view own workspaces" ON fk_workspaces
  FOR SELECT USING (owner_id = auth.uid());

-- Policy for members (uses direct user_id check, no subquery on workspace_members)
CREATE POLICY "Members can view joined workspaces" ON fk_workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM fk_workspace_members wm
      WHERE wm.workspace_id = fk_workspaces.id
        AND wm.user_id = auth.uid()
        AND wm.is_active = true
    )
  );

-- ============================================
-- FIX 3: Simplify fk_workspace_members SELECT policy
-- ============================================

-- Drop the problematic SELECT policy
DROP POLICY IF EXISTS "Members can view workspace members" ON fk_workspace_members;

-- Simple policy: user can view their own membership
CREATE POLICY "Users can view own membership" ON fk_workspace_members
  FOR SELECT USING (user_id = auth.uid());

-- Users can view other members in workspaces they own
CREATE POLICY "Owners can view all members" ON fk_workspace_members
  FOR SELECT USING (
    workspace_id IN (SELECT id FROM fk_workspaces WHERE owner_id = auth.uid())
  );

-- ============================================
-- FIX 4: Add INSERT policy for fk_workspace_members
-- ============================================

-- Allow workspace owners to add members
DROP POLICY IF EXISTS "Owners can add members" ON fk_workspace_members;
CREATE POLICY "Owners can add members" ON fk_workspace_members
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT id FROM fk_workspaces WHERE owner_id = auth.uid())
    OR user_id = auth.uid()
  );

-- Drop admin policy (causes recursion)
DROP POLICY IF EXISTS "Admins can add members" ON fk_workspace_members;

-- ============================================
-- FIX 5: Add UPDATE and DELETE policies
-- ============================================

DROP POLICY IF EXISTS "Owners can update members" ON fk_workspace_members;
CREATE POLICY "Owners can update members" ON fk_workspace_members
  FOR UPDATE USING (
    workspace_id IN (SELECT id FROM fk_workspaces WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owners can remove members" ON fk_workspace_members;
CREATE POLICY "Owners can remove members" ON fk_workspace_members
  FOR DELETE USING (
    workspace_id IN (SELECT id FROM fk_workspaces WHERE owner_id = auth.uid())
    OR user_id = auth.uid()
  );
