import { View, Text, StyleSheet, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Colors, Typography, BorderRadius, Spacing } from '../../src/constants/theme';
import { Button } from '../../src/components/ui';

export default function WorkspaceSetupScreen() {
  const [vaultName, setVaultName] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleCreateWorkspace = () => {
    // TODO: Create workspace in Supabase
    router.replace('/(tabs)');
  };

  const handleJoinWorkspace = () => {
    // TODO: Implement join workspace flow
  };

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>Build Your Vault</Text>
        <Text style={styles.subtitle}>Every family needs a name. What's yours?</Text>
      </View>

      <View style={styles.form}>
        {/* Vault Name Input */}
        <View>
          <Text style={styles.label}>VAULT NAME</Text>
          <TextInput
            style={[
              styles.input,
              isFocused && styles.inputFocused,
            ]}
            placeholder="e.g. The Sharma Family"
            placeholderTextColor={Colors.textPlaceholder}
            value={vaultName}
            onChangeText={setVaultName}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

        {/* Create Button */}
        <Button
          title="Create Workspace"
          variant="primary"
          onPress={handleCreateWorkspace}
          disabled={!vaultName.trim()}
        />

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Join Button */}
        <Button
          title="Join Existing Vault"
          variant="secondary"
          onPress={handleJoinWorkspace}
        />
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
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 32,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing['2xl'],
  },
  form: {
    gap: Spacing.lg,
  },
  label: {
    ...Typography.label,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
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
    fontFamily: 'Inter_400Regular',
  },
  inputFocused: {
    borderColor: Colors.text,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
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
    letterSpacing: 2,
  },
});
