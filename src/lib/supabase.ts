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
