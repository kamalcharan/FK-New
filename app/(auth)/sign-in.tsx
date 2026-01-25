import { View, Text, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/constants/theme';
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
        <Animated.View entering={FadeIn.delay(200).duration(600)} style={styles.iconWrapper}>
          <Text style={styles.icon}>🛡️</Text>
        </Animated.View>

        {/* App Name */}
        <Animated.View entering={FadeInUp.delay(400).duration(600)}>
          <Text style={styles.title}>FamilyKnows</Text>
        </Animated.View>

        {/* Privacy Message */}
        <Animated.View entering={FadeInUp.delay(500).duration(600)}>
          <Text style={styles.subtitle}>Your data is encrypted & private.</Text>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.delay(600).duration(600)} style={styles.buttons}>
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
      </Animated.View>
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
