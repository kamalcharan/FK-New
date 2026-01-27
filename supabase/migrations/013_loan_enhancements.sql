-- supabase/migrations/013_loan_enhancements.sql
-- Add historical verification status and currency support

-- ============================================
-- Add 'historical' verification status
-- ============================================

INSERT INTO m_verification_status (code, name, color)
VALUES ('historical', 'Historical', '#64748b')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- Add currency field to loans
-- ============================================

ALTER TABLE fk_loans ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';

-- ============================================
-- Add is_historical flag to loans
-- (for loans recorded for bookkeeping, not requiring verification)
-- ============================================

ALTER TABLE fk_loans ADD COLUMN IF NOT EXISTS is_historical BOOLEAN DEFAULT false;

-- ============================================
-- Add default_currency to user profiles
-- ============================================

ALTER TABLE fk_user_profiles ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'INR';

-- ============================================
-- Update createLoan to handle historical loans
-- ============================================

-- When a loan is marked as historical, set verification_status to 'historical'
CREATE OR REPLACE FUNCTION set_historical_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_historical = true AND NEW.verification_status = 'pending' THEN
    NEW.verification_status := 'historical';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_historical_on_loan_insert ON fk_loans;
CREATE TRIGGER set_historical_on_loan_insert
  BEFORE INSERT ON fk_loans
  FOR EACH ROW EXECUTE FUNCTION set_historical_verification();

DROP TRIGGER IF EXISTS set_historical_on_loan_update ON fk_loans;
CREATE TRIGGER set_historical_on_loan_update
  BEFORE UPDATE ON fk_loans
  FOR EACH ROW EXECUTE FUNCTION set_historical_verification();

-- ============================================
-- Function: Get user's default currency
-- ============================================

CREATE OR REPLACE FUNCTION get_user_default_currency(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(default_currency, 'INR')
  FROM fk_user_profiles
  WHERE user_id = p_user_id;
$$;

-- ============================================
-- Grant permissions
-- ============================================

GRANT EXECUTE ON FUNCTION get_user_default_currency(UUID) TO authenticated;
