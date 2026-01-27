// app/(auth)/sign-in.tsx
import { useState, useEffect } from 'react';
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
import { signInWithPassword, isSupabaseReady, getWorkspaceForUser, getUserProfile, checkFkUserExists } from '../../src/lib/supabase';
import { showErrorToast, showSuccessToast, showWarningToast } from '../../src/components/ToastConfig';
import { useAppDispatch } from '../../src/hooks/useStore';
import { setUser } from '../../src/store/slices/authSlice';
import { setWorkspace } from '../../src/store/slices/workspaceSlice';
import {
  useGoogleAuth,
  exchangeCodeForTokens,
  signInWithGoogleToken,
  storeGoogleTokens,
  isGoogleAuthConfigured,
  getGoogleUserInfo,
} from '../../src/lib/googleAuth';

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

  // Google Auth hook
  const { request: googleRequest, response: googleResponse, promptAsync: googlePromptAsync, redirectUri } = useGoogleAuth();

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

  // Handle Google OAuth response
  useEffect(() => {
    const handleGoogleResponse = async () => {
      if (googleResponse?.type === 'success' && googleResponse.params.code) {
        setIsGoogleLoading(true);
        try {
          // Exchange code for tokens
          const tokens = await exchangeCodeForTokens(
            googleResponse.params.code,
            googleRequest?.codeVerifier || '',
            redirectUri
          );

          if (!tokens) {
            showErrorToast('Google Sign-In Failed', 'Could not authenticate with Google');
            return;
          }

          // Sign in to Supabase with the ID token
          const { user, session } = await signInWithGoogleToken(tokens.id_token);

          if (!user) {
            showErrorToast('Sign-In Failed', 'Could not create account');
            return;
          }

          // Store Google tokens for Drive access
          await storeGoogleTokens({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
          });

          // Get user info for Redux
          const googleUser = await getGoogleUserInfo(tokens.access_token);

          // Update Redux with user info
          dispatch(setUser({
            id: user.id,
            email: user.email || googleUser?.email || '',
            full_name: user.user_metadata?.full_name || googleUser?.name,
            avatar_url: user.user_metadata?.avatar_url || googleUser?.picture,
            created_at: user.created_at,
          }));

          // Wait for DB trigger to create user records
          await waitForUserRecords(user.id);

          // Fetch workspace and profile to determine navigation
          const [workspace, profile] = await Promise.all([
            getWorkspaceForUser(user.id),
            getUserProfile(user.id),
          ]);

          // Determine where to navigate
          if (!workspace) {
            showSuccessToast('Welcome!', 'Let\'s set up your vault');
            router.replace({
              pathname: '/(auth)/workspace-setup',
              params: { userName: googleUser?.name || '' },
            });
          } else if (!profile?.onboarding_completed) {
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
            dispatch(setWorkspace(workspace));
            showSuccessToast('Welcome Back', 'Signed in with Google');
            router.replace('/(tabs)');
          }
        } catch (err: any) {
          console.error('[GoogleAuth] Error:', err);
          showErrorToast('Google Sign-In Failed', err.message || 'Please try again');
        } finally {
          setIsGoogleLoading(false);
        }
      } else if (googleResponse?.type === 'error') {
        console.error('[GoogleAuth] Auth error:', googleResponse.error);
        const errorMsg = googleResponse.error?.message || '';

        // Handle specific Google OAuth errors
        if (errorMsg.includes('access_blocked') || errorMsg.includes('Authorization Error')) {
          showErrorToast(
            'Access Blocked',
            'Please check Google Cloud Console configuration. Redirect URI may not be registered.'
          );
        } else if (errorMsg.includes('redirect_uri_mismatch')) {
          showErrorToast(
            'Configuration Error',
            'Redirect URI mismatch. Check Google Cloud Console settings.'
          );
        } else {
          showErrorToast('Google Sign-In Failed', errorMsg || 'Please try again');
        }
      } else if (googleResponse?.type === 'dismiss') {
        // User dismissed the sign-in modal - no error needed
        console.log('[GoogleAuth] User dismissed sign-in');
      }
    };

    handleGoogleResponse();
  }, [googleResponse]);

  const handleGoogleSignIn = async () => {
    if (!isGoogleAuthConfigured()) {
      showWarningToast('Not Configured', 'Add EXPO_PUBLIC_GOOGLE_CLIENT_ID to your .env file');
      console.log('[GoogleAuth] Client ID not configured');
      console.log('[GoogleAuth] Redirect URI would be:', redirectUri);
      return;
    }

    console.log('[GoogleAuth] Starting sign-in with redirect URI:', redirectUri);

    try {
      const result = await googlePromptAsync();
      console.log('[GoogleAuth] Prompt result:', result?.type);
    } catch (err: any) {
      console.error('[GoogleAuth] Prompt error:', err);
      showErrorToast('Error', err.message || 'Could not start Google Sign-In');
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
            style={[styles.googleButton, (isGoogleLoading || !googleRequest) && styles.googleButtonDisabled]}
            disabled={isGoogleLoading || !googleRequest}
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
