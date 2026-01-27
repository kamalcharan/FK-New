// app/(auth)/sign-up.tsx
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
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Eye, EyeOff } from 'lucide-react-native';
import { Colors, Typography, BorderRadius, GlassStyle } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { signUpWithEmail, isSupabaseReady, acceptFamilyInvite, updateOnboardingStatus, getUserProfile, checkFkUserExists, getWorkspaceForUser } from '../../src/lib/supabase';
import {
  useGoogleAuth,
  exchangeCodeForTokens,
  signInWithGoogleToken,
  storeGoogleTokens,
  isGoogleAuthConfigured,
  getGoogleUserInfo,
} from '../../src/lib/googleAuth';
import { setUser } from '../../src/store/slices/authSlice';

// Helper to wait for user records to be created by DB trigger
// The trigger creates fk_users and fk_user_profiles after auth.users is created
const waitForUserRecords = async (userId: string, maxAttempts = 10): Promise<boolean> => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      // Check both fk_users (for FK constraints) and fk_user_profiles
      const [userExists, profile] = await Promise.all([
        checkFkUserExists(userId),
        getUserProfile(userId),
      ]);

      console.log(`[Signup] Attempt ${i + 1}: fk_users=${userExists}, profile=${!!profile}`);

      if (userExists && profile) {
        console.log('[Signup] User records created successfully');
        return true;
      }
    } catch (err) {
      console.log(`[Signup] Attempt ${i + 1} error:`, err);
    }
    // Wait 500ms before retry
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  console.warn('[Signup] User records not created after max attempts');
  return false;
};
// Phone OTP auth hidden for now
// import { isValidPhoneNumber } from '../../src/lib/otp';
import { showErrorToast, showSuccessToast, showWarningToast } from '../../src/components/ToastConfig';
import { useAppDispatch } from '../../src/hooks/useStore';
import { setWorkspace } from '../../src/store/slices/workspaceSlice';

