-- supabase/schema.sql
-- FamilyKnows Database Schema
-- Version: 1.0.0
-- Default Language: English (en)

-- ============================================
-- MASTER TABLES (m_)
-- ============================================

-- Authentication providers
CREATE TABLE m_auth_providers (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO m_auth_providers (code, name) VALUES
  ('google', 'Google'),
  ('email', 'Email + Password'),
  ('phone', 'Phone + Password');

-- Supported languages
CREATE TABLE m_languages (
  code TEXT PRIMARY KEY,        -- 'en', 'hi', 'te', 'ta', etc.
  name TEXT NOT NULL,           -- 'English', 'Hindi', 'Telugu'
  native_name TEXT NOT NULL,    -- 'English', 'हिंदी', 'తెలుగు'
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO m_languages (code, name, native_name, is_default) VALUES
  ('en', 'English', 'English', true),
  ('hi', 'Hindi', 'हिंदी', false),
  ('te', 'Telugu', 'తెలుగు', false),
  ('ta', 'Tamil', 'தமிழ்', false),
  ('kn', 'Kannada', 'ಕನ್ನಡ', false),
  ('mr', 'Marathi', 'मराठी', false);

-- Workspace roles
CREATE TABLE m_roles (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  can_create_records BOOLEAN DEFAULT false,
  can_invite_members BOOLEAN DEFAULT false,
  can_delete_own BOOLEAN DEFAULT false,
  can_delete_any BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO m_roles (code, name, can_create_records, can_invite_members, can_delete_own, can_delete_any) VALUES
  ('owner', 'Owner', true, true, true, true),
  ('admin', 'Admin', true, true, true, false),
  ('member', 'Member', true, false, true, false),
  ('viewer', 'Viewer', false, false, false, false);

-- Insurance types
CREATE TABLE m_insurance_types (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

INSERT INTO m_insurance_types (code, name, icon, sort_order) VALUES
  ('health', 'Health Insurance', '🏥', 1),
  ('vehicle', 'Vehicle Insurance', '🚗', 2),
  ('life', 'Life Insurance', '🕊️', 3),
  ('property', 'Property Insurance', '🏠', 4),
  ('other', 'Other', '📄', 99);

-- Renewal/Compliance types
CREATE TABLE m_renewal_types (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

INSERT INTO m_renewal_types (code, name, icon, sort_order) VALUES
  ('ghmc', 'GHMC/Municipal', '🏛️', 1),
  ('fire_noc', 'Fire NOC', '🔥', 2),
  ('fssai', 'FSSAI License', '🍽️', 3),
  ('pollution', 'Pollution Certificate', '🌿', 4),
  ('property_tax', 'Property Tax', '🏠', 5),
  ('trade_license', 'Trade License', '🏪', 6),
  ('other', 'Other', '📋', 99);

-- Document storage types
CREATE TABLE m_storage_types (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

INSERT INTO m_storage_types (code, name, description) VALUES
  ('google_drive', 'Google Drive', 'Stored in user''s Google Drive'),
  ('email', 'Email', 'Emailed to user for safekeeping'),
  ('local', 'Local Device', 'Stored on device only');

-- Loan status
CREATE TABLE m_loan_status (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT,
  sort_order INTEGER DEFAULT 0
);

INSERT INTO m_loan_status (code, name, color, sort_order) VALUES
  ('active', 'Active', '#F59E0B', 1),
  ('partial', 'Partially Paid', '#3B82F6', 2),
  ('settled', 'Settled', '#4ADE80', 3),
  ('defaulted', 'Defaulted', '#EF4444', 4);

-- Verification status
CREATE TABLE m_verification_status (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT
);

INSERT INTO m_verification_status (code, name, color) VALUES
  ('pending', 'Pending', '#94A3B8'),
  ('verified', 'Verified', '#4ADE80'),
  ('disputed', 'Disputed', '#EF4444');


-- ============================================
-- CORE TABLES (fk_)
-- ============================================

-- Users (extends Supabase auth.users)
CREATE TABLE fk_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  auth_provider TEXT REFERENCES m_auth_providers(code) DEFAULT 'email',
  is_email_verified BOOLEAN DEFAULT false,
  is_phone_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (extensible for future needs)
CREATE TABLE fk_user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES fk_users(id) ON DELETE CASCADE,

  -- Basic info
  full_name TEXT,
  display_name TEXT,
  avatar_url TEXT,

  -- Preferences
  language TEXT REFERENCES m_languages(code) DEFAULT 'en',
  timezone TEXT DEFAULT 'Asia/Kolkata',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  currency TEXT DEFAULT 'INR',

  -- Notification preferences
  notify_email BOOLEAN DEFAULT true,
  notify_push BOOLEAN DEFAULT true,
  notify_sms BOOLEAN DEFAULT false,

  -- App preferences
  theme TEXT DEFAULT 'dark',              -- dark, light, system
  biometric_enabled BOOLEAN DEFAULT false,

  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step INTEGER DEFAULT 0,

  -- Metadata (for future extensions)
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Workspaces (Vaults)
CREATE TABLE fk_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES fk_users(id),

  -- Invite
  invite_code TEXT UNIQUE,
  invite_expires_at TIMESTAMPTZ,

  -- Settings
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace members
CREATE TABLE fk_workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES fk_workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES fk_users(id) ON DELETE CASCADE,
  role TEXT NOT NULL REFERENCES m_roles(code) DEFAULT 'member',

  invited_by UUID REFERENCES fk_users(id),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(workspace_id, user_id)
);

-- Loans
CREATE TABLE fk_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES fk_workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES fk_users(id),

  -- Loan type: 'given' (we gave money) or 'taken' (we borrowed)
  loan_type TEXT NOT NULL CHECK (loan_type IN ('given', 'taken')),

  -- Counterparty details
  counterparty_name TEXT NOT NULL,
  counterparty_phone TEXT,
  counterparty_email TEXT,

  -- Loan details
  principal_amount DECIMAL(12,2) NOT NULL,
  interest_rate DECIMAL(5,2) DEFAULT 0,
  interest_type TEXT DEFAULT 'simple' CHECK (interest_type IN ('simple', 'compound', 'none')),

  -- Dates
  loan_date DATE NOT NULL,
  due_date DATE,

  -- Status
  status TEXT REFERENCES m_loan_status(code) DEFAULT 'active',
  amount_repaid DECIMAL(12,2) DEFAULT 0,

  -- Verification
  verification_status TEXT REFERENCES m_verification_status(code) DEFAULT 'pending',
  verification_token TEXT UNIQUE,
  verification_sent_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,

  -- Notes
  purpose TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loan repayments
CREATE TABLE fk_loan_repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES fk_loans(id) ON DELETE CASCADE,

  amount DECIMAL(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_mode TEXT,                      -- cash, upi, bank, etc.
  reference_number TEXT,

  recorded_by UUID NOT NULL REFERENCES fk_users(id),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insurance policies
CREATE TABLE fk_insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES fk_workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES fk_users(id),

  -- Policy details
  policy_type TEXT NOT NULL REFERENCES m_insurance_types(code),
  policy_number TEXT,
  provider_name TEXT NOT NULL,

  -- Insured details
  insured_name TEXT NOT NULL,
  insured_relation TEXT,                  -- self, spouse, parent, child

  -- Amounts
  premium_amount DECIMAL(12,2),
  premium_frequency TEXT DEFAULT 'yearly' CHECK (premium_frequency IN ('monthly', 'quarterly', 'yearly', 'one_time')),
  sum_insured DECIMAL(12,2),

  -- Dates
  start_date DATE,
  expiry_date DATE NOT NULL,
  next_premium_date DATE,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'claimed')),

  -- Contact
  agent_name TEXT,
  agent_phone TEXT,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Renewals (Compliance tracking)
CREATE TABLE fk_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES fk_workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES fk_users(id),

  -- Renewal details
  renewal_type TEXT NOT NULL REFERENCES m_renewal_types(code),
  title TEXT NOT NULL,
  authority_name TEXT,
  reference_number TEXT,

  -- Property/Asset reference (if applicable)
  property_address TEXT,

  -- Amounts
  fee_amount DECIMAL(12,2),

  -- Dates
  issue_date DATE,
  expiry_date DATE NOT NULL,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'renewed')),

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents (metadata only - actual files in Drive/Email)
CREATE TABLE fk_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES fk_workspaces(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES fk_users(id),

  -- Polymorphic reference
  entity_type TEXT NOT NULL CHECK (entity_type IN ('loan', 'insurance', 'renewal', 'other')),
  entity_id UUID,

  -- File info
  file_name TEXT NOT NULL,
  file_type TEXT,                         -- pdf, jpg, png, etc.
  file_size_bytes INTEGER,

  -- Storage info
  storage_type TEXT NOT NULL REFERENCES m_storage_types(code),

  -- Google Drive storage
  google_drive_file_id TEXT,
  google_drive_link TEXT,

  -- Email storage
  email_sent_to TEXT,
  email_sent_at TIMESTAMPTZ,
  email_subject TEXT,

  -- Local storage
  local_path TEXT,

  -- Metadata
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invite tracking (for WhatsApp/SMS invites)
CREATE TABLE fk_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES fk_workspaces(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES fk_users(id),

  invite_type TEXT NOT NULL CHECK (invite_type IN ('workspace', 'loan_verification')),

  -- Contact
  phone TEXT,
  email TEXT,

  -- Tracking
  invite_code TEXT UNIQUE NOT NULL,
  invite_url TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'opened', 'accepted', 'expired')),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- For loan verification
  loan_id UUID REFERENCES fk_loans(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================
-- INDEXES
-- ============================================

-- Users
CREATE INDEX idx_fk_users_email ON fk_users(email);
CREATE INDEX idx_fk_users_phone ON fk_users(phone);

-- User profiles
CREATE INDEX idx_fk_user_profiles_user_id ON fk_user_profiles(user_id);

-- Workspaces
CREATE INDEX idx_fk_workspaces_owner ON fk_workspaces(owner_id);
CREATE INDEX idx_fk_workspaces_invite_code ON fk_workspaces(invite_code);

-- Workspace members
CREATE INDEX idx_fk_workspace_members_workspace ON fk_workspace_members(workspace_id);
CREATE INDEX idx_fk_workspace_members_user ON fk_workspace_members(user_id);

-- Loans
CREATE INDEX idx_fk_loans_workspace ON fk_loans(workspace_id);
CREATE INDEX idx_fk_loans_status ON fk_loans(status);
CREATE INDEX idx_fk_loans_due_date ON fk_loans(due_date);
CREATE INDEX idx_fk_loans_verification ON fk_loans(verification_token);

-- Insurance
CREATE INDEX idx_fk_insurance_workspace ON fk_insurance_policies(workspace_id);
CREATE INDEX idx_fk_insurance_expiry ON fk_insurance_policies(expiry_date);
CREATE INDEX idx_fk_insurance_status ON fk_insurance_policies(status);

-- Renewals
CREATE INDEX idx_fk_renewals_workspace ON fk_renewals(workspace_id);
CREATE INDEX idx_fk_renewals_expiry ON fk_renewals(expiry_date);

-- Documents
CREATE INDEX idx_fk_documents_workspace ON fk_documents(workspace_id);
CREATE INDEX idx_fk_documents_entity ON fk_documents(entity_type, entity_id);

-- Invites
CREATE INDEX idx_fk_invites_code ON fk_invites(invite_code);
CREATE INDEX idx_fk_invites_loan ON fk_invites(loan_id);


-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE fk_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE fk_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fk_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE fk_workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE fk_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE fk_loan_repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fk_insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE fk_renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE fk_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE fk_invites ENABLE ROW LEVEL SECURITY;

-- Users: can only access own record
CREATE POLICY "Users can view own record" ON fk_users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own record" ON fk_users
  FOR UPDATE USING (auth.uid() = id);

-- User profiles: can only access own profile
CREATE POLICY "Users can view own profile" ON fk_user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON fk_user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON fk_user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Workspaces: members can view
CREATE POLICY "Members can view workspace" ON fk_workspaces
  FOR SELECT USING (
    id IN (
      SELECT workspace_id FROM fk_workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Owner can update workspace" ON fk_workspaces
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can create workspace" ON fk_workspaces
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Workspace members: members can view other members
CREATE POLICY "Members can view workspace members" ON fk_workspace_members
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM fk_workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Loans: workspace members can view
CREATE POLICY "Members can view loans" ON fk_loans
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM fk_workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Members can create loans" ON fk_loans
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM fk_workspace_members wm
      JOIN m_roles r ON wm.role = r.code
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
        AND r.can_create_records = true
    )
  );

CREATE POLICY "Creator can update own loans" ON fk_loans
  FOR UPDATE USING (created_by = auth.uid());

-- Insurance: same pattern as loans
CREATE POLICY "Members can view insurance" ON fk_insurance_policies
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM fk_workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Members can create insurance" ON fk_insurance_policies
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM fk_workspace_members wm
      JOIN m_roles r ON wm.role = r.code
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
        AND r.can_create_records = true
    )
  );

-- Renewals: same pattern
CREATE POLICY "Members can view renewals" ON fk_renewals
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM fk_workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Members can create renewals" ON fk_renewals
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM fk_workspace_members wm
      JOIN m_roles r ON wm.role = r.code
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
        AND r.can_create_records = true
    )
  );

