// src/types/index.ts
/**
 * FamilyKnows TypeScript Types
 * Based on Supabase database schema
 */

// ============================================
// Database Types (Supabase)
// ============================================

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  // Joined data
  user?: User;
}

export interface Loan {
  id: string;
  workspace_id: string;
  created_by: string;
  amount: number;
  borrower_name: string;
  borrower_phone: string;
  given_date: string;
  return_date?: string;
  otp_verified: boolean;
  verified_at?: string;
  status: LoanStatus;
  notes?: string;
}

export type LoanStatus = 'pending' | 'acknowledged' | 'returned' | 'disputed';

export interface VaultItem {
  id: string;
  workspace_id: string;
  category: 'insurance' | 'renewal';
  type: InsuranceType | RenewalType;
  provider_or_authority?: string;
  policy_or_license_num?: string;
  expiry_date: string;
  premium_or_fee?: number;
  reminder_days: number;
  document_url?: string;
  created_at: string;
}

export type InsuranceType = 'health' | 'vehicle' | 'life' | 'property' | 'other';
export type RenewalType = 'ghmc' | 'fire_noc' | 'fssai' | 'pollution' | 'property_tax' | 'other';

// ============================================
// App State Types
// ============================================

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}

export interface WorkspaceState {
  currentWorkspace: Workspace | null;
  members: WorkspaceMember[];
  isLoading: boolean;
}

export interface LoanState {
  loans: Loan[];
  isLoading: boolean;
}

export interface VaultState {
  items: VaultItem[];
  isLoading: boolean;
}

// ============================================
// UI Types
// ============================================

export type UrgencyLevel = 'overdue' | 'urgent' | 'upcoming' | 'healthy';

export interface UrgencyInfo {
  level: UrgencyLevel;
  daysUntilExpiry: number;
  label: string;
}

export interface DashboardSummary {
  totalLoans: number;
  totalLoanAmount: number;
  verifiedLoans: number;
  totalInsurances: number;
  expiringInsurances: number;
  totalRenewals: number;
  overdueRenewals: number;
}

// ============================================
// Form Types
// ============================================

export interface LoanFormData {
  amount: string;
  borrower_name: string;
  borrower_phone: string;
  return_date?: Date;
  notes?: string;
}

export interface InsuranceFormData {
  type: InsuranceType;
  provider_name: string;
  policy_number: string;
  expiry_date: Date;
  premium_amount?: string;
  reminder_days: number;
  document_uri?: string;
}

export interface RenewalFormData {
  type: RenewalType;
  description?: string;
  issuing_authority: string;
  license_number?: string;
  expiry_date: Date;
  reminder_days: number;
  document_uri?: string;
}

export interface WorkspaceFormData {
  name: string;
}

// ============================================
// Navigation Types (for expo-router)
// ============================================

export type RootStackParamList = {
  '(auth)': undefined;
  '(tabs)': undefined;
};

export type AuthStackParamList = {
  onboarding: undefined;
  'sign-in': undefined;
  'workspace-setup': undefined;
};

export type TabsParamList = {
  index: undefined; // Dashboard
  vault: undefined;
  loans: undefined;
  settings: undefined;
};
