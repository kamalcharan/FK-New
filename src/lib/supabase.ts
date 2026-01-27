// src/lib/supabase.ts
import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Environment variables - replace with your Supabase project credentials
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
const isSupabaseConfigured = SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length > 0;

// Create Supabase client only if configured
// Banking-style auth: no session persistence, always require login
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: false,    // Don't auto-refresh since we don't persist
        persistSession: false,      // Don't persist session - always require login
        detectSessionInUrl: false,
      },
    })
  : null;

// Helper to check if Supabase is ready
export const isSupabaseReady = () => isSupabaseConfigured && supabase !== null;

// ============================================
// Auth Helper Functions
// ============================================

// Sign up with email and password
export const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) throw error;

  // Note: fk_users record is created automatically by database trigger
  // See: supabase/migrations/004_auto_create_fk_users.sql

  return data;
};

// Sign up with phone (creates pseudo-email for Supabase auth)
export const signUpWithPhone = async (phone: string, password: string, fullName?: string) => {
  if (!supabase) throw new Error('Supabase not configured');

  // Supabase auth uses email, so we create a pseudo-email from phone
  const phoneEmail = `91${phone.replace(/\D/g, '')}@fk.local`;

  const { data, error } = await supabase.auth.signUp({
    email: phoneEmail,
    password,
    options: {
      data: {
        full_name: fullName,
        phone: phone,
      },
    },
  });

  if (error) throw error;

  // Note: fk_users record is created automatically by database trigger
  // See: supabase/migrations/004_auto_create_fk_users.sql

  return data;
};

// Sign in with email/phone and password
export const signInWithPassword = async (identifier: string, password: string) => {
  if (!supabase) throw new Error('Supabase not configured');

  // Determine if identifier is email or phone
  const isEmail = identifier.includes('@');
  const authEmail = isEmail
    ? identifier
    : `91${identifier.replace(/\D/g, '')}@fk.local`;

  const { data, error } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password,
  });

  if (error) throw error;
  return data;
};

export const signInWithGoogle = async () => {
  if (!supabase) {
    console.warn('Supabase not configured');
    return null;
  }
  // This will be implemented with expo-auth-session
  throw new Error('Google Sign-in not yet implemented');
};

