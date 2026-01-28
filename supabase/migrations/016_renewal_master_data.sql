-- Migration: 016_renewal_master_data.sql
-- Description: Add renewal presets, bundles, and stories for smart renewal tracking
-- Date: January 2026

-- ============================================
-- 1. RENEWAL PRESETS (Master catalog)
-- ============================================

CREATE TABLE fk_renewal_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  code VARCHAR(50) UNIQUE NOT NULL,

  -- Display
  title VARCHAR(200) NOT NULL,
  icon VARCHAR(10),

  -- Categorization
  category VARCHAR(50) NOT NULL,      -- 'business', 'property', 'professional', 'personal', 'vehicle', 'contracts', 'subscriptions'
  subcategory VARCHAR(50),            -- 'trade_license', 'fire_safety', 'food_license', etc.

  -- Defaults for form
  authority_template VARCHAR(200),
  frequency_months INT,
  cost_range_min INT,
  cost_range_max INT,

  -- Content
  penalty_info TEXT,
  documents_required JSONB DEFAULT '[]',
  renewal_process TEXT,

  -- Targeting
  applicable_to VARCHAR(20) DEFAULT 'all',  -- 'business', 'individual', 'property', 'vehicle', 'all'
  state_specific VARCHAR(50) DEFAULT 'all', -- 'telangana', 'karnataka', 'all'

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_fk_renewal_presets_category ON fk_renewal_presets(category);
CREATE INDEX idx_fk_renewal_presets_active ON fk_renewal_presets(is_active);
CREATE INDEX idx_fk_renewal_presets_state ON fk_renewal_presets(state_specific);


-- ============================================
-- 2. RENEWAL BUNDLES (Industry Personas)
-- ============================================

CREATE TABLE fk_renewal_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  code VARCHAR(50) UNIQUE NOT NULL,

  -- Display
  title VARCHAR(100) NOT NULL,
  icon VARCHAR(10),
  description TEXT,
  hook TEXT,  -- "Running a restaurant? You need all 5 of these."

  -- Linked presets (ordered array of preset codes)
  preset_codes JSONB NOT NULL DEFAULT '[]',

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fk_renewal_bundles_active ON fk_renewal_bundles(is_active);


-- ============================================
-- 3. RENEWAL STORIES (Penalty Stories for Empty State)
-- ============================================

CREATE TABLE fk_renewal_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content
  quote TEXT NOT NULL,
  consequence TEXT,
  source VARCHAR(100),  -- "Restaurant owner, Hyderabad"

  -- Link to preset (optional)
  preset_code VARCHAR(50) REFERENCES fk_renewal_presets(code),
  category VARCHAR(50),

  -- Display
  icon VARCHAR(10),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fk_renewal_stories_active ON fk_renewal_stories(is_active);


-- ============================================
-- 4. UPDATE fk_renewals TABLE (More flexible)
-- ============================================

-- Add new columns for flexibility
ALTER TABLE fk_renewals
  ADD COLUMN IF NOT EXISTS category VARCHAR(50),
  ADD COLUMN IF NOT EXISTS subcategory VARCHAR(50),
  ADD COLUMN IF NOT EXISTS frequency_months INT,
  ADD COLUMN IF NOT EXISTS reminder_days JSONB DEFAULT '[90, 60, 30, 15, 7, 1]',
  ADD COLUMN IF NOT EXISTS preset_code VARCHAR(50);

-- Make renewal_type optional (for custom renewals)
ALTER TABLE fk_renewals
  ALTER COLUMN renewal_type DROP NOT NULL;

-- Add update/delete policies for renewals
CREATE POLICY "Members can update renewals" ON fk_renewals
  FOR UPDATE USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM fk_workspace_members wm
      JOIN m_roles r ON wm.role = r.code
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
        AND r.can_create_records = true
    )
  );

