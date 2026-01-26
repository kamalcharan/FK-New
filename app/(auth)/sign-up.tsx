// app/(auth)/sign-up.tsx
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Typography, BorderRadius, GlassStyle } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { sendOTP, isValidPhoneNumber } from '../../src/lib/otp';

type SignUpMethod = 'phone' | 'email';

export default function SignUpScreen() {
  const [method, setMethod] = useState<SignUpMethod>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isPhoneValid = isValidPhoneNumber(phone);
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isFormValid = method === 'phone' ? isPhoneValid : isEmailValid;

  const handleContinue = async () => {
    setError('');
    setIsLoading(true);

    try {
      if (method === 'phone') {
        // Send OTP via MSG91
        const result = await sendOTP(phone, '91');

        if (result.success) {
          // Navigate to OTP verification
          router.push({
            pathname: '/(auth)/verify-phone',
            params: { phone, countryCode: '91' },
          });
        } else {
          setError(result.message);
        }
      } else {
        // Email flow - send verification email via Supabase
        // TODO: Implement email verification
        router.push({
          pathname: '/(auth)/verify-email',
          params: { email },
        });
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
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
            <Text style={styles.title}>Create your vault</Text>
            <Text style={styles.subtitle}>
              Your family's financial memory,{'\n'}secured forever.
            </Text>
          </View>

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

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.hint}>
              {method === 'phone'
                ? 'We\'ll send a one-time verification code'
                : 'We\'ll send a verification link to your email'}
            </Text>
          </View>

          {/* Continue Button */}
          <Button
            title={isLoading ? 'Sending...' : 'Continue'}
            onPress={handleContinue}
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
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 12,
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
    marginTop: 8,
  },
  hint: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    marginTop: 12,
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
});
