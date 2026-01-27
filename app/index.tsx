// app/index.tsx
// Entry point - handles initial routing based on auth state
// Note: After Google OAuth, sign-in/sign-up screens handle navigation directly
import { useEffect, useState, useRef } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAppSelector, useAppDispatch } from '../src/hooks/useStore';
import { setLoading, setUser, setSession } from '../src/store/slices/authSlice';
import { setWorkspace } from '../src/store/slices/workspaceSlice';
import { supabase, getWorkspaceForUser, isSupabaseReady, getUserProfile } from '../src/lib/supabase';
import { Colors } from '../src/constants/theme';

export default function Index() {
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector(state => state.auth);
  const [hasRouted, setHasRouted] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    // If Supabase is not configured, go to onboarding (demo mode)
    if (!isSupabaseReady() || !supabase) {
      dispatch(setLoading(false));
      if (!hasRouted) {
        setHasRouted(true);
        router.replace('/(auth)/onboarding');
      }
      return;
    }

    checkAuthAndRoute();
  }, []);

  const checkAuthAndRoute = async () => {
    if (!supabase || hasRouted) return;

    try {
      console.log('[Index] Checking auth state...');
      const { data: { session } } = await supabase.auth.getSession();

      if (!isMounted.current) return;

      if (session?.user) {
        console.log('[Index] User authenticated:', session.user.id);

        // Update Redux state
        dispatch(setUser({
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name,
          avatar_url: session.user.user_metadata?.avatar_url,
          created_at: session.user.created_at,
        }));

        // Check workspace and profile
        const [workspace, profile] = await Promise.all([
          getWorkspaceForUser(session.user.id),
          getUserProfile(session.user.id),
        ]);

        if (!isMounted.current) return;

        if (workspace) {
          dispatch(setWorkspace(workspace));
        }

        // Route based on state
        setHasRouted(true);
        dispatch(setLoading(false));

        if (!workspace) {
          console.log('[Index] No workspace, going to profile setup');
          router.replace('/(auth)/profile-setup');
        } else if (!profile?.onboarding_completed) {
          console.log('[Index] Onboarding incomplete, going to family-invite');
          router.replace({
            pathname: '/(auth)/family-invite',
            params: { workspaceName: workspace.name, workspaceId: workspace.id },
          });
        } else {
          console.log('[Index] Fully onboarded, going to tabs');
          router.replace('/(tabs)');
        }
      } else {
        console.log('[Index] No session, going to onboarding');
        setHasRouted(true);
        dispatch(setLoading(false));
        router.replace('/(auth)/onboarding');
      }
    } catch (error) {
      console.error('[Index] Auth check error:', error);
      if (isMounted.current) {
        setHasRouted(true);
        dispatch(setLoading(false));
        router.replace('/(auth)/onboarding');
      }
    }
  };

  // Always show loading spinner on index - routing happens in useEffect
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