CREATE POLICY "Members can delete renewals" ON fk_renewals
  FOR DELETE USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM fk_workspace_members wm
      JOIN m_roles r ON wm.role = r.code
      WHERE wm.user_id = auth.uid()
        AND wm.is_active = true
        AND r.can_create_records = true
    )
  );


-- ============================================
-- 5. SEED DATA: PRESETS
-- ============================================

INSERT INTO fk_renewal_presets (code, title, icon, category, subcategory, authority_template, frequency_months, cost_range_min, cost_range_max, penalty_info, documents_required, renewal_process, applicable_to, state_specific, sort_order) VALUES

-- BUSINESS > Trade Licenses
('GHMC_TRADE', 'GHMC Trade License', '🏪', 'business', 'trade_license', 'Greater Hyderabad Municipal Corporation', 12, 2000, 25000, '₹100-500 per month delay + premises sealing', '["Previous license copy", "Property tax receipt", "ID proof", "GST registration"]', 'Online via GHMC portal or offline at Ward Office / Mee Seva', 'business', 'telangana', 1),

('BBMP_TRADE', 'BBMP Trade License', '🏪', 'business', 'trade_license', 'Bruhat Bengaluru Mahanagara Palike', 12, 2000, 20000, '₹100-500 per month delay + premises sealing', '["Previous license copy", "Property tax receipt", "ID proof"]', 'Online via BBMP portal or at zonal office', 'business', 'karnataka', 2),

('MCH_TRADE', 'Municipal Trade License', '🏪', 'business', 'trade_license', 'Municipal Corporation', 12, 1500, 15000, 'Penalty varies by municipality', '["Previous license copy", "Property tax receipt", "ID proof"]', 'Apply at municipal office or online portal', 'business', 'all', 3),

-- BUSINESS > Fire Safety
('FIRE_NOC', 'Fire NOC', '🔥', 'business', 'fire_safety', 'State Fire Services Department', 12, 5000, 25000, 'Business closure notice + ₹10,000-50,000 fine', '["Building plan", "Previous NOC", "Fire equipment bills", "Electrical audit", "Emergency exit plan"]', 'Apply at District Fire Office. Inspection within 15 days.', 'business', 'all', 10),

('FIRE_NOC_HOSPITAL', 'Fire NOC - Hospital', '🔥', 'business', 'fire_safety', 'State Fire Services Department', 12, 10000, 30000, 'Hospital closure + criminal liability', '["Building plan", "Previous NOC", "Fire equipment AMC", "Emergency protocols"]', 'Apply at District Fire Office with hospital license', 'business', 'all', 11),

('FIRE_NOC_SCHOOL', 'Fire NOC - School', '🔥', 'business', 'fire_safety', 'State Fire Services Department', 12, 5000, 20000, 'School closure notice', '["Building plan", "Previous NOC", "Fire drill records", "Safety equipment list"]', 'Apply at District Fire Office', 'business', 'all', 12),

-- BUSINESS > Food License
('FSSAI_BASIC', 'FSSAI Basic Registration', '🍽️', 'business', 'food_license', 'Food Safety Department', 60, 100, 500, 'Business closure + ₹25,000-5,00,000 fine', '["Photo ID", "Proof of premises"]', 'Online at foscos.fssai.gov.in', 'business', 'all', 20),

('FSSAI_STATE', 'FSSAI State License', '🍽️', 'business', 'food_license', 'Food Safety Department', 12, 2000, 5000, 'Business closure + ₹25,000-5,00,000 fine', '["Photo ID", "Proof of premises", "Food safety plan", "Water test report"]', 'Online at foscos.fssai.gov.in. Apply 30 days before expiry.', 'business', 'all', 21),

('FSSAI_CENTRAL', 'FSSAI Central License', '🍽️', 'business', 'food_license', 'FSSAI Central', 12, 7500, 15000, 'Business closure + heavy penalties', '["Photo ID", "Proof of premises", "Food safety plan", "Lab reports"]', 'Online at foscos.fssai.gov.in', 'business', 'all', 22),

