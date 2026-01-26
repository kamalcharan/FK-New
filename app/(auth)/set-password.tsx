// app/(auth)/set-password.tsx
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, BorderRadius } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { supabase, isSupabaseReady } from '../../src/lib/supabase';

export default function SetPasswordScreen() {
  const params = useLocalSearchParams<{
    phone?: string;
    email?: string;
    countryCode?: string;
    verified?: string;
  }>();

  const phone = params.phone;
  const email = params.email;
  const countryCode = params.countryCode || '91';
  const isVerified = params.verified === 'true';

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Validation
  const isPasswordValid = password.length >= 8;
  const doPasswordsMatch = password === confirmPassword;
  const isNameValid = fullName.trim().length >= 2;
  const isFormValid = isNameValid && isPasswordValid && doPasswordsMatch;

  // Generate email from phone if needed (for Supabase auth)
  const authEmail = email || `${countryCode}${phone}@fk.local`;

  const handleCreateAccount = async () => {
    if (!isFormValid) return;

    setError('');
    setIsLoading(true);

    try {
      if (!isSupabaseReady()) {
        // Demo mode - skip actual signup
        router.replace('/(auth)/workspace-setup');
        return;
      }

      // Create user in Supabase Auth
      const { data, error: signUpError } = await supabase!.auth.signUp({
        email: authEmail,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone ? `+${countryCode}${phone}` : null,
            auth_provider: phone ? 'phone' : 'email',
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.user) {
        // User created successfully
        // The database trigger will auto-create fk_users and fk_user_profiles

        // Navigate to workspace setup
        router.replace('/(auth)/workspace-setup');
      }
    } catch (err) {
      console.error('Sign up error:', err);
      setError('Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
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
            <Text style={styles.title}>Almost there!</Text>
            <Text style={styles.subtitle}>
              Set up your account to secure your vault
            </Text>
          </View>

          {/* Verified Badge */}
          {isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedIcon}>✓</Text>
              <Text style={styles.verifiedText}>
                {phone ? `+${countryCode} ${phone}` : email} verified
              </Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
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
                  placeholder="Create a password"
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
              {password.length > 0 && !isPasswordValid && (
                <Text style={styles.hint}>Minimum 8 characters</Text>
              )}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>CONFIRM PASSWORD</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setError('');
                }}
                placeholder="Re-enter your password"
                placeholderTextColor={Colors.textPlaceholder}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                style={styles.input}
              />
              {confirmPassword.length > 0 && !doPasswordsMatch && (
                <Text style={styles.errorHint}>Passwords don't match</Text>
              )}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>

          {/* Create Account Button */}
          <Button
            title={isLoading ? 'Creating account...' : 'Create Account'}
            onPress={handleCreateAccount}
            disabled={!isFormValid || isLoading}
            loading={isLoading}
            style={styles.createButton}
          />

          {/* Security Note */}
          <View style={styles.securityNote}>
            <Text style={styles.securityIcon}>🔒</Text>
            <Text style={styles.securityText}>
              Your data is encrypted and stored securely.{'\n'}
              Only you and your family can access it.
            </Text>
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
    marginBottom: 32,
  },
  title: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successMuted,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.successBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 32,
    gap: 8,
  },
  verifiedIcon: {
    fontSize: 16,
    color: Colors.success,
  },
  verifiedText: {
    ...Typography.body,
    color: Colors.success,
  },
  form: {
    marginBottom: 32,
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
  showButtonText: {
    ...Typography.bodySm,
    color: Colors.primary,
  },
  hint: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    marginTop: 4,
  },
  errorHint: {
    ...Typography.bodySm,
    color: Colors.danger,
    marginTop: 4,
  },
  error: {
    ...Typography.body,
    color: Colors.danger,
    marginTop: 8,
    textAlign: 'center',
  },
  createButton: {
    marginBottom: 32,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 16,
    gap: 12,
  },
  securityIcon: {
    fontSize: 20,
  },
  securityText: {
    flex: 1,
    ...Typography.bodySm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
