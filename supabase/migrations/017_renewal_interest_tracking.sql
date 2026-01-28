-- Migration: 017_renewal_interest_tracking.sql
-- Description: Track user interest in presets for smart suggestions
-- Date: January 2026

-- ============================================
-- 1. RENEWAL INTEREST TRACKING TABLE
-- ============================================

CREATE TABLE fk_renewal_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who showed interest
  workspace_id UUID NOT NULL REFERENCES fk_workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES fk_users(id),

  -- What they showed interest in
  preset_code VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,

  -- How they interacted
  interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('search', 'view', 'bundle_view', 'suggestion_view')),

  -- Did they convert?
  converted BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMPTZ,

  -- Metadata
  source_bundle_code VARCHAR(50),  -- If they came from a bundle

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for quick lookups
CREATE INDEX idx_fk_renewal_interests_workspace ON fk_renewal_interests(workspace_id);
CREATE INDEX idx_fk_renewal_interests_user ON fk_renewal_interests(user_id);
CREATE INDEX idx_fk_renewal_interests_preset ON fk_renewal_interests(preset_code);
CREATE INDEX idx_fk_renewal_interests_category ON fk_renewal_interests(category);
CREATE INDEX idx_fk_renewal_interests_not_converted ON fk_renewal_interests(workspace_id, converted) WHERE converted = FALSE;

-- ============================================
-- 2. RLS POLICIES
-- ============================================

ALTER TABLE fk_renewal_interests ENABLE ROW LEVEL SECURITY;

-- Users can view their workspace's interests
CREATE POLICY "Members can view interests" ON fk_renewal_interests
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM fk_workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Users can create interests for their workspace
CREATE POLICY "Members can create interests" ON fk_renewal_interests
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM fk_workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Users can update interests (mark as converted)
CREATE POLICY "Members can update interests" ON fk_renewal_interests
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM fk_workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ============================================
-- 3. HELPER FUNCTION: Get unconverted interests
-- ============================================

CREATE OR REPLACE FUNCTION get_unconverted_interests(p_workspace_id UUID)
RETURNS TABLE (
  preset_code VARCHAR(50),
  category VARCHAR(50),
  interaction_count BIGINT,
  last_interaction TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ri.preset_code,
    ri.category,
    COUNT(*) as interaction_count,
    MAX(ri.created_at) as last_interaction
  FROM fk_renewal_interests ri
  WHERE ri.workspace_id = p_workspace_id
    AND ri.converted = FALSE
  GROUP BY ri.preset_code, ri.category
  ORDER BY interaction_count DESC, last_interaction DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. HELPER FUNCTION: Mark interest as converted
-- ============================================

CREATE OR REPLACE FUNCTION mark_interest_converted(
  p_workspace_id UUID,
  p_preset_code VARCHAR(50)
)
RETURNS VOID AS $$
BEGIN
  UPDATE fk_renewal_interests
  SET converted = TRUE, converted_at = NOW()
  WHERE workspace_id = p_workspace_id
    AND preset_code = p_preset_code
    AND converted = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
