-- supabase/migrations/011_demo_mode.sql
-- Add demo mode support to FamilyKnows

-- ============================================
-- Add is_demo column to data tables
-- ============================================

-- Loans
ALTER TABLE fk_loans ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- Insurance policies
ALTER TABLE fk_insurance_policies ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- Renewals
ALTER TABLE fk_renewals ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- Loan repayments
ALTER TABLE fk_loan_repayments ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- ============================================
-- Add demo_mode_enabled to user profiles
-- ============================================

ALTER TABLE fk_user_profiles ADD COLUMN IF NOT EXISTS demo_mode_enabled BOOLEAN DEFAULT false;

-- ============================================
-- Function: Toggle demo mode for a workspace
-- ============================================

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
  v_workspace_name TEXT;
BEGIN
  -- Get workspace name for demo data
  SELECT name INTO v_workspace_name FROM fk_workspaces WHERE id = p_workspace_id;

  IF v_workspace_name IS NULL THEN
    RETURN QUERY SELECT false, 'Workspace not found'::TEXT;
    RETURN;
  END IF;

  IF p_enable THEN
    -- INSERT DEMO DATA

    -- Demo Loans
    INSERT INTO fk_loans (workspace_id, created_by, loan_type, counterparty_name, counterparty_phone, principal_amount, loan_date, due_date, status, verification_status, purpose, is_demo)
    VALUES
      (p_workspace_id, p_user_id, 'given', 'Ravi Kumar', '9876543210', 50000, CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE + INTERVAL '45 days', 'active', 'verified', 'Shop renovation', true),
      (p_workspace_id, p_user_id, 'given', 'Priya Sharma', '9876543211', 25000, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '60 days', 'active', 'pending', 'Medical emergency', true),
      (p_workspace_id, p_user_id, 'taken', 'Suresh Uncle', '9876543212', 100000, CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE + INTERVAL '90 days', 'partial', 'verified', 'Home repairs', true),
      (p_workspace_id, p_user_id, 'given', 'Amit Patel', '9876543213', 15000, CURRENT_DATE - INTERVAL '120 days', CURRENT_DATE - INTERVAL '30 days', 'settled', 'verified', 'Business loan', true)
    ON CONFLICT DO NOTHING;

    -- Demo Insurance Policies
    INSERT INTO fk_insurance_policies (workspace_id, created_by, policy_type, policy_number, provider_name, insured_name, insured_relation, premium_amount, sum_insured, start_date, expiry_date, is_demo)
    VALUES
      (p_workspace_id, p_user_id, 'health', 'HLT-2024-001234', 'HDFC Ergo', 'Family Floater', 'family', 25000, 1000000, CURRENT_DATE - INTERVAL '10 months', CURRENT_DATE + INTERVAL '2 months', true),
      (p_workspace_id, p_user_id, 'health', 'HLT-2024-005678', 'Star Health', 'Parents Policy', 'parents', 35000, 500000, CURRENT_DATE - INTERVAL '8 months', CURRENT_DATE + INTERVAL '4 months', true),
      (p_workspace_id, p_user_id, 'vehicle', 'VEH-2024-009012', 'ICICI Lombard', 'Car Insurance', 'self', 12000, 800000, CURRENT_DATE - INTERVAL '11 months', CURRENT_DATE + INTERVAL '15 days', true),
      (p_workspace_id, p_user_id, 'life', 'LIF-2024-003456', 'LIC', 'Term Plan', 'self', 18000, 5000000, CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE + INTERVAL '6 months', true)
    ON CONFLICT DO NOTHING;

    -- Demo Renewals
    INSERT INTO fk_renewals (workspace_id, created_by, renewal_type, title, authority_name, reference_number, fee_amount, expiry_date, is_demo)
    VALUES
      (p_workspace_id, p_user_id, 'property_tax', 'House Property Tax', 'GHMC', 'PROP-2024-12345', 8500, CURRENT_DATE + INTERVAL '30 days', true),
      (p_workspace_id, p_user_id, 'pollution', 'Car PUC Certificate', 'RTO Hyderabad', 'PUC-2024-67890', 500, CURRENT_DATE + INTERVAL '10 days', true),
      (p_workspace_id, p_user_id, 'trade_license', 'Shop Trade License', 'Municipal Corp', 'TRD-2024-11111', 5000, CURRENT_DATE + INTERVAL '60 days', true)
    ON CONFLICT DO NOTHING;

    -- Update user profile
    UPDATE fk_user_profiles SET demo_mode_enabled = true WHERE user_id = p_user_id;

    RETURN QUERY SELECT true, 'Demo mode enabled with sample data'::TEXT;
  ELSE
    -- DELETE DEMO DATA
    DELETE FROM fk_loan_repayments WHERE loan_id IN (SELECT id FROM fk_loans WHERE workspace_id = p_workspace_id AND is_demo = true);
    DELETE FROM fk_loans WHERE workspace_id = p_workspace_id AND is_demo = true;
    DELETE FROM fk_insurance_policies WHERE workspace_id = p_workspace_id AND is_demo = true;
    DELETE FROM fk_renewals WHERE workspace_id = p_workspace_id AND is_demo = true;

    -- Update user profile
    UPDATE fk_user_profiles SET demo_mode_enabled = false WHERE user_id = p_user_id;

    RETURN QUERY SELECT true, 'Demo mode disabled, sample data removed'::TEXT;
  END IF;
