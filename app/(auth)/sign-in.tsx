import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { Colors, Typography } from '../../src/constants/theme';

export default function SignInScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>🛡️</Text>
        <Text style={styles.title}>FamilyKnows</Text>
        <Text style={styles.subtitle}>Your data is encrypted & private.</Text>
      </View>

      <View style={styles.buttons}>
        <Pressable style={styles.googleButton}>
          <Text style={styles.googleButtonText}>Sign in with Google</Text>
        </Pressable>

        <Text style={styles.terms}>
          By signing in, you agree to secure your family's future and our Terms of Service.
        </Text>

        <Link href="/(auth)/workspace-setup" style={styles.devLink}>
          <Text style={styles.devLinkText}>[Dev] Skip to Workspace Setup</Text>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 32,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    marginBottom: 48,
  },
  icon: {
    fontSize: 48,
    marginBottom: 24,
  },
  title: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textMuted,
  },
  buttons: {
    gap: 16,
  },
  googleButton: {
    backgroundColor: Colors.google,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  googleButtonText: {
    ...Typography.button,
    color: '#000000',
  },
  terms: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  devLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  devLinkText: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
});
