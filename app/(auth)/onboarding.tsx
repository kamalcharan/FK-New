import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { Colors, Typography } from '../../src/constants/theme';

export default function OnboardingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>FamilyKnows</Text>
      <Text style={styles.subtitle}>Onboarding screens coming soon</Text>
      <Link href="/(auth)/sign-in" style={styles.link}>
        <Text style={styles.linkText}>Go to Sign In</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  title: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  link: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
  },
  linkText: {
    ...Typography.button,
    color: Colors.text,
  },
});
