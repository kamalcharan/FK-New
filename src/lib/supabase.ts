// src/lib/supabase.ts
import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

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

// Google Sign-in using Supabase OAuth
// This uses Supabase as the OAuth intermediary, avoiding exp:// redirect issues
export const signInWithGoogle = async (): Promise<{
  user: any;
  session: any;
} | null> => {
  if (!supabase) {
    console.warn('Supabase not configured');
    return null;
  }

  try {
    // Get the redirect URL that will come back to our app
    // For Expo Go, this will be exp://... but Supabase handles the OAuth with Google
    // Google only sees Supabase's URL, then Supabase redirects to our app
    const redirectUrl = Linking.createURL('auth/callback');
    console.log('[SupabaseGoogleAuth] Redirect URL:', redirectUrl);

    // Start OAuth flow - this gets the authorization URL from Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true, // We'll handle the browser ourselves
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('[SupabaseGoogleAuth] OAuth error:', error);
      throw error;
    }

    if (!data?.url) {
      throw new Error('No OAuth URL returned from Supabase');
    }

    console.log('[SupabaseGoogleAuth] Opening auth URL...');

    // Open browser for authentication
    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectUrl,
      {
        showInRecents: true,
      }
    );

    console.log('[SupabaseGoogleAuth] Browser result type:', result.type);

    if (result.type === 'success' && result.url) {
      console.log('[SupabaseGoogleAuth] Success URL:', result.url);

      // Explicitly dismiss the browser to ensure it closes
      try {
        await WebBrowser.dismissBrowser();
      } catch (dismissError) {
        console.log('[SupabaseGoogleAuth] Browser dismiss (may already be closed):', dismissError);
      }

      // Extract the tokens/session from the URL
      // Supabase returns access_token and refresh_token as URL fragments
      const url = new URL(result.url);

      // Check for hash fragments (Supabase returns tokens in hash)
      const hashParams = new URLSearchParams(url.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      // Also check query params as fallback
      const queryParams = new URLSearchParams(url.search);
      const code = queryParams.get('code');
      const errorParam = queryParams.get('error');
      const errorDescription = queryParams.get('error_description');

      if (errorParam) {
        throw new Error(errorDescription || errorParam);
      }

      if (accessToken) {
        // Set the session directly using the tokens
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (sessionError) {
          console.error('[SupabaseGoogleAuth] Session error:', sessionError);
          throw sessionError;
        }

        console.log('[SupabaseGoogleAuth] Session established successfully');
        return {
          user: sessionData.user,
          session: sessionData.session,
        };
      } else if (code) {
        // If we got a code, exchange it for session
        const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

        if (sessionError) {
          console.error('[SupabaseGoogleAuth] Code exchange error:', sessionError);
          throw sessionError;
        }

        console.log('[SupabaseGoogleAuth] Code exchanged successfully');
        return {
          user: sessionData.user,
          session: sessionData.session,
        };
      } else {
        console.error('[SupabaseGoogleAuth] No tokens or code in response');
        throw new Error('No authentication data received');
      }
    } else if (result.type === 'cancel' || result.type === 'dismiss') {
      console.log('[SupabaseGoogleAuth] User cancelled');
      // Ensure browser is dismissed even on cancel
      try {
        await WebBrowser.dismissBrowser();
      } catch (dismissError) {
        // Ignore - browser may already be closed
      }
      return null;
    } else {
      console.error('[SupabaseGoogleAuth] Unexpected result:', result);
      // Ensure browser is dismissed on error
      try {
        await WebBrowser.dismissBrowser();
      } catch (dismissError) {
        // Ignore - browser may already be closed
      }
      throw new Error('Authentication failed');
    }
  } catch (err: any) {
    console.error('[SupabaseGoogleAuth] Error:', err);
    // Ensure browser is dismissed on error
    try {
      await WebBrowser.dismissBrowser();
    } catch (dismissError) {
      // Ignore - browser may already be closed
    }
    throw err;
  }
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

export const getLoanById = async (loanId: string) => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('fk_loans')
    .select('*')
    .eq('id', loanId)
    .single();

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
  currency?: string;
  is_historical?: boolean;
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

export interface InsuranceTypeWithSubtypes {
  type_code: string;
  type_name: string;
  type_icon: string;
  subtypes: {
    code: string;
    name: string;
    icon: string;
    description: string;
  }[];
}

