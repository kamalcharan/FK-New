// app/(auth)/sign-up.tsx
import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, BorderRadius, GlassStyle } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { signUpWithEmail, signUpWithPhone, isSupabaseReady, supabase, acceptFamilyInvite, updateOnboardingStatus, getUserProfile, checkFkUserExists } from '../../src/lib/supabase';

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
import { isValidPhoneNumber } from '../../src/lib/otp';
import { showErrorToast, showSuccessToast, showWarningToast } from '../../src/components/ToastConfig';
import { useAppDispatch } from '../../src/hooks/useStore';
import { setWorkspace } from '../../src/store/slices/workspaceSlice';

type SignUpMethod = 'phone' | 'email';

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
  const [method, setMethod] = useState<SignUpMethod>('email');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isPhoneValid = isValidPhoneNumber(phone);
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = password.length >= 8;
  const isFormValid = (method === 'phone' ? isPhoneValid : isEmailValid) && isPasswordValid;

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

      let signUpResult;
      if (method === 'phone') {
        signUpResult = await signUpWithPhone(phone, password, fullName);
      } else {
        signUpResult = await signUpWithEmail(email, password, fullName);
      }

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

  const handleGoogleSignUp = () => {
    // TODO: Implement Google OAuth
    router.push('/(auth)/workspace-setup');
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

          {/* Method Toggle */}
          <View style={styles.toggleContainer}>
            <Pressable
              onPress={() => setMethod('phone')}
              style={[
                styles.toggleButton,
                method === 'phone' ? styles.toggleActive : null,
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  method === 'phone' ? styles.toggleTextActive : null,
                ]}
              >
                Phone
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMethod('email')}
              style={[
                styles.toggleButton,
                method === 'email' ? styles.toggleActive : null,
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  method === 'email' ? styles.toggleTextActive : null,
                ]}
              >
                Email
              </Text>
            </Pressable>
          </View>

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

            {/* Email or Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{method === 'phone' ? 'PHONE NUMBER' : 'EMAIL ADDRESS'}</Text>
              {method === 'phone' ? (
                <View style={styles.phoneInputRow}>
                  <View style={styles.countryCode}>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <TextInput
                    value={phone}
                    onChangeText={(text) => {
                      setPhone(text.replace(/\D/g, ''));
                      setError('');
                    }}
                    placeholder="Enter mobile number"
                    placeholderTextColor={Colors.textPlaceholder}
                    keyboardType="phone-pad"
                    maxLength={10}
                    style={styles.phoneInput}
                    autoComplete="tel"
                  />
                </View>
              ) : (
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
              )}
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
                  <Text style={styles.showButtonText}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
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
          <Pressable onPress={handleGoogleSignUp} style={styles.googleButton}>
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleText}>Continue with Google</Text>
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
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.lg,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    ...Typography.button,
    color: Colors.textMuted,
  },
  toggleTextActive: {
    color: Colors.background,
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
  phoneInputRow: {
    flexDirection: 'row',
    gap: 12,
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
  showButtonText: {
    ...Typography.bodySm,
    color: Colors.primary,
  },
  passwordHint: {
    ...Typography.bodySm,
    color: Colors.warning,
    marginTop: 4,
  },
  countryCode: {
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  countryCodeText: {
    ...Typography.body,
    color: Colors.text,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 16,
    paddingVertical: 16,
    ...Typography.body,
    color: Colors.text,
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
