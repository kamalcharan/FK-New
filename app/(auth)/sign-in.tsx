// app/(auth)/sign-in.tsx
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { Colors, Typography, BorderRadius, Spacing } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { signInWithPassword, isSupabaseReady, getWorkspaceForUser, getUserProfile, checkFkUserExists, signInWithGoogle } from '../../src/lib/supabase';
import { showErrorToast, showSuccessToast } from '../../src/components/ToastConfig';
import { useAppDispatch } from '../../src/hooks/useStore';
import { setUser } from '../../src/store/slices/authSlice';
import { setWorkspace } from '../../src/store/slices/workspaceSlice';

// Helper to wait for user records to be created by DB trigger
const waitForUserRecords = async (userId: string, maxAttempts = 10): Promise<boolean> => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const [userExists, profile] = await Promise.all([
        checkFkUserExists(userId),
        getUserProfile(userId),
      ]);
      if (userExists && profile) return true;
    } catch (err) {
      // Ignore errors during retry
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
};

export default function SignInScreen() {
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // Validation
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isFormValid = isEmailValid && password.length >= 8;

  const handleSignIn = async () => {
    if (!isFormValid) return;

    setError('');
    setIsLoading(true);

    try {
      if (!isSupabaseReady()) {
        // Demo mode - skip actual login, go through index for routing
        router.replace('/');
        return;
      }

      const { user, session } = await signInWithPassword(email, password);

      if (user) {
        // Update Redux with user info
        dispatch(setUser({
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name,
          avatar_url: user.user_metadata?.avatar_url,
          created_at: user.created_at,
        }));

        // Fetch workspace and profile to determine navigation
        const [workspace, profile] = await Promise.all([
          getWorkspaceForUser(user.id),
          getUserProfile(user.id),
        ]);

        // Determine where to navigate
        if (!workspace) {
          // No workspace - go to workspace setup
          showSuccessToast('Welcome Back', 'Let\'s set up your vault');
          router.replace('/(auth)/workspace-setup');
        } else if (!profile?.onboarding_completed) {
          // Has workspace but onboarding not complete - go to family invite
          dispatch(setWorkspace(workspace));
          showSuccessToast('Welcome Back', 'Continue setting up your vault');
          router.replace({
            pathname: '/(auth)/family-invite',
            params: {
              workspaceName: workspace.name,
              workspaceId: workspace.id,
            },
          });
        } else {
          // Fully set up - go to main app
          dispatch(setWorkspace(workspace));
          showSuccessToast('Welcome Back', 'Signed in successfully');
          router.replace('/(tabs)');
        }
      }
    } catch (err: any) {
      if (err.message?.includes('Invalid login')) {
        showErrorToast('Login Failed', 'Invalid email/phone or password');
      } else {
        showErrorToast('Login Failed', err.message || 'Failed to sign in. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google Sign-in using Supabase OAuth
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      console.log('[GoogleSignIn] Starting Supabase Google OAuth...');

      const result = await signInWithGoogle();

      if (!result) {
        // User cancelled
        console.log('[GoogleSignIn] User cancelled sign-in');
        setIsGoogleLoading(false);
        return;
      }

      const { user } = result;

      if (!user) {
        showErrorToast('Sign-In Failed', 'Could not sign in with Google');
        setIsGoogleLoading(false);
        return;
      }

      console.log('[GoogleSignIn] Auth successful, user:', user.id);

      // Wait for DB trigger to create user records
      console.log('[GoogleSignIn] Waiting for user records...');
      await waitForUserRecords(user.id);

      // Show success message
      showSuccessToast('Welcome Back!', 'Signed in with Google');

      // Let index.tsx handle routing based on auth state
      // Small delay to let auth state settle
      setTimeout(() => {
        setIsGoogleLoading(false);
        router.replace('/');
      }, 100);

    } catch (err: any) {
      console.error('[GoogleSignIn] Error:', err);
      showErrorToast('Google Sign-In Failed', err.message || 'Please try again');
      setIsGoogleLoading(false);
    }
  };

  const handleForgotPassword = () => {
    // TODO: Implement forgot password flow
    console.log('Forgot password');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconWrapper}>
              <Text style={styles.icon}>🛡️</Text>
            </View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Sign in to access your family vault
            </Text>
          </View>

          {/* Link to verify invite */}
          <Pressable
            onPress={() => router.push('/(auth)/verify-invite')}
            style={styles.inviteToggle}
          >
            <Text style={styles.inviteToggleText}>🎟️ Have an invite code?</Text>
          </Pressable>

          {/* Form */}
          <View style={styles.form}>
            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <TextInput
                value={email}
                onChangeText={(text) => {
                  setEmail(text.toLowerCase().trim());
                  setError('');
                }}
                placeholder="Enter your email address"
                placeholderTextColor={Colors.textPlaceholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={styles.input}
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError('');
                  }}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.textPlaceholder}
                  secureTextEntry={!showPassword}
                  autoComplete="current-password"
                  style={styles.passwordInput}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.showButton}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={Colors.textMuted} />
                  ) : (
                    <Eye size={20} color={Colors.textMuted} />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Forgot Password */}
            <Pressable onPress={handleForgotPassword} style={styles.forgotButton}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>

          {/* Sign In Button */}
          <Button
            title={isLoading ? 'Signing in...' : 'Sign In'}
            onPress={handleSignIn}
            disabled={!isFormValid || isLoading}
            loading={isLoading}
            style={styles.signInButton}
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign In */}
          <Pressable
            onPress={handleGoogleSignIn}
            style={[styles.googleButton, isGoogleLoading && styles.googleButtonDisabled]}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <ActivityIndicator size="small" color="#1a1a1a" />
            ) : (
              <Text style={styles.googleIcon}>G</Text>
            )}
            <Text style={styles.googleText}>
              {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
            </Text>
          </Pressable>

          {/* Sign Up Link */}
          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <Pressable onPress={() => router.push('/(auth)/sign-up')}>
              <Text style={styles.signUpLink}>Sign up</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconWrapper: {
    marginBottom: 24,
  },
  icon: {
    fontSize: 56,
  },
  title: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  inviteToggle: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  inviteToggleText: {
    ...Typography.bodySm,
    color: Colors.primary,
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 16,
    paddingVertical: 16,
    ...Typography.body,
    color: Colors.text,
  },
  passwordContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    ...Typography.body,
    color: Colors.text,
  },
  showButton: {
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
  },
  forgotText: {
    ...Typography.bodySm,
    color: Colors.primary,
  },
  error: {
    ...Typography.body,
    color: Colors.danger,
    marginTop: 16,
    textAlign: 'center',
  },
  signInButton: {
    marginBottom: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.inputBorder,
  },
  dividerText: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    paddingHorizontal: 16,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.google,
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    gap: 12,
    marginBottom: 32,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleIcon: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: '#1a1a1a',
  },
  googleText: {
    ...Typography.button,
    color: '#1a1a1a',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  signUpText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  signUpLink: {
    ...Typography.body,
    color: Colors.primary,
  },
});