-- BUSINESS > Shop & Establishment
('SHOP_EST_TS', 'Shop & Establishment - Telangana', '🏬', 'business', 'shop_establishment', 'Labour Department - Telangana', 60, 500, 2000, '₹1,000-25,000 fine', '["Application form", "Address proof", "ID proof", "PAN card"]', 'Online via Telangana labour portal', 'business', 'telangana', 30),

('SHOP_EST_KA', 'Shop & Establishment - Karnataka', '🏬', 'business', 'shop_establishment', 'Labour Department - Karnataka', 60, 500, 2000, '₹1,000-25,000 fine', '["Application form", "Address proof", "ID proof", "PAN card"]', 'Online via Karnataka labour portal', 'business', 'karnataka', 31),

('SHOP_EST_MH', 'Shop & Establishment - Maharashtra', '🏬', 'business', 'shop_establishment', 'Labour Department - Maharashtra', 36, 500, 3000, '₹1,000-25,000 fine', '["Application form", "Address proof", "ID proof", "PAN card"]', 'Online via Maharashtra labour portal', 'business', 'maharashtra', 32),

-- BUSINESS > GST & Tax
('GST_ANNUAL', 'GST Annual Return (GSTR-9)', '📊', 'business', 'tax_compliance', 'GST Department', 12, 5000, 25000, '₹200/day late fee (max ₹5,000) + interest', '["GSTR-1, GSTR-3B returns", "Annual accounts", "Audit report if applicable"]', 'File online via GST portal before 31st December', 'business', 'all', 40),

('ROC_ANNUAL', 'ROC Annual Filing', '📋', 'business', 'tax_compliance', 'Ministry of Corporate Affairs', 12, 1000, 10000, '₹100/day additional fee', '["Financial statements", "Board resolutions", "Audit report"]', 'File online via MCA portal', 'business', 'all', 41),

('DIR_KYC', 'Director KYC (DIR-3 KYC)', '🆔', 'business', 'tax_compliance', 'Ministry of Corporate Affairs', 12, 500, 2000, 'Director DIN deactivated', '["PAN", "Aadhaar", "Mobile/Email verification"]', 'File online via MCA portal before 30th September', 'business', 'all', 42),

-- BUSINESS > Environmental
('PCB_CONSENT', 'Pollution Control Board Consent', '🌿', 'business', 'environmental', 'State Pollution Control Board', 12, 10000, 100000, 'Factory closure + heavy penalties', '["Previous consent", "Pollution control measures", "Lab reports"]', 'Apply at State PCB office', 'business', 'all', 50),

-- BUSINESS > Industry Specific
('DRUG_LICENSE', 'Drug License', '💊', 'business', 'healthcare', 'State Drug Controller', 60, 5000, 15000, 'Pharmacy closure + legal action', '["Pharmacist registration", "Previous license", "Premises proof"]', 'Apply at State Drug Controller office', 'business', 'all', 60),

('LIQUOR_LICENSE', 'Liquor License', '🍺', 'business', 'hospitality', 'State Excise Department', 12, 50000, 1000000, 'Immediate closure + heavy fine + legal action', '["Previous license", "NOCs", "Premises documents"]', 'Apply at State Excise office', 'business', 'all', 61),

-- PROPERTY
('PROPERTY_TAX', 'Property Tax', '🏠', 'property', 'property_tax', 'Municipal Corporation', 12, 0, 0, '2% per month penalty', '["Previous receipt", "Property documents"]', 'Online via municipal portal or at ward office', 'property', 'all', 100),

('WATER_TAX', 'Water Tax / Connection', '💧', 'property', 'utility', 'Municipal Water Board', 12, 500, 5000, 'Water disconnection', '["Previous bill", "Property documents"]', 'Pay online or at water board office', 'property', 'all', 101),

