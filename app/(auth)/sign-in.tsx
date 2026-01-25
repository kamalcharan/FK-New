// app/(auth)/sign-in.tsx
import { View, Text, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography, Spacing } from '../../src/constants/theme';
import { Button } from '../../src/components/ui';

export default function SignInScreen() {
  const handleGoogleSignIn = () => {
    // TODO: Implement Google OAuth with Supabase
    // For now, navigate to workspace setup
    router.push('/(auth)/workspace-setup');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Shield Icon */}
        <View style={styles.iconWrapper}>
          <Text style={styles.icon}>🛡️</Text>
        </View>

        {/* App Name */}
        <Text style={styles.title}>FamilyKnows</Text>

        {/* Privacy Message */}
        <Text style={styles.subtitle}>Your data is encrypted & private.</Text>
      </View>

      <View style={styles.buttons}>
        {/* Google Sign In Button */}
        <Button
          title="Sign in with Google"
          variant="white"
          onPress={handleGoogleSignIn}
          icon={
            <Image
              source={{ uri: 'https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png' }}
              style={styles.googleIcon}
            />
          }
        />

        {/* Terms */}
        <Text style={styles.terms}>
          By signing in, you agree to secure your family's future and our Terms of Service.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  iconWrapper: {
    marginBottom: Spacing['2xl'],
  },
  icon: {
    fontSize: 56,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 32,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textMuted,
  },
  buttons: {
    gap: Spacing.md,
  },
  googleIcon: {
    width: 24,
    height: 24,
  },
  terms: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    lineHeight: 16,
  },
});