export default function SignUpScreen() {
  // Get invite context from verify-invite screen
  const {
    inviteCode: inviteCodeParam,
    workspaceName,
    inviterName,
    relationshipLabel,
    relationshipIcon,
  } = useLocalSearchParams<{
    inviteCode?: string;
    workspaceName?: string;
    inviterName?: string;
    relationshipLabel?: string;
    relationshipIcon?: string;
  }>();

  const hasInviteContext = Boolean(inviteCodeParam && workspaceName);

  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // Google Auth hook
  const { request: googleRequest, response: googleResponse, promptAsync: googlePromptAsync, redirectUri } = useGoogleAuth();

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = password.length >= 8;
  const isFormValid = isEmailValid && isPasswordValid;

  const handleSignUp = async () => {
    setError('');
    setIsLoading(true);

    try {
      if (!isSupabaseReady()) {
        // Demo mode - skip actual signup, pass name for personalization
        router.replace({
          pathname: '/(auth)/workspace-setup',
          params: { userName: fullName },
        });
        return;
      }

      const signUpResult = await signUpWithEmail(email, password, fullName);

      // Check if we have a session (email confirmation might be required)
      if (!signUpResult.session) {
        // No session - email confirmation might be required
        showSuccessToast('Check Your Email', 'Please verify your email to continue');
        // Still go to workspace-setup, it will handle the auth check
        router.replace({
          pathname: '/(auth)/workspace-setup',
          params: { userName: fullName },
        });
        return;
      }

      // If user has an invite code (from verify-invite screen), accept it
      if (inviteCodeParam && signUpResult.user) {
        try {
          // Wait for DB trigger to create user records (race condition fix)
          console.log('[Signup] Waiting for user records to be created...');
          const recordsReady = await waitForUserRecords(signUpResult.user.id);
          if (!recordsReady) {
            console.warn('[Signup] User records not created - invite may fail');
          }

          console.log('[Signup] Accepting invite:', inviteCodeParam);
          const result = await acceptFamilyInvite(inviteCodeParam, signUpResult.user.id);
          console.log('[Signup] Accept invite result:', result);

          if (result.success && result.workspace_id) {
            // Update Redux store with joined workspace
            dispatch(setWorkspace({
              id: result.workspace_id,
              name: result.workspace_name || 'Family Vault',
              owner_id: '',
              created_at: new Date().toISOString(),
            }));

            // Mark onboarding as complete
            console.log('[Signup] Marking onboarding complete...');
            await updateOnboardingStatus(signUpResult.user.id, true);
            console.log('[Signup] Onboarding marked complete');

            showSuccessToast('Welcome!', `You've joined ${result.workspace_name}`);
            router.replace('/(tabs)');
            return;
          } else if (result.error_message) {
            console.warn('[Signup] Invite issue:', result.error_message);
            showWarningToast('Invite Issue', result.error_message);
            // Continue to workspace setup
          }
        } catch (inviteErr: any) {
          console.error('[Signup] Invite error:', inviteErr);
          showWarningToast('Invite Failed', 'Could not process invite code. You can join later.');
        }
      }

      showSuccessToast('Account Created', 'Welcome to FamilyKnows!');
      // Pass the user's name for personalized placeholder
      router.replace({
        pathname: '/(auth)/workspace-setup',
        params: { userName: fullName },
      });
    } catch (err: any) {
      if (err.message?.includes('already registered')) {
        showErrorToast('Account Exists', 'An account with this email/phone already exists. Please sign in.');
      } else {
        showErrorToast('Sign Up Failed', err.message || 'Something went wrong. Please try again.');
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
            showErrorToast('Google Sign-Up Failed', 'Could not authenticate with Google');
            return;
          }

          // Sign in to Supabase with the ID token
          const { user, session } = await signInWithGoogleToken(tokens.id_token);

          if (!user) {
            showErrorToast('Sign-Up Failed', 'Could not create account');
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

          // If we have an invite code, try to accept it
          if (inviteCodeParam) {
            try {
              const result = await acceptFamilyInvite(inviteCodeParam, user.id);
              if (result.success && result.workspace_id) {
                dispatch(setWorkspace({
                  id: result.workspace_id,
                  name: result.workspace_name || 'Family Vault',
                  owner_id: '',
                  created_at: new Date().toISOString(),
                }));
                await updateOnboardingStatus(user.id, true);
                showSuccessToast('Welcome!', `You've joined ${result.workspace_name}`);
                router.replace('/(tabs)');
                return;
              }
            } catch (inviteErr) {
              console.warn('[GoogleSignUp] Invite error:', inviteErr);
            }
          }

          // Check if user already has a workspace
          const workspace = await getWorkspaceForUser(user.id);
          if (workspace) {
            dispatch(setWorkspace(workspace));
            const profile = await getUserProfile(user.id);
            if (profile?.onboarding_completed) {
              showSuccessToast('Welcome Back', 'Signed in with Google');
              router.replace('/(tabs)');
            } else {
              router.replace({
                pathname: '/(auth)/family-invite',
                params: { workspaceName: workspace.name, workspaceId: workspace.id },
              });
            }
          } else {
            showSuccessToast('Account Created', 'Welcome to FamilyKnows!');
            router.replace({
              pathname: '/(auth)/workspace-setup',
              params: { userName: googleUser?.name || '' },
            });
          }
        } catch (err: any) {
          console.error('[GoogleSignUp] Error:', err);
          showErrorToast('Google Sign-Up Failed', err.message || 'Please try again');
        } finally {
          setIsGoogleLoading(false);
        }
      } else if (googleResponse?.type === 'error') {
        showErrorToast('Google Sign-Up Failed', googleResponse.error?.message || 'Please try again');
      }
    };

    handleGoogleResponse();
  }, [googleResponse]);

  const handleGoogleSignUp = async () => {
    if (!isGoogleAuthConfigured()) {
      showWarningToast('Not Configured', 'Google Sign-In is not configured yet');
      return;
    }

    try {
      await googlePromptAsync();
    } catch (err: any) {
      showErrorToast('Error', 'Could not start Google Sign-Up');
    }
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
            <Text style={styles.title}>
              {hasInviteContext ? 'Join your family' : 'Create your vault'}
            </Text>
            <Text style={styles.subtitle}>
              {hasInviteContext
                ? 'Create an account to join the family vault'
                : "Your family's financial memory,\nsecured forever."}
            </Text>
          </View>

          {/* Invite Context Card - shown when coming from verify-invite */}
          {hasInviteContext && (
            <View style={styles.inviteContextCard}>
              <View style={styles.inviteContextHeader}>
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                <Text style={styles.inviteContextTitle}>Joining via invite</Text>
              </View>
              <View style={styles.inviteContextBody}>
                <Text style={styles.inviteContextIcon}>{relationshipIcon || '👤'}</Text>
                <Text style={styles.inviteContextText}>
                  <Text style={styles.inviteContextBold}>{inviterName}</Text>
                  {' '}invited you to join{' '}
                  <Text style={styles.inviteContextBold}>{workspaceName}</Text>
                  {' '}as their{' '}
                  <Text style={styles.inviteContextRelation}>{relationshipLabel}</Text>
                </Text>
              </View>
              <Pressable
                onPress={() => router.replace('/(auth)/verify-invite')}
                style={styles.changeInviteButton}
              >
                <Text style={styles.changeInviteText}>Use different code</Text>
              </Pressable>
            </View>
          )}

          {/* Link to verify invite - shown when NOT coming from verify-invite */}
          {!hasInviteContext && (
            <Pressable
              onPress={() => router.push('/(auth)/verify-invite')}
              style={styles.inviteToggle}
            >
              <Text style={styles.inviteToggleText}>🎟️ Have an invite code?</Text>
            </Pressable>
          )}

          {/* Input Fields */}
          <View style={styles.inputContainer}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>FULL NAME</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor={Colors.textPlaceholder}
                autoCapitalize="words"
                autoComplete="name"
                style={styles.emailInput}
              />
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <TextInput
                value={email}
                onChangeText={(text) => {
                  setEmail(text.toLowerCase().trim());
                  setError('');
                }}
                placeholder="Enter email address"
                placeholderTextColor={Colors.textPlaceholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={styles.emailInput}
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
                  placeholder="Create a password (min 8 chars)"
                  placeholderTextColor={Colors.textPlaceholder}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
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
              {password.length > 0 && password.length < 8 ? (
                <Text style={styles.passwordHint}>Password must be at least 8 characters</Text>
              ) : null}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>

          {/* Sign Up Button */}
          <Button
            title={isLoading ? 'Creating account...' : hasInviteContext ? 'Create Account & Join' : 'Create Account'}
            onPress={handleSignUp}
            disabled={!isFormValid || isLoading}
            loading={isLoading}
            style={styles.continueButton}
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign Up */}
          <Pressable
            onPress={handleGoogleSignUp}
            style={[styles.googleButton, (isGoogleLoading || !googleRequest) && styles.googleButtonDisabled]}
            disabled={isGoogleLoading || !googleRequest}
          >
            {isGoogleLoading ? (
              <ActivityIndicator size="small" color="#1a1a1a" />
            ) : (
              <Text style={styles.googleIcon}>G</Text>
            )}
            <Text style={styles.googleText}>
              {isGoogleLoading ? 'Creating account...' : 'Continue with Google'}
            </Text>
          </Pressable>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Pressable onPress={() => router.push('/(auth)/sign-in')}>
              <Text style={styles.loginLink}>Log in</Text>
            </Pressable>
          </View>

          {/* Terms */}
          <Text style={styles.terms}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
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
    marginBottom: 40,
  },
  title: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 24,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textMuted,
    letterSpacing: 1.5,
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
  passwordHint: {
    ...Typography.bodySm,
    color: Colors.warning,
    marginTop: 4,
  },
  emailInput: {
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 16,
    paddingVertical: 16,
    ...Typography.body,
    color: Colors.text,
  },
  error: {
    ...Typography.bodySm,
    color: Colors.danger,
    textAlign: 'center',
  },
  continueButton: {
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  loginText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  loginLink: {
    ...Typography.body,
    color: Colors.primary,
  },
  terms: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
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
  inviteContextCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
    padding: 16,
    marginBottom: 24,
  },
  inviteContextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  inviteContextTitle: {
    ...Typography.bodySm,
    color: '#22c55e',
    fontFamily: 'Inter_600SemiBold',
  },
  inviteContextBody: {
    alignItems: 'center',
  },
  inviteContextIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  inviteContextText: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  inviteContextBold: {
    color: Colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  inviteContextRelation: {
    color: '#a855f7',
    fontFamily: 'Inter_600SemiBold',
  },
  changeInviteButton: {
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(34, 197, 94, 0.2)',
  },
  changeInviteText: {
    ...Typography.bodySm,
    color: Colors.textMuted,
  },
});
