// app/index.tsx
import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAppSelector, useAppDispatch } from '../src/hooks/useStore';
import { setLoading, setUser, setSession } from '../src/store/slices/authSlice';
import { setWorkspace } from '../src/store/slices/workspaceSlice';
import { supabase, getWorkspaceForUser, isSupabaseReady } from '../src/lib/supabase';
import { Colors } from '../src/constants/theme';

export default function Index() {
  const dispatch = useAppDispatch();
  const { isLoading, isAuthenticated } = useAppSelector(state => state.auth);
  const { currentWorkspace } = useAppSelector(state => state.workspace);

  useEffect(() => {
    // If Supabase is not configured, skip auth check
    if (!isSupabaseReady() || !supabase) {
      dispatch(setLoading(false));
      return;
    }

    checkAuthState();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        dispatch(setUser({
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name,
          avatar_url: session.user.user_metadata?.avatar_url,
          created_at: session.user.created_at,
        }));
        dispatch(setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at || 0,
          user: {
            id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name,
            avatar_url: session.user.user_metadata?.avatar_url,
            created_at: session.user.created_at,
          },
        }));

        // Check for workspace
        const workspace = await getWorkspaceForUser(session.user.id);
        if (workspace) {
          dispatch(setWorkspace(workspace));
        }
      } else {
        dispatch(setUser(null));
        dispatch(setSession(null));
        dispatch(setWorkspace(null));
      }
      dispatch(setLoading(false));
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuthState = async () => {
    if (!supabase) {
      dispatch(setLoading(false));
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        dispatch(setUser({
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name,
          avatar_url: session.user.user_metadata?.avatar_url,
          created_at: session.user.created_at,
        }));

        // Check for workspace
        const workspace = await getWorkspaceForUser(session.user.id);
        if (workspace) {
          dispatch(setWorkspace(workspace));
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      dispatch(setLoading(false));
    }
  };

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Not authenticated - go to auth flow
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  // Authenticated but no workspace - go to workspace setup
  if (!currentWorkspace) {
    return <Redirect href="/(auth)/workspace-setup" />;
  }

  // Fully authenticated with workspace - go to main app
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
