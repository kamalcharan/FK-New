-- Migration: 015_insurance_schema_update.sql
-- Description: Add insurance subtypes, covered members, and enhance policies table
-- Date: 2025-01-28

-- ============================================
-- 1. ADD TRAVEL INSURANCE TYPE
-- ============================================
INSERT INTO m_insurance_types (code, name, icon, sort_order) VALUES
  ('travel', 'Travel Insurance', '✈️', 5)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 2. CREATE INSURANCE SUBTYPES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS m_insurance_subtypes (
  code TEXT PRIMARY KEY,
  type_code TEXT NOT NULL REFERENCES m_insurance_types(code),
  name TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Health Insurance Subtypes
INSERT INTO m_insurance_subtypes (code, type_code, name, icon, description, sort_order) VALUES
  ('health_individual', 'health', 'Individual', '👤', 'Single person coverage', 1),
  ('health_family_floater', 'health', 'Family Floater', '👨‍👩‍👧', 'Entire family, shared sum insured', 2),
  ('health_senior', 'health', 'Senior Citizen', '👴', 'For parents/elderly (60+)', 3),
  ('health_critical', 'health', 'Critical Illness', '🏥', 'Lump sum on diagnosis', 4),
  ('health_accident', 'health', 'Personal Accident', '⚡', 'Accidental death/disability', 5),
  ('health_topup', 'health', 'Top-Up / Super Top-Up', '📈', 'Additional cover above base policy', 6),
  ('health_group', 'health', 'Group/Corporate', '🏢', 'Employer provided coverage', 7)
ON CONFLICT (code) DO NOTHING;

-- Vehicle Insurance Subtypes
INSERT INTO m_insurance_subtypes (code, type_code, name, icon, description, sort_order) VALUES
  ('vehicle_car_comp', 'vehicle', 'Car - Comprehensive', '🚗', 'Full coverage including own damage', 1),
  ('vehicle_car_tp', 'vehicle', 'Car - Third Party', '🚙', 'Mandatory third party only', 2),
  ('vehicle_two_comp', 'vehicle', 'Two Wheeler - Comprehensive', '🏍️', 'Bike/Scooter full coverage', 3),
  ('vehicle_two_tp', 'vehicle', 'Two Wheeler - Third Party', '🛵', 'Mandatory third party only', 4),
  ('vehicle_commercial', 'vehicle', 'Commercial Vehicle', '🚛', 'Trucks, autos, taxis', 5)
ON CONFLICT (code) DO NOTHING;

-- Life Insurance Subtypes
INSERT INTO m_insurance_subtypes (code, type_code, name, icon, description, sort_order) VALUES
  ('life_term', 'life', 'Term Plan', '🛡️', 'Pure protection, no maturity benefit', 1),
  ('life_endowment', 'life', 'Endowment', '💰', 'Protection + savings (LIC-style)', 2),
  ('life_ulip', 'life', 'ULIP', '📊', 'Unit Linked - market-linked returns', 3),
  ('life_moneyback', 'life', 'Money Back', '💵', 'Periodic payouts during term', 4),
  ('life_whole', 'life', 'Whole Life', '♾️', 'Coverage till age 99/100', 5),
  ('life_child', 'life', 'Child Plan', '👶', 'For children education/marriage', 6),
  ('life_pension', 'life', 'Pension/Annuity', '🧓', 'Retirement income', 7)
ON CONFLICT (code) DO NOTHING;

-- Property Insurance Subtypes
INSERT INTO m_insurance_subtypes (code, type_code, name, icon, description, sort_order) VALUES
  ('property_home_structure', 'property', 'Home Structure', '🏠', 'Building coverage', 1),
  ('property_home_contents', 'property', 'Home Contents', '🛋️', 'Furniture, electronics, valuables', 2),
  ('property_fire', 'property', 'Fire Insurance', '🔥', 'Fire and allied perils', 3),
  ('property_burglary', 'property', 'Burglary', '🔒', 'Theft coverage', 4),
  ('property_shop', 'property', 'Shop/Office', '🏪', 'Commercial property', 5)
ON CONFLICT (code) DO NOTHING;

-- Travel Insurance Subtypes
INSERT INTO m_insurance_subtypes (code, type_code, name, icon, description, sort_order) VALUES
  ('travel_domestic', 'travel', 'Domestic', '🇮🇳', 'Within India travel', 1),
  ('travel_international', 'travel', 'International', '🌍', 'Overseas travel', 2),
  ('travel_student', 'travel', 'Student', '🎓', 'Study abroad coverage', 3),
  ('travel_corporate', 'travel', 'Business', '💼', 'Corporate/business travel', 4)
ON CONFLICT (code) DO NOTHING;

-- Other Insurance Subtypes
INSERT INTO m_insurance_subtypes (code, type_code, name, icon, description, sort_order) VALUES
  ('other_cyber', 'other', 'Cyber Insurance', '🔐', 'Online fraud protection', 1),
  ('other_gadget', 'other', 'Mobile/Gadget', '📱', 'Phone, laptop coverage', 2),
  ('other_pet', 'other', 'Pet Insurance', '🐕', 'Veterinary expenses', 3),
  ('other_marine', 'other', 'Marine/Cargo', '🚢', 'Goods in transit', 4)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 3. UPDATE fk_insurance_policies TABLE
-- ============================================

-- Add new columns to fk_insurance_policies
ALTER TABLE fk_insurance_policies
  ADD COLUMN IF NOT EXISTS subtype TEXT REFERENCES m_insurance_subtypes(code),
  ADD COLUMN IF NOT EXISTS scheme_name TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS document_url TEXT,
  ADD COLUMN IF NOT EXISTS tpa_name TEXT,
  ADD COLUMN IF NOT EXISTS tpa_helpline TEXT;

-- Add is_demo column if not exists (might already exist from demo migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fk_insurance_policies' AND column_name = 'is_demo'
  ) THEN
    ALTER TABLE fk_insurance_policies ADD COLUMN is_demo BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Make insured_name nullable (will be replaced by covered_members)
ALTER TABLE fk_insurance_policies
  ALTER COLUMN insured_name DROP NOT NULL;

-- ============================================
-- 4. CREATE POLICY COVERED MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS fk_policy_covered_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES fk_insurance_policies(id) ON DELETE CASCADE,

  -- One of these will be set (member, invite, or custom)
  member_id UUID REFERENCES fk_workspace_members(id) ON DELETE SET NULL,
  invite_id UUID REFERENCES fk_invites(id) ON DELETE SET NULL,
  custom_name TEXT,

  -- Member details
  relationship_label TEXT,
  relationship_icon TEXT,
  date_of_birth DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- At least one identifier must be set
  CONSTRAINT covered_member_check CHECK (
    member_id IS NOT NULL OR invite_id IS NOT NULL OR custom_name IS NOT NULL
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_policy_covered_members_policy ON fk_policy_covered_members(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_covered_members_member ON fk_policy_covered_members(member_id);
CREATE INDEX IF NOT EXISTS idx_insurance_subtype ON fk_insurance_policies(subtype);

-- ============================================
-- 5. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE fk_policy_covered_members ENABLE ROW LEVEL SECURITY;

-- View policy: members of the workspace can view
CREATE POLICY "Members can view policy covered members" ON fk_policy_covered_members
  FOR SELECT USING (
    policy_id IN (
      SELECT id FROM fk_insurance_policies
      WHERE workspace_id IN (
        SELECT workspace_id FROM fk_workspace_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- Insert: members with create permission
CREATE POLICY "Members can add policy covered members" ON fk_policy_covered_members
  FOR INSERT WITH CHECK (
    policy_id IN (
      SELECT ip.id FROM fk_insurance_policies ip
      WHERE ip.workspace_id IN (
        SELECT wm.workspace_id FROM fk_workspace_members wm
        JOIN m_roles r ON wm.role = r.code
        WHERE wm.user_id = auth.uid()
          AND wm.is_active = true
          AND r.can_create_records = true
      )
    )
  );

-- Delete: members with create permission can remove
CREATE POLICY "Members can remove policy covered members" ON fk_policy_covered_members
  FOR DELETE USING (
    policy_id IN (
      SELECT ip.id FROM fk_insurance_policies ip
      WHERE ip.workspace_id IN (
        SELECT wm.workspace_id FROM fk_workspace_members wm
        JOIN m_roles r ON wm.role = r.code
        WHERE wm.user_id = auth.uid()
          AND wm.is_active = true
          AND r.can_create_records = true
      )
    )
  );

-- ============================================
-- 6. HELPER FUNCTION: Get insurance with covered members
-- ============================================
CREATE OR REPLACE FUNCTION get_insurance_policies_with_members(p_workspace_id UUID)
RETURNS TABLE (
  id UUID,
  workspace_id UUID,
  policy_type TEXT,
  subtype TEXT,
  subtype_name TEXT,
  subtype_icon TEXT,
  policy_number TEXT,
  provider_name TEXT,
  scheme_name TEXT,
  sum_insured DECIMAL,
  premium_amount DECIMAL,
  premium_frequency TEXT,
  start_date DATE,
  expiry_date DATE,
  status TEXT,
  document_url TEXT,
  tpa_name TEXT,
  tpa_helpline TEXT,
  agent_name TEXT,
  agent_phone TEXT,
  notes TEXT,
  metadata JSONB,
  is_demo BOOLEAN,
  created_at TIMESTAMPTZ,
  days_until_expiry INTEGER,
  covered_members JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ip.id,
    ip.workspace_id,
    ip.policy_type,
    ip.subtype,
    COALESCE(ms.name, '') as subtype_name,
    COALESCE(ms.icon, '') as subtype_icon,
    ip.policy_number,
    ip.provider_name,
    ip.scheme_name,
    ip.sum_insured,
    ip.premium_amount,
    ip.premium_frequency,
    ip.start_date,
    ip.expiry_date,
    ip.status,
    ip.document_url,
    ip.tpa_name,
    ip.tpa_helpline,
    ip.agent_name,
    ip.agent_phone,
    ip.notes,
    ip.metadata,
    COALESCE(ip.is_demo, false) as is_demo,
    ip.created_at,
    (ip.expiry_date - CURRENT_DATE)::INTEGER as days_until_expiry,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', pcm.id,
            'member_id', pcm.member_id,
            'invite_id', pcm.invite_id,
            'custom_name', pcm.custom_name,
            'relationship_label', pcm.relationship_label,
            'relationship_icon', pcm.relationship_icon,
            'full_name', COALESCE(
              up.full_name,
              wi.invitee_name,
              pcm.custom_name,
              pcm.relationship_label
            ),
            'is_joined', (pcm.member_id IS NOT NULL),
            'is_pending', (pcm.invite_id IS NOT NULL AND pcm.member_id IS NULL),
            'is_external', (pcm.custom_name IS NOT NULL AND pcm.member_id IS NULL AND pcm.invite_id IS NULL)
          )
        )
        FROM fk_policy_covered_members pcm
        LEFT JOIN fk_workspace_members wm ON pcm.member_id = wm.id
        LEFT JOIN fk_user_profiles up ON wm.user_id = up.user_id
        LEFT JOIN fk_invites wi ON pcm.invite_id = wi.id
        WHERE pcm.policy_id = ip.id
      ),
      '[]'::jsonb
    ) as covered_members
  FROM fk_insurance_policies ip
  LEFT JOIN m_insurance_subtypes ms ON ip.subtype = ms.code
  WHERE ip.workspace_id = p_workspace_id
  ORDER BY ip.expiry_date ASC;
END;
$$;

-- ============================================
-- 7. HELPER FUNCTION: Get insurance types with subtypes
-- ============================================
CREATE OR REPLACE FUNCTION get_insurance_types_with_subtypes()
RETURNS TABLE (
  type_code TEXT,
  type_name TEXT,
  type_icon TEXT,
  subtypes JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mit.code as type_code,
    mit.name as type_name,
    mit.icon as type_icon,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'code', mis.code,
            'name', mis.name,
            'icon', mis.icon,
            'description', mis.description
          ) ORDER BY mis.sort_order
        )
        FROM m_insurance_subtypes mis
        WHERE mis.type_code = mit.code AND mis.is_active = true
      ),
      '[]'::jsonb
    ) as subtypes
  FROM m_insurance_types mit
  WHERE mit.is_active = true
  ORDER BY mit.sort_order;