-- Documents: workspace members can view
CREATE POLICY "Members can view documents" ON fk_documents
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM fk_workspace_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Members can upload documents" ON fk_documents
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM fk_workspace_members wm
      JOIN m_roles r ON wm.role = r.code
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
        AND r.can_create_records = true
    )
  );


-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_fk_users_updated_at
  BEFORE UPDATE ON fk_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fk_user_profiles_updated_at
  BEFORE UPDATE ON fk_user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fk_workspaces_updated_at
  BEFORE UPDATE ON fk_workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fk_workspace_members_updated_at
  BEFORE UPDATE ON fk_workspace_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fk_loans_updated_at
  BEFORE UPDATE ON fk_loans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fk_insurance_updated_at
  BEFORE UPDATE ON fk_insurance_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fk_renewals_updated_at
  BEFORE UPDATE ON fk_renewals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create user profile on user creation
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO fk_user_profiles (user_id, language)
  VALUES (NEW.id, 'en');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_profile_on_user_insert
  AFTER INSERT ON fk_users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Auto-add owner as workspace member
CREATE OR REPLACE FUNCTION add_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO fk_workspace_members (workspace_id, user_id, role, joined_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER add_owner_on_workspace_create
  AFTER INSERT ON fk_workspaces
  FOR EACH ROW EXECUTE FUNCTION add_owner_as_member();

-- Generate verification token for loans
CREATE OR REPLACE FUNCTION generate_verification_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verification_token IS NULL THEN
    NEW.verification_token = encode(gen_random_bytes(16), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_loan_verification_token
  BEFORE INSERT ON fk_loans
  FOR EACH ROW EXECUTE FUNCTION generate_verification_token();

-- Update loan status based on repayments
CREATE OR REPLACE FUNCTION update_loan_on_repayment()
RETURNS TRIGGER AS $$
DECLARE
  total_repaid DECIMAL(12,2);
  loan_principal DECIMAL(12,2);
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total_repaid
  FROM fk_loan_repayments WHERE loan_id = NEW.loan_id;

  SELECT principal_amount INTO loan_principal
  FROM fk_loans WHERE id = NEW.loan_id;

  UPDATE fk_loans
  SET
    amount_repaid = total_repaid,
    status = CASE
      WHEN total_repaid >= loan_principal THEN 'settled'
      WHEN total_repaid > 0 THEN 'partial'
      ELSE 'active'
    END
  WHERE id = NEW.loan_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_loan_after_repayment
  AFTER INSERT ON fk_loan_repayments
  FOR EACH ROW EXECUTE FUNCTION update_loan_on_repayment();


-- ============================================
-- VIEWS (for convenience)
-- ============================================

-- Upcoming renewals/expirations (next 30 days)
CREATE VIEW v_upcoming_expirations AS
SELECT
  'insurance' as type,
  id,
  workspace_id,
  policy_type as subtype,
  provider_name as title,
  expiry_date,
  (expiry_date - CURRENT_DATE) as days_remaining
FROM fk_insurance_policies
WHERE status = 'active'
  AND expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')

UNION ALL

SELECT
  'renewal' as type,
  id,
  workspace_id,
  renewal_type as subtype,
  title,
  expiry_date,
  (expiry_date - CURRENT_DATE) as days_remaining
FROM fk_renewals
WHERE status = 'active'
  AND expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')

ORDER BY days_remaining;

-- Active loans summary
CREATE VIEW v_loans_summary AS
SELECT
  workspace_id,
  loan_type,
  COUNT(*) as count,
  SUM(principal_amount) as total_principal,
  SUM(amount_repaid) as total_repaid,
  SUM(principal_amount - amount_repaid) as total_outstanding
FROM fk_loans
WHERE status IN ('active', 'partial')
GROUP BY workspace_id, loan_type;