export const signOut = async () => {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  if (!supabase) return null;
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const getCurrentSession = async () => {
  if (!supabase) return null;
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

// ============================================
// Workspace Functions
// ============================================

export const createWorkspace = async (name: string, userId: string) => {
  if (!supabase) throw new Error('Supabase not configured');

  // Create workspace - trigger will auto-add owner as member
  const { data, error } = await supabase
    .from('fk_workspaces')
    .insert({
      name,
      owner_id: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getWorkspaceForUser = async (userId: string): Promise<{
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
} | null> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('fk_workspace_members')
    .select(`
      workspace_id,
      role,
      workspace:fk_workspaces(id, name, owner_id, created_at)
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

  // Supabase returns the joined table as an object when using single()
  const workspace = data?.workspace as unknown as {
    id: string;
    name: string;
    owner_id: string;
    created_at: string;
  } | null;

  return workspace || null;
};

export const getWorkspaceMembers = async (workspaceId: string) => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('fk_workspace_members')
    .select(`
      id,
      role,
      joined_at,
      user:fk_users(id, email, phone)
    `)
    .eq('workspace_id', workspaceId)
    .eq('is_active', true);

  if (error) throw error;
  return data;
};

export const joinWorkspaceByCode = async (inviteCode: string, userId: string) => {
  if (!supabase) throw new Error('Supabase not configured');

  // Find workspace by invite code
  const { data: workspace, error: findError } = await supabase
    .from('fk_workspaces')
    .select('id, name, invite_expires_at')
    .eq('invite_code', inviteCode)
    .eq('is_active', true)
    .single();

  if (findError || !workspace) {
    throw new Error('Invalid invite code');
  }

  // Check if invite has expired
  if (workspace.invite_expires_at && new Date(workspace.invite_expires_at) < new Date()) {
    throw new Error('Invite code has expired');
  }

  // Add user as member
  const { error: joinError } = await supabase
    .from('fk_workspace_members')
    .insert({
      workspace_id: workspace.id,
      user_id: userId,
      role: 'member',
      joined_at: new Date().toISOString(),
    });

  if (joinError) {
    if (joinError.message.includes('duplicate')) {
      throw new Error('You are already a member of this workspace');
    }
    throw joinError;
  }

  return workspace;
};

// ============================================
// Loan Functions
// ============================================

export const getLoans = async (workspaceId: string) => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('fk_loans')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const createLoan = async (loan: {
  workspace_id: string;
  created_by: string;
  loan_type: 'given' | 'taken';
  counterparty_name: string;
  counterparty_phone?: string;
  principal_amount: number;
  loan_date: string;
  due_date?: string;
  purpose?: string;
  notes?: string;
}) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('fk_loans')
    .insert(loan)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateLoan = async (id: string, updates: Partial<{
  verification_status: string;
  verified_at: string;
  status: string;
  due_date: string;
  amount_repaid: number;
  notes: string;
}>) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('fk_loans')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ============================================
// Insurance Policy Functions
// ============================================

export const getInsurancePolicies = async (workspaceId: string) => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('fk_insurance_policies')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('expiry_date', { ascending: true });

  if (error) throw error;
  return data;
};

export const createInsurancePolicy = async (policy: {
  workspace_id: string;
  created_by: string;
  policy_type: string;
  policy_number?: string;
  provider_name: string;
  insured_name: string;
  insured_relation?: string;
  premium_amount?: number;
  sum_insured?: number;
  start_date?: string;
  expiry_date: string;
  agent_name?: string;
  agent_phone?: string;
  notes?: string;
}) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('fk_insurance_policies')
    .insert(policy)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ============================================
// Renewal Functions
// ============================================

export const getRenewals = async (workspaceId: string) => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('fk_renewals')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('expiry_date', { ascending: true });

  if (error) throw error;
  return data;
};

export const createRenewal = async (renewal: {
  workspace_id: string;
  created_by: string;
  renewal_type: string;
  title: string;
  authority_name?: string;
  reference_number?: string;
  property_address?: string;
  fee_amount?: number;
  issue_date?: string;
  expiry_date: string;
  notes?: string;
}) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('fk_renewals')
    .insert(renewal)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ============================================
// Family Invite Functions
// ============================================

export const createFamilyInvite = async (
  workspaceId: string,
  invitedBy: string,
  relationshipCode: string,
  inviteeName?: string,
  phone?: string,
  email?: string
): Promise<{ invite_id: string; invite_code: string; invite_message: string } | null> => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase.rpc('create_family_invite', {
    p_workspace_id: workspaceId,
    p_invited_by: invitedBy,
    p_relationship_code: relationshipCode,
    p_invitee_name: inviteeName || null,
    p_phone: phone || null,
    p_email: email || null,
  });

  if (error) throw error;

  // RPC returns array, get first item
  return data?.[0] || null;
};

export const getWorkspaceInvites = async (workspaceId: string) => {
  if (!supabase) return [];

  const { data, error } = await supabase.rpc('get_workspace_invites', {
    p_workspace_id: workspaceId,
  });

  if (error) throw error;
  return data || [];
};

export const acceptFamilyInvite = async (
  inviteCode: string,
  userId: string
): Promise<{ success: boolean; workspace_id: string | null; workspace_name: string | null; error_message: string | null }> => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase.rpc('accept_family_invite', {
    p_invite_code: inviteCode,
    p_user_id: userId,
  });

  if (error) throw error;

  // RPC returns array, get first item
  return data?.[0] || { success: false, workspace_id: null, workspace_name: null, error_message: 'Unknown error' };
};

// ============================================
// User Profile Functions
// ============================================

export const updateOnboardingStatus = async (userId: string, completed: boolean) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { error } = await supabase
    .from('fk_user_profiles')
    .update({
      onboarding_completed: completed,
      onboarding_step: completed ? 99 : 0,
    })
    .eq('user_id', userId);

  if (error) throw error;
};

export const getUserProfile = async (userId: string) => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('fk_user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

// Check if fk_users record exists (needed for foreign key constraints)
export const checkFkUserExists = async (userId: string): Promise<boolean> => {
  if (!supabase) return false;

  const { data, error } = await supabase
    .from('fk_users')
    .select('id')
    .eq('id', userId)
    .single();

  return !error && !!data;
};

export const getRelationships = async (constellationOnly: boolean = false) => {
  if (!supabase) return [];

  let query = supabase
    .from('m_relationships')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (constellationOnly) {
    query = query.eq('is_constellation', true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
};

export interface VerifyInviteResult {
  is_valid: boolean;
  workspace_id: string | null;
  workspace_name: string | null;
  inviter_id: string | null;
  inviter_name: string | null;
  relationship_code: string | null;
  relationship_label: string | null;
  relationship_icon: string | null;
  error_message: string | null;
}

export const verifyInviteCode = async (inviteCode: string): Promise<VerifyInviteResult> => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase.rpc('verify_invite_code', {
    p_invite_code: inviteCode,
  });

  if (error) throw error;

  // RPC returns array, get first item
  return data?.[0] || {
    is_valid: false,
    workspace_id: null,
    workspace_name: null,
    inviter_id: null,
    inviter_name: null,
    relationship_code: null,
    relationship_label: null,
    relationship_icon: null,
    error_message: 'Unknown error',
  };
};

// ============================================
// Workspace Members Management
// ============================================

export interface WorkspaceMember {
  member_id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  relationship_code: string | null;
  relationship_label: string | null;
  relationship_icon: string | null;
  invited_by_id: string | null;
  invited_by_name: string | null;
  joined_at: string;
  is_owner: boolean;
}

export const getWorkspaceMembersWithDetails = async (workspaceId: string): Promise<WorkspaceMember[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase.rpc('get_workspace_members_with_details', {
    p_workspace_id: workspaceId,
  });

  if (error) throw error;
  return data || [];
};

export const removeWorkspaceMember = async (
  workspaceId: string,
  memberUserId: string,
  requestingUserId: string
): Promise<{ success: boolean; error_message: string | null }> => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase.rpc('remove_workspace_member', {
    p_workspace_id: workspaceId,
    p_member_user_id: memberUserId,
    p_requesting_user_id: requestingUserId,
  });

  if (error) throw error;
  return data?.[0] || { success: false, error_message: 'Unknown error' };
};

export const revokeInvite = async (
  inviteId: string,
  requestingUserId: string
): Promise<{ success: boolean; error_message: string | null }> => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase.rpc('revoke_invite', {
    p_invite_id: inviteId,
    p_requesting_user_id: requestingUserId,
  });

  if (error) throw error;
  return data?.[0] || { success: false, error_message: 'Unknown error' };
};

// ============================================
// Dashboard & Demo Mode Functions
// ============================================

export interface DashboardStats {
  total_loans_given: number;
  total_loans_taken: number;
  loans_given_count: number;
  loans_taken_count: number;
  pending_verification: number;
  active_policies: number;
  expiring_soon_policies: number;
  upcoming_renewals: number;
  overdue_renewals: number;
}

export const getDashboardStats = async (workspaceId: string): Promise<DashboardStats | null> => {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('get_dashboard_stats', {
    p_workspace_id: workspaceId,
  });

  if (error) throw error;
  return data?.[0] || null;
};

export const toggleDemoMode = async (
  workspaceId: string,
  userId: string,
  enable: boolean
): Promise<{ success: boolean; message: string }> => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase.rpc('toggle_demo_mode', {
    p_workspace_id: workspaceId,
    p_user_id: userId,
    p_enable: enable,
  });

  if (error) throw error;
  return data?.[0] || { success: false, message: 'Unknown error' };
};

export const isDemoModeEnabled = async (userId: string): Promise<boolean> => {
  if (!supabase) return false;

  const { data, error } = await supabase
    .from('fk_user_profiles')
    .select('demo_mode_enabled')
    .eq('user_id', userId)
    .single();

  if (error) return false;
  return data?.demo_mode_enabled || false;
};

// Get upcoming alerts (policies/renewals expiring soon)
export interface UpcomingAlert {
  id: string;
  type: 'insurance' | 'renewal';
  title: string;
  subtitle: string;
  daysLeft: number;
  expiryDate: string;
}

export const getUpcomingAlerts = async (workspaceId: string): Promise<UpcomingAlert[]> => {
  if (!supabase) return [];

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const [policiesResult, renewalsResult] = await Promise.all([
    supabase
      .from('fk_insurance_policies')
      .select('id, policy_type, provider_name, insured_name, expiry_date')
      .eq('workspace_id', workspaceId)
      .lte('expiry_date', thirtyDaysFromNow.toISOString())
      .gte('expiry_date', new Date().toISOString())
      .order('expiry_date', { ascending: true })
      .limit(5),
    supabase
      .from('fk_renewals')
      .select('id, renewal_type, title, expiry_date')
      .eq('workspace_id', workspaceId)
      .lte('expiry_date', thirtyDaysFromNow.toISOString())
      .order('expiry_date', { ascending: true })
      .limit(5),
  ]);

  const alerts: UpcomingAlert[] = [];

  // Add policy alerts
  for (const policy of policiesResult.data || []) {
    const daysLeft = Math.ceil((new Date(policy.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    alerts.push({
      id: policy.id,
      type: 'insurance',
      title: `${policy.provider_name} - ${policy.insured_name}`,
      subtitle: policy.policy_type,
      daysLeft,
      expiryDate: policy.expiry_date,
    });
  }

  // Add renewal alerts
  for (const renewal of renewalsResult.data || []) {
    const daysLeft = Math.ceil((new Date(renewal.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    alerts.push({
      id: renewal.id,
      type: 'renewal',
      title: renewal.title,
      subtitle: renewal.renewal_type,
      daysLeft,
      expiryDate: renewal.expiry_date,
    });
  }

  // Sort by days left
  return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
};