('SOCIETY_MAINTENANCE', 'Society Maintenance', '🏢', 'property', 'society', 'Housing Society', 12, 0, 0, 'Membership suspension + legal notice', '["Previous receipts"]', 'Pay to society office', 'property', 'all', 102),

('RENT_AGREEMENT', 'Rent Agreement Renewal', '📝', 'property', 'agreement', 'Sub-Registrar', 11, 1000, 10000, 'Legal complications + eviction issues', '["Previous agreement", "ID proofs", "Property documents"]', 'Register at Sub-Registrar office', 'property', 'all', 103),

-- PROFESSIONAL
('MCI_REG', 'Medical Council Registration', '⚕️', 'professional', 'medical', 'State Medical Council', 60, 1000, 5000, 'Cannot practice medicine legally', '["MBBS degree", "Internship certificate", "Previous registration"]', 'Apply at State Medical Council', 'individual', 'all', 200),

('DENTAL_REG', 'Dental Council Registration', '🦷', 'professional', 'medical', 'State Dental Council', 60, 1000, 3000, 'Cannot practice dentistry legally', '["BDS degree", "Previous registration"]', 'Apply at State Dental Council', 'individual', 'all', 201),

('NURSING_REG', 'Nursing Council Registration', '👩‍⚕️', 'professional', 'medical', 'State Nursing Council', 60, 500, 2000, 'Cannot practice nursing legally', '["Nursing degree", "Previous registration"]', 'Apply at State Nursing Council', 'individual', 'all', 202),

('ICAI_MEMBERSHIP', 'CA Membership (ICAI)', '📈', 'professional', 'finance', 'ICAI', 12, 3000, 5000, 'Cannot sign as CA', '["Membership certificate", "CPE hours proof"]', 'Online via ICAI portal', 'individual', 'all', 210),

('ICSI_MEMBERSHIP', 'CS Membership (ICSI)', '📋', 'professional', 'finance', 'ICSI', 12, 3000, 5000, 'Cannot practice as CS', '["Membership certificate"]', 'Online via ICSI portal', 'individual', 'all', 211),

('BAR_COUNCIL', 'Bar Council Enrollment', '⚖️', 'professional', 'legal', 'State Bar Council', 12, 5000, 15000, 'Cannot practice law', '["Previous enrollment", "Fee receipts"]', 'Apply at State Bar Council', 'individual', 'all', 220),

('ARCHITECT_REG', 'Architect Registration', '🏗️', 'professional', 'technical', 'Council of Architecture', 60, 2000, 5000, 'Cannot practice architecture', '["B.Arch degree", "Previous registration"]', 'Apply at Council of Architecture', 'individual', 'all', 230),

('ELECTRICAL_LICENSE', 'Electrical Contractor License', '⚡', 'professional', 'technical', 'Chief Electrical Inspector', 60, 2000, 10000, 'Cannot do electrical work legally', '["Qualification proof", "Previous license"]', 'Apply at Electrical Inspectorate', 'individual', 'all', 231),

('RERA_AGENT', 'RERA Agent Registration', '🏘️', 'professional', 'real_estate', 'State RERA', 60, 25000, 50000, 'Cannot act as real estate agent', '["ID proof", "PAN", "Address proof"]', 'Apply at State RERA portal', 'individual', 'all', 240),

-- PERSONAL DOCUMENTS
('PASSPORT', 'Passport', '🛂', 'personal', 'identity', 'Passport Seva Kendra', 120, 1500, 2000, 'Cannot travel internationally', '["Current passport", "Address proof", "Photos"]', 'Apply at PSK. Apply 12 months before expiry.', 'individual', 'all', 300),

('PASSPORT_MINOR', 'Passport - Minor', '🛂', 'personal', 'identity', 'Passport Seva Kendra', 60, 1000, 1000, 'Cannot travel internationally', '["Birth certificate", "Parents passport", "Photos"]', 'Apply at PSK', 'individual', 'all', 301),