export interface InsurancePolicyWithMembers {
  id: string;
  workspace_id: string;
  policy_type: string;
  subtype: string | null;
  subtype_name: string;
  subtype_icon: string;
  policy_number: string | null;
  provider_name: string;
  scheme_name: string | null;
  sum_insured: number | null;
  premium_amount: number | null;
  premium_frequency: string | null;
  start_date: string | null;
  expiry_date: string;
  status: string;
  document_url: string | null;
  tpa_name: string | null;
  tpa_helpline: string | null;
  agent_name: string | null;
  agent_phone: string | null;
  notes: string | null;
  metadata: Record<string, any> | null;
  is_demo: boolean;
  created_at: string;
  days_until_expiry: number;
  covered_members: {
    id: string;
    member_id: string | null;
    invite_id: string | null;
    custom_name: string | null;
    relationship_label: string | null;
    relationship_icon: string | null;
    full_name: string;
    is_joined: boolean;
    is_pending: boolean;
    is_external: boolean;
  }[];
}

// Get all insurance types with their subtypes
export const getInsuranceTypesWithSubtypes = async (): Promise<InsuranceTypeWithSubtypes[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase.rpc('get_insurance_types_with_subtypes');

  if (error) throw error;
  return data || [];
};

// Get insurance policies with covered members (uses new RPC function)
export const getInsurancePoliciesWithMembers = async (workspaceId: string): Promise<InsurancePolicyWithMembers[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase.rpc('get_insurance_policies_with_members', {
    p_workspace_id: workspaceId,
  });

  if (error) throw error;
  return data || [];
};

// Legacy function - keep for backward compatibility
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

// Create insurance policy with covered members
export const createInsurancePolicyWithMembers = async (
  policy: {
    workspace_id: string;
    created_by: string;
    policy_type: string;
    subtype?: string;
    policy_number?: string;
    provider_name: string;
    scheme_name?: string;
    premium_amount?: number;
    premium_frequency?: string;
    sum_insured?: number;
    start_date?: string;
    expiry_date: string;
    tpa_name?: string;
    tpa_helpline?: string;
    agent_name?: string;
    agent_phone?: string;
    notes?: string;
    metadata?: Record<string, any>;
  },
  coveredMembers: {
    member_id?: string;
    invite_id?: string;
    custom_name?: string;
    relationship_label?: string;
    relationship_icon?: string;
  }[]
) => {
  if (!supabase) throw new Error('Supabase not configured');

  // Create the policy first
  const { data: policyData, error: policyError } = await supabase
    .from('fk_insurance_policies')
    .insert(policy)
    .select()
    .single();

  if (policyError) throw policyError;

  // Add covered members if any
  if (coveredMembers.length > 0 && policyData) {
    const membersToInsert = coveredMembers.map(member => ({
      policy_id: policyData.id,
      member_id: member.member_id || null,
      invite_id: member.invite_id || null,
      custom_name: member.custom_name || null,
      relationship_label: member.relationship_label || null,
      relationship_icon: member.relationship_icon || null,
    }));

    const { error: membersError } = await supabase
      .from('fk_policy_covered_members')
      .insert(membersToInsert);

    if (membersError) {
      // Rollback: delete the policy if members insertion fails
      await supabase.from('fk_insurance_policies').delete().eq('id', policyData.id);
      throw membersError;
    }
  }

  return policyData;
};

