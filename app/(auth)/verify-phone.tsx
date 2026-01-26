// app/(auth)/verify-phone.tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, BorderRadius } from '../../src/constants/theme';
import { OTPInput } from '../../src/components/ui/OTPInput';
import { Button } from '../../src/components/ui/Button';
import { verifyOTP, resendOTP } from '../../src/lib/msg91';

const RESEND_COOLDOWN = 30; // seconds

export default function VerifyPhoneScreen() {
  const params = useLocalSearchParams<{ phone: string; countryCode?: string }>();
  const phone = params.phone || '';
  const countryCode = params.countryCode || '91';

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [isResending, setIsResending] = useState(false);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Format phone for display (mask middle digits)
  const maskedPhone = phone.length >= 10
    ? `+${countryCode} ${phone.slice(0, 2)}****${phone.slice(-4)}`
    : phone;

  const handleOTPComplete = async (enteredOTP: string) => {
    if (enteredOTP.length !== 6) return;

    setIsVerifying(true);
    setError('');

    try {
      const result = await verifyOTP(phone, enteredOTP, countryCode);

      if (result.success) {
        // OTP verified - proceed to next step (set password or complete signup)
        router.replace({
          pathname: '/(auth)/set-password',
          params: { phone, countryCode, verified: 'true' },
        });
      } else {
        setError(result.message);
        setOtp('');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
      setOtp('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async (type: 'text' | 'voice' = 'text') => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setError('');

    try {
      const result = await resendOTP(phone, type, countryCode);

      if (result.success) {
        setResendCooldown(RESEND_COOLDOWN);
        setOtp('');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleChangeNumber = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Verify your number</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to{'\n'}
              <Text style={styles.phone}>{maskedPhone}</Text>
            </Text>
          </View>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            <OTPInput
              value={otp}
              onChange={setOtp}
              onComplete={handleOTPComplete}
              error={error}
              length={6}
            />
          </View>

          {/* Verify Button */}
          <Button
            title={isVerifying ? 'Verifying...' : 'Verify'}
            onPress={() => handleOTPComplete(otp)}
            disabled={otp.length !== 6 || isVerifying}
            loading={isVerifying}
            style={styles.verifyButton}
          />

          {/* Resend Options */}
          <View style={styles.resendContainer}>
            {resendCooldown > 0 ? (
              <Text style={styles.resendTimer}>
                Resend code in {resendCooldown}s
              </Text>
            ) : (
              <View style={styles.resendOptions}>
                <Pressable
                  onPress={() => handleResend('text')}
                  disabled={isResending}
                  style={styles.resendButton}
                >
                  {isResending ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Text style={styles.resendText}>Resend SMS</Text>
                  )}
                </Pressable>

                <Text style={styles.divider}>|</Text>

                <Pressable
                  onPress={() => handleResend('voice')}
                  disabled={isResending}
                  style={styles.resendButton}
                >
                  <Text style={styles.resendText}>Call me</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Change Number */}
          <Pressable onPress={handleChangeNumber} style={styles.changeNumber}>
            <Text style={styles.changeNumberText}>Change phone number</Text>
          </Pressable>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
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
  phone: {
    color: Colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  otpContainer: {
    marginBottom: 32,
  },
  verifyButton: {
    marginBottom: 24,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resendTimer: {
    ...Typography.body,
    color: Colors.textMuted,
  },
  resendOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  resendButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  resendText: {
    ...Typography.body,
    color: Colors.primary,
  },
  divider: {
    color: Colors.textMuted,
  },
  changeNumber: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  changeNumberText: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
});
