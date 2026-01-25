import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Colors, Typography, BorderRadius } from '../../src/constants/theme';

export default function WorkspaceSetupScreen() {
  const [vaultName, setVaultName] = useState('');

  const handleCreateWorkspace = () => {
    // TODO: Create workspace in Supabase
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Build Your Vault</Text>
      <Text style={styles.subtitle}>Every family needs a name. What's yours?</Text>

      <View style={styles.form}>
        <Text style={styles.label}>VAULT NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. The Sharma Family"
          placeholderTextColor={Colors.textPlaceholder}
          value={vaultName}
          onChangeText={setVaultName}
        />

        <Pressable
          style={[styles.createButton, !vaultName && styles.createButtonDisabled]}
          onPress={handleCreateWorkspace}
          disabled={!vaultName}
        >
          <Text style={styles.createButtonText}>Create Workspace</Text>
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable style={styles.joinButton}>
          <Text style={styles.joinButtonText}>Join Existing Vault</Text>
        </Pressable>
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
  title: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: 40,
  },
  form: {
    gap: 24,
  },
  label: {
    ...Typography.label,
    color: Colors.textMuted,
    marginBottom: -16,
    marginLeft: 4,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: BorderRadius['2xl'],
    padding: 20,
    color: Colors.text,
    fontSize: 16,
  },
  createButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 20,
    borderRadius: BorderRadius['2xl'],
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    ...Typography.buttonLg,
    color: Colors.text,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.inputBorder,
  },
  dividerText: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  joinButton: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingVertical: 16,
    borderRadius: BorderRadius['2xl'],
    alignItems: 'center',
  },
  joinButtonText: {
    ...Typography.button,
    color: Colors.textSecondary,
  },
});