// Legacy function - keep for backward compatibility
export const createInsurancePolicy = async (policy: {
  workspace_id: string;
  created_by: string;
  policy_type: string;
  policy_number?: string;
  provider_name: string;
  insured_name?: string;
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

// Update insurance policy
export const updateInsurancePolicy = async (
  policyId: string,
  updates: Partial<{
    policy_type: string;
    subtype: string;
    policy_number: string;
    provider_name: string;
    scheme_name: string;
    premium_amount: number;
    premium_frequency: string;
    sum_insured: number;
    start_date: string;
    expiry_date: string;
    status: string;
    tpa_name: string;
    tpa_helpline: string;
    agent_name: string;
    agent_phone: string;
    notes: string;
    document_url: string;
    metadata: Record<string, any>;
  }>
) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('fk_insurance_policies')
    .update(updates)
    .eq('id', policyId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Delete insurance policy
export const deleteInsurancePolicy = async (policyId: string) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { error } = await supabase
    .from('fk_insurance_policies')
    .delete()
    .eq('id', policyId);

  if (error) throw error;
  return { success: true };
};

// Add covered member to policy
export const addPolicyCoveredMember = async (
  policyId: string,
  member: {
    member_id?: string;
    invite_id?: string;
    custom_name?: string;
    relationship_label?: string;
    relationship_icon?: string;
  }
) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('fk_policy_covered_members')
    .insert({
      policy_id: policyId,
      member_id: member.member_id || null,
      invite_id: member.invite_id || null,
      custom_name: member.custom_name || null,
      relationship_label: member.relationship_label || null,
      relationship_icon: member.relationship_icon || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Remove covered member from policy
export const removePolicyCoveredMember = async (coveredMemberId: string) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { error } = await supabase
    .from('fk_policy_covered_members')
    .delete()
    .eq('id', coveredMemberId);

  if (error) throw error;
  return { success: true };
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
  title: string;
  expiry_date: string;
  renewal_type?: string;
  category?: string;
  subcategory?: string;
  authority_name?: string;
  reference_number?: string;
  property_address?: string;
  fee_amount?: number;
  issue_date?: string;
  frequency_months?: number;
  preset_code?: string;
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

export const getRenewalById = async (renewalId: string) => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('fk_renewals')
    .select('*')
    .eq('id', renewalId)
    .single();

  if (error) throw error;
  return data;
};

export const updateRenewal = async (
  renewalId: string,
  updates: {
    title?: string;
    authority_name?: string;
    reference_number?: string;
    property_address?: string;
    fee_amount?: number;
    issue_date?: string;
    expiry_date?: string;
    status?: 'active' | 'renewed' | 'expired';
    notes?: string;
    category?: string;
    subcategory?: string;
    frequency_months?: number;
  }
) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('fk_renewals')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', renewalId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteRenewal = async (renewalId: string) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { error } = await supabase
    .from('fk_renewals')
    .delete()
    .eq('id', renewalId);

  if (error) throw error;
  return { success: true };
};

export const markRenewalAsRenewed = async (
  renewalId: string,
  newExpiryDate: string,
  newReferenceNumber?: string,
  costPaid?: number,
  notes?: string
) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('fk_renewals')
    .update({
      expiry_date: newExpiryDate,
      reference_number: newReferenceNumber,
      fee_amount: costPaid,
      notes: notes,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', renewalId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ============================================
// Renewal Master Data Functions
// ============================================

export interface RenewalPreset {
  id: string;
  code: string;
  title: string;
  icon: string | null;
  category: string;
  subcategory: string | null;
  authority_template: string | null;
  frequency_months: number | null;
  cost_range_min: number | null;
  cost_range_max: number | null;
  penalty_info: string | null;
  documents_required: string[];
  renewal_process: string | null;
  applicable_to: string;
  state_specific: string;
  sort_order: number;
}

export interface RenewalBundle {
  id: string;
  code: string;
  title: string;
  icon: string | null;
  description: string | null;
  hook: string | null;
  preset_codes: string[];
  sort_order: number;
}

export interface RenewalStory {
  id: string;
  quote: string;
  consequence: string | null;
  source: string | null;
  preset_code: string | null;
  category: string | null;
  icon: string | null;
  sort_order: number;
}

export const getRenewalPresets = async (options?: {
  category?: string;
  state?: string;
}): Promise<RenewalPreset[]> => {
  if (!supabase) return [];

  let query = supabase
    .from('fk_renewal_presets')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (options?.category) {
    query = query.eq('category', options.category);
  }

  if (options?.state && options.state !== 'all') {
    query = query.or(`state_specific.eq.${options.state},state_specific.eq.all`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
};

export const getRenewalPresetByCode = async (code: string): Promise<RenewalPreset | null> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('fk_renewal_presets')
    .select('*')
    .eq('code', code)
    .single();

  if (error) return null;
  return data;
};

export const getRenewalBundles = async (): Promise<RenewalBundle[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('fk_renewal_bundles')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const getRenewalBundleByCode = async (code: string): Promise<RenewalBundle | null> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('fk_renewal_bundles')
    .select('*')
    .eq('code', code)
    .single();

  if (error) return null;
  return data;
};

export const getRenewalStories = async (): Promise<RenewalStory[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('fk_renewal_stories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const searchRenewalPresets = async (searchTerm: string): Promise<RenewalPreset[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('fk_renewal_presets')
    .select('*')
    .eq('is_active', true)
    .or(`title.ilike.%${searchTerm}%,authority_template.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
    .order('sort_order', { ascending: true })
    .limit(10);

  if (error) throw error;
  return data || [];
};

export const getPresetsByCategory = async (): Promise<Record<string, RenewalPreset[]>> => {
  if (!supabase) return {};

  const presets = await getRenewalPresets();

  return presets.reduce((acc, preset) => {
    if (!acc[preset.category]) {
      acc[preset.category] = [];
    }
    acc[preset.category].push(preset);
    return acc;
  }, {} as Record<string, RenewalPreset[]>);
};

// ============================================
// Renewal Interest Tracking Functions
// ============================================

export type InteractionType = 'search' | 'view' | 'bundle_view' | 'suggestion_view';

export interface RenewalInterest {
  id: string;
  workspace_id: string;
  user_id: string;
  preset_code: string;
  category: string;
  interaction_type: InteractionType;
  converted: boolean;
  converted_at: string | null;
  source_bundle_code: string | null;
  created_at: string;
}

export const trackRenewalInterest = async (
  workspaceId: string,
  userId: string,
  presetCode: string,
  category: string,
  interactionType: InteractionType,
  sourceBundleCode?: string
): Promise<void> => {
  if (!supabase) return;

  try {
    await supabase.from('fk_renewal_interests').insert({
      workspace_id: workspaceId,
      user_id: userId,
      preset_code: presetCode,
      category: category,
      interaction_type: interactionType,
      source_bundle_code: sourceBundleCode || null,
    });
  } catch (error) {
    // Silently fail - interest tracking is not critical
    console.warn('Failed to track renewal interest:', error);
  }
};

export const markInterestConverted = async (
  workspaceId: string,
  presetCode: string
): Promise<void> => {
  if (!supabase) return;

  try {
    await supabase.rpc('mark_interest_converted', {
      p_workspace_id: workspaceId,
      p_preset_code: presetCode,
    });
  } catch (error) {
    console.warn('Failed to mark interest as converted:', error);
  }
};

export const getUnconvertedInterests = async (
  workspaceId: string
): Promise<{ preset_code: string; category: string; interaction_count: number }[]> => {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase.rpc('get_unconverted_interests', {
      p_workspace_id: workspaceId,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn('Failed to get unconverted interests:', error);
    return [];
  }
};

export const getSameCategoryPresets = async (
  category: string,
  excludeCode: string
): Promise<RenewalPreset[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('fk_renewal_presets')
    .select('*')
    .eq('category', category)
    .eq('is_active', true)
    .neq('code', excludeCode)
    .order('sort_order', { ascending: true })
    .limit(5);

  if (error) return [];
  return data || [];
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

// Update user profile
export const updateUserProfile = async (
  userId: string,
  updates: {
    full_name?: string;
    phone?: string;
    country_code?: string;
    avatar_url?: string;
  }
) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('fk_user_profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Update onboarding context in profile metadata (merge, not replace)
export const updateOnboardingContext = async (
  userId: string,
  context: Record<string, any>
) => {
  if (!supabase) throw new Error('Supabase not configured');

  // Read current metadata first, then merge
  const { data: profile, error: readError } = await supabase
    .from('fk_user_profiles')
    .select('metadata')
    .eq('user_id', userId)
    .single();

  if (readError && readError.code !== 'PGRST116') throw readError;

  const existingMetadata = profile?.metadata || {};
  const updatedMetadata = {
    ...existingMetadata,
    onboarding: {
      ...(existingMetadata.onboarding || {}),
      ...context,
    },
  };

  const { data, error } = await supabase
    .from('fk_user_profiles')
    .update({ metadata: updatedMetadata })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Get onboarding context from profile metadata
export const getOnboardingContext = async (
  userId: string
): Promise<{ pain_point?: string; industry?: string } | null> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('fk_user_profiles')
    .select('metadata')
    .eq('user_id', userId)
    .single();

  if (error) return null;
  return data?.metadata?.onboarding || null;
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

// ============================================
// Loan Verification Functions
// ============================================

export interface LoanVerificationResult {
  success: boolean;
  verification_code: string | null;
  shareable_message: string | null;
  error_message: string | null;
}

export const createLoanVerification = async (
  loanId: string,
  userId: string
): Promise<LoanVerificationResult> => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase.rpc('create_loan_verification', {
    p_loan_id: loanId,
    p_user_id: userId,
  });

  if (error) throw error;
  return data?.[0] || { success: false, verification_code: null, shareable_message: null, error_message: 'Unknown error' };
};

export interface VerifyLoanResult {
  success: boolean;
  loan_type: string | null;
  amount: number | null;
  loan_date: string | null;
  lender_name: string | null;
  handshake_date: string | null;
  error_message: string | null;
}

export const verifyLoanByCode = async (
  code: string,
  name: string,
  phone: string
): Promise<VerifyLoanResult> => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase.rpc('verify_loan_by_code', {
    p_code: code,
    p_name: name,
    p_phone: phone,
  });

  if (error) throw error;
  return data?.[0] || { success: false, loan_type: null, amount: null, loan_date: null, lender_name: null, handshake_date: null, error_message: 'Unknown error' };
};

export interface LoanVerificationDetails {
  verification_status: string;
  verification_code: string | null;
  code_expires_at: string | null;
  verified_by_name: string | null;
  verified_by_phone: string | null;
  verified_at: string | null;
}

export const getLoanVerificationDetails = async (loanId: string): Promise<LoanVerificationDetails | null> => {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('get_loan_verification_details', {
    p_loan_id: loanId,
  });

  if (error) throw error;
  return data?.[0] || null;
};