('DRIVING_LICENSE', 'Driving License', '🪪', 'personal', 'identity', 'Regional Transport Office', 240, 500, 1000, '₹5,000 fine for driving with expired DL', '["Current DL", "Address proof", "Medical certificate if 50+"]', 'Apply at RTO or via Parivahan portal', 'individual', 'all', 310),

('DL_RENEWAL_50PLUS', 'DL Renewal (50+ age)', '🪪', 'personal', 'identity', 'Regional Transport Office', 60, 500, 1000, '₹5,000 fine + cannot drive legally', '["Current DL", "Medical fitness certificate"]', 'Apply at RTO with medical certificate', 'individual', 'all', 311),

('VOTER_ID', 'Voter ID Update', '🗳️', 'personal', 'identity', 'Election Commission', 0, 0, 0, 'Cannot vote', '["Current voter ID", "Address proof"]', 'Online via NVSP portal', 'individual', 'all', 320),

('AADHAAR_UPDATE', 'Aadhaar Update', '🔢', 'personal', 'identity', 'UIDAI', 0, 50, 50, 'Service access issues', '["Current Aadhaar", "Supporting documents"]', 'Online via UIDAI or at Aadhaar center', 'individual', 'all', 321),

-- VEHICLE
('RC_RENEWAL', 'Vehicle RC Renewal', '📋', 'vehicle', 'registration', 'Regional Transport Office', 180, 5000, 15000, 'Vehicle seizure + heavy fine', '["Current RC", "Insurance", "PUC", "Address proof"]', 'Apply at RTO before 60 days of expiry', 'vehicle', 'all', 400),

('PUC_CERT', 'PUC Certificate', '🌱', 'vehicle', 'compliance', 'Authorized PUC Center', 12, 80, 150, '₹10,000 fine for driving without valid PUC', '["Vehicle RC"]', 'Visit any authorized PUC center', 'vehicle', 'all', 410),

('PUC_DIESEL', 'PUC Certificate - Diesel', '🌱', 'vehicle', 'compliance', 'Authorized PUC Center', 6, 80, 150, '₹10,000 fine', '["Vehicle RC"]', 'Visit any authorized PUC center. Diesel vehicles need 6-monthly.', 'vehicle', 'all', 411),

('ROAD_TAX', 'Road Tax', '🛣️', 'vehicle', 'tax', 'State Transport Department', 60, 0, 0, 'Vehicle seizure', '["Vehicle RC", "Previous tax receipt"]', 'Pay at RTO or online', 'vehicle', 'all', 420),

('FITNESS_CERT', 'Fitness Certificate (Commercial)', '🚛', 'vehicle', 'compliance', 'Regional Transport Office', 12, 1000, 3000, 'Vehicle cannot ply commercially', '["Vehicle RC", "Insurance", "PUC", "Permit"]', 'Apply at RTO', 'vehicle', 'all', 430),

-- CONTRACTS & AMC
('AMC_AC', 'AC AMC', '❄️', 'contracts', 'amc', 'Service Provider', 12, 2000, 10000, 'No service coverage + breakdown issues', '["Previous AMC", "Equipment details"]', 'Renew with service provider', 'property', 'all', 500),

('AMC_ELEVATOR', 'Elevator AMC', '🛗', 'contracts', 'amc', 'Service Provider', 12, 20000, 100000, 'Safety issues + no service coverage', '["Previous AMC", "License copy"]', 'Renew with authorized service provider', 'property', 'all', 501),

('AMC_FIRE_EQUIPMENT', 'Fire Equipment AMC', '🧯', 'contracts', 'amc', 'Service Provider', 12, 5000, 25000, 'Fire NOC issues + safety risk', '["Equipment list", "Previous AMC"]', 'Renew with authorized provider', 'property', 'all', 502),

