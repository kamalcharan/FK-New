import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// Environment variables - replace with your Supabase project credentials
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Custom storage adapter using expo-secure-store for secure token storage
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('SecureStore setItem error:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('SecureStore removeItem error:', error);
    }
  },
};

// Create Supabase client with secure storage
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ============================================
// Auth Helper Functions
// ============================================

export const signInWithGoogle = async () => {
  // This will be implemented with expo-auth-session
  // For now, return a placeholder
  throw new Error('Google Sign-in not yet implemented');
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const getCurrentSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

// ============================================
// Workspace Functions
// ============================================

export const createWorkspace = async (name: string, userId: string) => {
  const { data, error } = await supabase
    .from('workspaces')
    .insert({ name, created_by: userId })
    .select()
    .single();

  if (error) throw error;

  // Add creator as owner
  await supabase
    .from('workspace_members')
    .insert({ workspace_id: data.id, user_id: userId, role: 'owner' });

  return data;
};

export const getWorkspaceForUser = async (userId: string): Promise<{
  id: string;
  name: string;
  created_by: string;
  created_at: string;
} | null> => {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces(id, name, created_by, created_at)')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

  // Supabase returns the joined table as an object (not array) when using single()
  const workspace = data?.workspaces as unknown as {
    id: string;
    name: string;
    created_by: string;
    created_at: string;
  } | null;

  return workspace || null;
};

export const getWorkspaceMembers = async (workspaceId: string) => {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('*, user:auth.users(id, email, raw_user_meta_data)')
    .eq('workspace_id', workspaceId);

  if (error) throw error;
  return data;
};

// ============================================
// Loan Functions
// ============================================

export const getLoans = async (workspaceId: string) => {
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const createLoan = async (loan: {
  workspace_id: string;
  created_by: string;
  amount: number;
  borrower_name: string;
  borrower_phone: string;
  return_date?: string;
  notes?: string;
}) => {
  const { data, error } = await supabase
    .from('loans')
    .insert(loan)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateLoan = async (id: string, updates: Partial<{
  otp_verified: boolean;
  verified_at: string;
  status: string;
  return_date: string;
  notes: string;
}>) => {
  const { data, error } = await supabase
    .from('loans')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ============================================
// Vault Item Functions (Insurance & Renewals)
// ============================================

export const getVaultItems = async (workspaceId: string, category?: 'insurance' | 'renewal') => {
  let query = supabase
    .from('vault_items')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('expiry_date', { ascending: true });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const createVaultItem = async (item: {
  workspace_id: string;
  category: 'insurance' | 'renewal';
  type: string;
  provider_or_authority?: string;
  policy_or_license_num?: string;
  expiry_date: string;
  premium_or_fee?: number;
  reminder_days?: number;
  document_url?: string;
}) => {
  const { data, error } = await supabase
    .from('vault_items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateVaultItem = async (id: string, updates: Partial<{
  provider_or_authority: string;
  policy_or_license_num: string;
  expiry_date: string;
  premium_or_fee: number;
  reminder_days: number;
  document_url: string;
}>) => {
  const { data, error } = await supabase
    .from('vault_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteVaultItem = async (id: string) => {
  const { error } = await supabase
    .from('vault_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