END;
$$;

-- ============================================
-- 8. UPDATE DEMO MODE FUNCTION (if exists)
-- ============================================
-- Update toggle_demo_mode to include subtypes for demo insurance
CREATE OR REPLACE FUNCTION toggle_demo_mode(
  p_workspace_id UUID,
  p_user_id UUID,
  p_enable BOOLEAN
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_policy_id UUID;
  v_member_id UUID;
BEGIN
  IF p_enable THEN
    -- Get the user's member_id for this workspace
    SELECT id INTO v_member_id
    FROM fk_workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id
    LIMIT 1;

    -- Insert demo loans
    INSERT INTO fk_loans (workspace_id, created_by, loan_type, borrower_lender_name, principal_amount, interest_rate, start_date, due_date, status, is_demo)
    VALUES
      (p_workspace_id, p_user_id, 'given', 'Ravi Kumar', 50000, 0, CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE + INTERVAL '3 months', 'active', true),
      (p_workspace_id, p_user_id, 'given', 'Priya Sharma', 25000, 12, CURRENT_DATE - INTERVAL '1 month', CURRENT_DATE + INTERVAL '5 months', 'active', true),
      (p_workspace_id, p_user_id, 'taken', 'Suresh Uncle', 100000, 0, CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE + INTERVAL '6 months', 'active', true),
      (p_workspace_id, p_user_id, 'taken', 'Amit Patel', 30000, 10, CURRENT_DATE - INTERVAL '2 months', CURRENT_DATE + INTERVAL '4 months', 'partial', true);

    -- Insert demo insurance policies with subtypes
    INSERT INTO fk_insurance_policies (id, workspace_id, created_by, policy_type, subtype, policy_number, provider_name, scheme_name, insured_name, insured_relation, premium_amount, sum_insured, start_date, expiry_date, tpa_name, tpa_helpline, is_demo)
    VALUES
      (gen_random_uuid(), p_workspace_id, p_user_id, 'health', 'health_family_floater', 'HLT-2024-001234', 'HDFC Ergo', 'Optima Secure', 'Family', 'family', 25000, 1000000, CURRENT_DATE - INTERVAL '10 months', CURRENT_DATE + INTERVAL '2 months', 'Medi Assist', '1800-XXX-1234', true),
      (gen_random_uuid(), p_workspace_id, p_user_id, 'health', 'health_senior', 'HLT-2024-005678', 'Star Health', 'Senior Citizens Red Carpet', 'Parents', 'parents', 35000, 500000, CURRENT_DATE - INTERVAL '8 months', CURRENT_DATE + INTERVAL '4 months', 'Star Health TPA', '1800-XXX-5678', true),
      (gen_random_uuid(), p_workspace_id, p_user_id, 'vehicle', 'vehicle_car_comp', 'VEH-2024-009012', 'ICICI Lombard', 'Private Car Package', 'Car - KA01AB1234', 'self', 12000, 800000, CURRENT_DATE - INTERVAL '11 months', CURRENT_DATE + INTERVAL '15 days', NULL, '1800-XXX-9012', true),
      (gen_random_uuid(), p_workspace_id, p_user_id, 'life', 'life_term', 'LIF-2024-003456', 'LIC', 'Tech Term', 'Self', 'self', 18000, 5000000, CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE + INTERVAL '6 months', NULL, NULL, true)
    RETURNING id INTO v_policy_id;

    -- Add covered members for the family floater policy
    IF v_member_id IS NOT NULL THEN
      -- Get the family floater policy id
      SELECT id INTO v_policy_id
      FROM fk_insurance_policies
      WHERE workspace_id = p_workspace_id AND subtype = 'health_family_floater' AND is_demo = true
      LIMIT 1;

      IF v_policy_id IS NOT NULL THEN
        INSERT INTO fk_policy_covered_members (policy_id, member_id, relationship_label, relationship_icon)
        VALUES (v_policy_id, v_member_id, 'Self', '👨');
      END IF;
    END IF;

    -- Insert demo renewals
    INSERT INTO fk_renewals (workspace_id, created_by, renewal_type, title, authority_name, expiry_date, fee_amount, is_demo)
    VALUES
      (p_workspace_id, p_user_id, 'property_tax', 'House Property Tax', 'GHMC', CURRENT_DATE + INTERVAL '45 days', 15000, true),
      (p_workspace_id, p_user_id, 'pollution', 'PUC Certificate', 'RTO', CURRENT_DATE + INTERVAL '20 days', 500, true),
      (p_workspace_id, p_user_id, 'trade_license', 'Shop Trade License', 'Municipal Corp', CURRENT_DATE + INTERVAL '90 days', 5000, true);

    -- Update user profile
    UPDATE fk_user_profiles SET demo_mode_enabled = true WHERE user_id = p_user_id;

    RETURN QUERY SELECT true, 'Demo data added successfully';
  ELSE
    -- Delete demo data
    DELETE FROM fk_policy_covered_members WHERE policy_id IN (
      SELECT id FROM fk_insurance_policies WHERE workspace_id = p_workspace_id AND is_demo = true
    );
    DELETE FROM fk_loans WHERE workspace_id = p_workspace_id AND is_demo = true;
    DELETE FROM fk_insurance_policies WHERE workspace_id = p_workspace_id AND is_demo = true;
    DELETE FROM fk_renewals WHERE workspace_id = p_workspace_id AND is_demo = true;

    -- Update user profile
    UPDATE fk_user_profiles SET demo_mode_enabled = false WHERE user_id = p_user_id;

    RETURN QUERY SELECT true, 'Demo data removed successfully';
  END IF;
END;
$$;