('PEST_CONTROL', 'Pest Control Contract', '🐛', 'contracts', 'service', 'Service Provider', 12, 3000, 15000, 'FSSAI compliance issues for food businesses', '["Previous contract"]', 'Renew with service provider', 'property', 'all', 510),

-- SUBSCRIPTIONS
('DOMAIN_RENEWAL', 'Domain Name Renewal', '🌐', 'subscriptions', 'digital', 'Domain Registrar', 12, 500, 2000, 'Website goes offline + domain may be taken', '["Previous registration details"]', 'Renew via registrar portal', 'business', 'all', 600),

('SSL_CERT', 'SSL Certificate', '🔒', 'subscriptions', 'digital', 'Certificate Authority', 12, 1000, 10000, 'Website security warning + SEO impact', '["Previous certificate", "Domain ownership"]', 'Renew via certificate provider', 'business', 'all', 601),

('HOSTING_RENEWAL', 'Web Hosting', '💻', 'subscriptions', 'digital', 'Hosting Provider', 12, 2000, 20000, 'Website goes offline', '["Account details"]', 'Renew via hosting provider', 'business', 'all', 602),

('CLUB_MEMBERSHIP', 'Club Membership', '🎯', 'subscriptions', 'membership', 'Club', 12, 10000, 500000, 'Membership lapse', '["Membership card", "Previous receipt"]', 'Pay at club office', 'individual', 'all', 610),

('GYM_MEMBERSHIP', 'Gym Membership', '🏋️', 'subscriptions', 'membership', 'Gym', 12, 1000, 50000, 'Access denied', '["Membership card"]', 'Renew at gym', 'individual', 'all', 611);


-- ============================================
-- 6. SEED DATA: BUNDLES (Industry Personas)
-- ============================================

INSERT INTO fk_renewal_bundles (code, title, icon, description, hook, preset_codes, sort_order) VALUES

('restaurant', 'Restaurant Owner', '🍽️', 'Food service business compliance', 'Running a restaurant? You need all 5 of these. Miss one = closure risk.', '["FSSAI_STATE", "FIRE_NOC", "GHMC_TRADE", "SHOP_EST_TS", "PEST_CONTROL"]', 1),

('clinic', 'Clinic / Healthcare', '🏥', 'Healthcare facility compliance', 'Healthcare compliance is complex. One lapse = license at risk.', '["MCI_REG", "FIRE_NOC_HOSPITAL", "DRUG_LICENSE", "PCB_CONSENT"]', 2),

('retail_shop', 'Retail Shop Owner', '🏪', 'Retail business compliance', 'Shop owner? These 4 are non-negotiable for staying open.', '["GHMC_TRADE", "SHOP_EST_TS", "FIRE_NOC", "GST_ANNUAL"]', 3),

('property_owner', 'Property Owner', '🏠', 'Property compliance and dues', 'Own property? Missing these means penalties that compound fast.', '["PROPERTY_TAX", "WATER_TAX", "SOCIETY_MAINTENANCE"]', 4),

('ca_professional', 'CA / Finance Professional', '📈', 'Professional compliance', 'Stay compliant to keep signing authority.', '["ICAI_MEMBERSHIP", "GST_ANNUAL", "ROC_ANNUAL", "DIR_KYC"]', 5),

('doctor', 'Doctor / Medical Professional', '👨‍⚕️', 'Medical professional compliance', 'Practice legally. One lapse = cannot treat patients.', '["MCI_REG", "FIRE_NOC", "DRUG_LICENSE"]', 6),

('lawyer', 'Lawyer / Legal Professional', '⚖️', 'Legal professional compliance', 'Keep your enrollment active to appear in courts.', '["BAR_COUNCIL"]', 7),

('vehicle_owner', 'Vehicle Owner', '🚗', 'Vehicle compliance', 'Avoid ₹10,000+ fines and vehicle seizure.', '["PUC_CERT", "DRIVING_LICENSE", "RC_RENEWAL"]', 8),

