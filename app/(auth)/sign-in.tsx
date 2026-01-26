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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Typography, BorderRadius, Spacing } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { signInWithPassword, isSupabaseReady, acceptFamilyInvite, updateOnboardingStatus } from '../../src/lib/supabase';
import { isValidPhoneNumber } from '../../src/lib/otp';
import { showErrorToast, showSuccessToast, showWarningToast } from '../../src/components/ToastConfig';
import { useAppDispatch } from '../../src/hooks/useStore';
import { setWorkspace } from '../../src/store/slices/workspaceSlice';

export default function SignInScreen() {
  const dispatch = useAppDispatch();
  const [identifier, setIdentifier] = useState(''); // email or phone
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showInviteInput, setShowInviteInput] = useState(false);

  // Detect if input is phone or email
  const isPhone = /^\d+$/.test(identifier.replace(/\D/g, '')) && identifier.length <= 12;
  const isEmail = identifier.includes('@');

  // Validation
  const isIdentifierValid = isEmail
    ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)
    : isValidPhoneNumber(identifier);
  const isFormValid = isIdentifierValid && password.length >= 8;

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

      const { user } = await signInWithPassword(identifier, password);

      if (user) {
        // If user has an invite code, try to accept it
        if (inviteCode.trim()) {
          try {
            const result = await acceptFamilyInvite(inviteCode.trim(), user.id);

            if (result.success && result.workspace_id) {
              // Update Redux store with joined workspace
              dispatch(setWorkspace({
                id: result.workspace_id,
                name: result.workspace_name || 'Family Vault',
                owner_id: '',
                created_at: new Date().toISOString(),
              }));

              showSuccessToast('Joined!', `You've joined ${result.workspace_name}`);
              router.replace('/(tabs)');
              return;
            } else if (result.error_message && result.error_message !== 'Already a member') {
              showWarningToast('Invite Issue', result.error_message);
            }
          } catch (inviteErr: any) {
            showWarningToast('Invite Failed', 'Could not process invite code.');
          }
        }

        // Login successful - show toast and navigate
        showSuccessToast('Welcome Back', 'Signed in successfully');
        router.replace('/');
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

  const handleGoogleSignIn = () => {
    // TODO: Implement Google OAuth with Drive scope
    // For now, go through index for proper routing
    router.replace('/');
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

          {/* Invite Code Section */}
          <Pressable
            onPress={() => setShowInviteInput(!showInviteInput)}
            style={styles.inviteToggle}
          >
            <Text style={styles.inviteToggleText}>
              {showInviteInput ? '✕ Cancel invite code' : '🎟️ Have an invite code?'}
            </Text>
          </Pressable>

          {showInviteInput && (
            <View style={styles.inviteSection}>
              <Text style={styles.inviteHint}>
                Enter the code to join a family vault
              </Text>
              <TextInput
                value={inviteCode}
                onChangeText={(text) => setInviteCode(text.toUpperCase())}
                placeholder="Enter invite code"
                placeholderTextColor={Colors.textPlaceholder}
                autoCapitalize="characters"
                autoCorrect={false}
                style={styles.inviteInput}
              />
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            {/* Email or Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL OR PHONE</Text>
              <TextInput
                value={identifier}
                onChangeText={(text) => {
                  setIdentifier(text.trim());
                  setError('');
                }}
                placeholder="Enter email or phone number"
                placeholderTextColor={Colors.textPlaceholder}
                keyboardType={isPhone ? 'phone-pad' : 'email-address'}
                autoCapitalize="none"
                autoComplete="username"
                style={styles.input}
              />
              {identifier.length > 0 && (
                <Text style={styles.hint}>
                  {isPhone ? '📱 Signing in with phone' : '✉️ Signing in with email'}
                </Text>
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
                  <Text style={styles.showButtonText}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
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
          <Pressable onPress={handleGoogleSignIn} style={styles.googleButton}>
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleText}>Continue with Google</Text>
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
    marginBottom: 40,
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
  hint: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    marginTop: 4,
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
  inviteToggle: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  inviteToggleText: {
    ...Typography.bodySm,
    color: Colors.primary,
  },
  inviteSection: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: BorderRadius.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  inviteHint: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  inviteInput: {
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...Typography.body,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: 2,
    fontSize: 18,
  },
});