END;
$$;

-- ============================================
-- Function: Get dashboard stats for workspace
-- ============================================

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_workspace_id UUID)
RETURNS TABLE (
  total_loans_given DECIMAL,
  total_loans_taken DECIMAL,
  loans_given_count INTEGER,
  loans_taken_count INTEGER,
  pending_verification INTEGER,
  active_policies INTEGER,
  expiring_soon_policies INTEGER,
  upcoming_renewals INTEGER,
  overdue_renewals INTEGER
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    -- Loans given (active + partial)
    COALESCE(SUM(CASE WHEN l.loan_type = 'given' AND l.status IN ('active', 'partial') THEN l.principal_amount - l.amount_repaid ELSE 0 END), 0) as total_loans_given,
    -- Loans taken (active + partial)
    COALESCE(SUM(CASE WHEN l.loan_type = 'taken' AND l.status IN ('active', 'partial') THEN l.principal_amount - l.amount_repaid ELSE 0 END), 0) as total_loans_taken,
    -- Count of loans given
    COUNT(CASE WHEN l.loan_type = 'given' AND l.status IN ('active', 'partial') THEN 1 END)::INTEGER as loans_given_count,
    -- Count of loans taken
    COUNT(CASE WHEN l.loan_type = 'taken' AND l.status IN ('active', 'partial') THEN 1 END)::INTEGER as loans_taken_count,
    -- Pending verification
    COUNT(CASE WHEN l.verification_status = 'pending' AND l.status = 'active' THEN 1 END)::INTEGER as pending_verification,
    -- Active policies (from separate query)
    (SELECT COUNT(*)::INTEGER FROM fk_insurance_policies WHERE workspace_id = p_workspace_id AND expiry_date > CURRENT_DATE) as active_policies,
    -- Policies expiring in 30 days
    (SELECT COUNT(*)::INTEGER FROM fk_insurance_policies WHERE workspace_id = p_workspace_id AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as expiring_soon_policies,
    -- Renewals in next 30 days
    (SELECT COUNT(*)::INTEGER FROM fk_renewals WHERE workspace_id = p_workspace_id AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as upcoming_renewals,
    -- Overdue renewals
    (SELECT COUNT(*)::INTEGER FROM fk_renewals WHERE workspace_id = p_workspace_id AND expiry_date < CURRENT_DATE) as overdue_renewals
  FROM fk_loans l
  WHERE l.workspace_id = p_workspace_id;
$$;

-- ============================================
-- Grant permissions
-- ============================================

GRANT EXECUTE ON FUNCTION toggle_demo_mode(UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID) TO authenticated;