('it_business', 'IT / Digital Business', '💻', 'Digital business compliance', 'Keep your online presence running without disruption.', '["DOMAIN_RENEWAL", "SSL_CERT", "HOSTING_RENEWAL", "GST_ANNUAL", "SHOP_EST_TS"]', 9),

('manufacturer', 'Manufacturer / Factory', '🏭', 'Manufacturing compliance', 'Heavy penalties and closure risk. Stay compliant.', '["FACTORY_LICENSE", "PCB_CONSENT", "FIRE_NOC", "GST_ANNUAL"]', 10),

('school', 'School / Educational Institution', '🏫', 'Educational institution compliance', 'Avoid affiliation issues and closure notices.', '["FIRE_NOC_SCHOOL", "SCHOOL_RECOGNITION", "PROPERTY_TAX"]', 11),

('individual', 'Individual / Family', '👨‍👩‍👧', 'Personal document tracking', 'Don''t let important documents expire.', '["PASSPORT", "DRIVING_LICENSE", "PUC_CERT", "PROPERTY_TAX"]', 12);


-- ============================================
-- 7. SEED DATA: STORIES (Penalty Stories)
-- ============================================

INSERT INTO fk_renewal_stories (quote, consequence, source, preset_code, category, icon, sort_order) VALUES

('My restaurant was sealed for 3 days during peak season.', 'Lost ₹2 lakhs in revenue + reputation damage', 'Restaurant owner, Hyderabad', 'FSSAI_STATE', 'business', '🍽️', 1),

('Fire department came for surprise inspection. No valid NOC.', '₹50,000 fine + 7-day closure notice', 'Shop owner, Bangalore', 'FIRE_NOC', 'business', '🔥', 2),

('Forgot to renew trade license. GHMC sealed my shop.', '₹25,000 penalty + 2 weeks to reopen', 'Retail store owner, Hyderabad', 'GHMC_TRADE', 'business', '🏪', 3),

('Drove with expired DL. Traffic police caught me.', '₹5,000 fine + court appearance', 'IT Professional, Pune', 'DRIVING_LICENSE', 'personal', '🚗', 4),

('Property tax penalty compounded for 2 years.', 'Paid ₹48,000 extra in penalties alone', 'Property owner, Mumbai', 'PROPERTY_TAX', 'property', '🏠', 5),

('My CA membership lapsed. Couldn''t sign audit reports.', 'Lost 3 clients + professional embarrassment', 'Chartered Accountant, Delhi', 'ICAI_MEMBERSHIP', 'professional', '📈', 6),

('PUC expired. Vehicle seized during checking.', '₹10,000 fine + half day wasted at RTO', 'Business owner, Chennai', 'PUC_CERT', 'vehicle', '🌱', 7),

('Medical council registration expired. Patient complained.', 'Legal notice + practice suspended for 2 months', 'Doctor, Hyderabad', 'MCI_REG', 'professional', '⚕️', 8),

('Domain expired. Competitor bought it.', 'Lost brand identity + ₹5 lakhs to buy back', 'Startup founder, Bangalore', 'DOMAIN_RENEWAL', 'subscriptions', '🌐', 9),

('GST return filed 3 months late.', '₹15,000 in late fees + interest', 'Business owner, Hyderabad', 'GST_ANNUAL', 'business', '📊', 10);


-- ============================================
-- 8. RLS POLICIES FOR NEW TABLES
-- ============================================

-- Presets are public read (master data)
ALTER TABLE fk_renewal_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read presets" ON fk_renewal_presets FOR SELECT USING (true);

-- Bundles are public read (master data)
ALTER TABLE fk_renewal_bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read bundles" ON fk_renewal_bundles FOR SELECT USING (true);

-- Stories are public read (master data)
ALTER TABLE fk_renewal_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read stories" ON fk_renewal_stories FOR SELECT USING (true);
