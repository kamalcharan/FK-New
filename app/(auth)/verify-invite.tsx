// app/(auth)/verify-invite.tsx
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, BorderRadius, Spacing } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { verifyInviteCode, isSupabaseReady, VerifyInviteResult } from '../../src/lib/supabase';
import { showErrorToast } from '../../src/components/ToastConfig';

export default function VerifyInviteScreen() {
  const [inviteCode, setInviteCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedInvite, setVerifiedInvite] = useState<VerifyInviteResult | null>(null);

  const isCodeValid = inviteCode.replace(/\s/g, '').length >= 6;

  const handleVerify = async () => {
    if (!isCodeValid) return;

    setIsVerifying(true);
    setVerifiedInvite(null);

    try {
      if (!isSupabaseReady()) {
        // Demo mode
        setVerifiedInvite({
          is_valid: true,
          workspace_id: 'demo-workspace',
          workspace_name: "The Demo Family",
          inviter_id: 'demo-user',
          inviter_name: 'Demo User',
          relationship_code: 'mom',
          relationship_label: 'Mom',
          relationship_icon: '👩',
          error_message: null,
        });
        return;
      }

      const result = await verifyInviteCode(inviteCode.trim());

      if (result.is_valid) {
        setVerifiedInvite(result);
      } else {
        showErrorToast('Invalid Code', result.error_message || 'Please check the code and try again');
      }
    } catch (err: any) {
      showErrorToast('Verification Failed', err.message || 'Could not verify the invite code');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleContinueToSignUp = () => {
    if (!verifiedInvite) return;

    // Navigate to sign-up with invite context
    router.push({
      pathname: '/(auth)/sign-up',
      params: {
        inviteCode: inviteCode.trim(),
        workspaceName: verifiedInvite.workspace_name || '',
        inviterName: verifiedInvite.inviter_name || '',
        relationshipLabel: verifiedInvite.relationship_label || '',
        relationshipIcon: verifiedInvite.relationship_icon || '',
      },
    });
  };

  const handleCreateNewVault = () => {
    router.push('/(auth)/sign-up');
  };

  const handleSignIn = () => {
    router.push('/(auth)/sign-in');
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
            <View style={styles.iconWrapper}>
              <LinearGradient
                colors={['#6366f1', '#a855f7']}
                style={styles.iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="ticket-outline" size={32} color="white" />
              </LinearGradient>
            </View>
            <Text style={styles.title}>Join a Family Vault</Text>
            <Text style={styles.subtitle}>
              Enter the invite code shared by your family member
            </Text>
          </View>

          {/* Invite Code Input */}
          {!verifiedInvite && (
            <View style={styles.inputSection}>
              <Text style={styles.label}>INVITE CODE</Text>
              <TextInput
                value={inviteCode}
                onChangeText={(text) => setInviteCode(text.toUpperCase().replace(/\s/g, ''))}
                placeholder="Enter 8-character code"
                placeholderTextColor={Colors.textPlaceholder}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={10}
                style={styles.codeInput}
                editable={!isVerifying}
              />

              <Button
                title={isVerifying ? 'Verifying...' : 'Verify Code'}
                onPress={handleVerify}
                disabled={!isCodeValid || isVerifying}
                loading={isVerifying}
                style={styles.verifyButton}
              />
            </View>
          )}

          {/* Verified Invite Card */}
          {verifiedInvite && verifiedInvite.is_valid && (
            <View style={styles.verifiedCard}>
              <View style={styles.checkMark}>
                <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
              </View>

              <Text style={styles.verifiedTitle}>Invite Verified!</Text>

              <View style={styles.inviteDetails}>
                <Text style={styles.relationshipIcon}>{verifiedInvite.relationship_icon}</Text>
                <Text style={styles.inviteText}>
                  <Text style={styles.inviterName}>{verifiedInvite.inviter_name}</Text>
                  {' '}has invited you to join
                </Text>
                <Text style={styles.workspaceName}>{verifiedInvite.workspace_name}</Text>
                <Text style={styles.relationshipText}>
                  as their <Text style={styles.relationshipLabel}>{verifiedInvite.relationship_label}</Text>
                </Text>
              </View>

              <Button
                title="Continue to Sign Up"
                onPress={handleContinueToSignUp}
                style={styles.continueButton}
              />

              <Pressable
                onPress={() => setVerifiedInvite(null)}
                style={styles.tryAnotherButton}
              >
                <Text style={styles.tryAnotherText}>Use a different code</Text>
              </Pressable>
            </View>
          )}

          {/* Footer Links */}
          {!verifiedInvite && (
            <View style={styles.footer}>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable onPress={handleCreateNewVault} style={styles.linkButton}>
                <Text style={styles.linkText}>
                  Don't have a code? <Text style={styles.linkHighlight}>Create a new vault</Text>
                </Text>
              </Pressable>

              <Pressable onPress={handleSignIn} style={styles.linkButton}>
                <Text style={styles.linkText}>
                  Already have an account? <Text style={styles.linkHighlight}>Sign in</Text>
                </Text>
              </Pressable>
            </View>
          )}
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
    marginBottom: 40,
  },
  iconWrapper: {
    marginBottom: 24,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
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
    paddingHorizontal: 20,
  },
  inputSection: {
    marginBottom: 32,
  },
  label: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  codeInput: {
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 20,
    paddingVertical: 18,
    ...Typography.h2,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 16,
  },
  verifyButton: {
    marginTop: 8,
  },
  verifiedCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
    padding: 24,
    alignItems: 'center',
  },
  checkMark: {
    marginBottom: 16,
  },
  verifiedTitle: {
    ...Typography.h2,
    color: '#22c55e',
    marginBottom: 20,
  },
  inviteDetails: {
    alignItems: 'center',
    marginBottom: 24,
  },
  relationshipIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  inviteText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  inviterName: {
    color: Colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  workspaceName: {
    ...Typography.h2,
    color: Colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  relationshipText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  relationshipLabel: {
    color: '#a855f7',
    fontFamily: 'Inter_600SemiBold',
  },
  continueButton: {
    width: '100%',
  },
  tryAnotherButton: {
    paddingVertical: 12,
    marginTop: 8,
  },
  tryAnotherText: {
    ...Typography.bodySm,
    color: Colors.textMuted,
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: 24,
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
  linkButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  linkHighlight: {
    color: Colors.primary,
  },
});
