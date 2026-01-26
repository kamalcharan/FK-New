// app/(auth)/workspace-setup.tsx
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Colors, Typography, BorderRadius, Spacing } from '../../src/constants/theme';
import { Button } from '../../src/components/ui';
import { createWorkspace, joinWorkspaceByCode, getCurrentUser, isSupabaseReady } from '../../src/lib/supabase';
import { useAppDispatch } from '../../src/hooks/useStore';
import { setWorkspace } from '../../src/store/slices/workspaceSlice';

export default function WorkspaceSetupScreen() {
  const dispatch = useAppDispatch();
  const [vaultName, setVaultName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isCodeFocused, setIsCodeFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [error, setError] = useState('');

  const handleCreateWorkspace = async () => {
    if (!vaultName.trim()) return;

    setError('');
    setIsLoading(true);

    try {
      if (!isSupabaseReady()) {
        // Demo mode
        dispatch(setWorkspace({
          id: 'demo-workspace',
          name: vaultName.trim(),
          owner_id: 'demo-user',
          created_at: new Date().toISOString(),
        }));
        router.replace('/(tabs)');
        return;
      }

      const user = await getCurrentUser();
      if (!user) {
        setError('Please sign in again');
        router.replace('/(auth)/sign-in');
        return;
      }

      const workspace = await createWorkspace(vaultName.trim(), user.id);

      // Update Redux store
      dispatch(setWorkspace({
        id: workspace.id,
        name: workspace.name,
        owner_id: workspace.owner_id,
        created_at: workspace.created_at,
      }));

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Create workspace error:', err);
      setError(err.message || 'Failed to create workspace');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinWorkspace = async () => {
    if (!inviteCode.trim()) return;

    setError('');
    setIsLoading(true);

    try {
      if (!isSupabaseReady()) {
        // Demo mode
        dispatch(setWorkspace({
          id: 'demo-workspace',
          name: 'Joined Workspace',
          owner_id: 'other-user',
          created_at: new Date().toISOString(),
        }));
        router.replace('/(tabs)');
        return;
      }

      const user = await getCurrentUser();
      if (!user) {
        setError('Please sign in again');
        router.replace('/(auth)/sign-in');
        return;
      }

      const workspace = await joinWorkspaceByCode(inviteCode.trim(), user.id);

      // Update Redux store
      dispatch(setWorkspace({
        id: workspace.id,
        name: workspace.name,
        owner_id: '',
        created_at: '',
      }));

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Join workspace error:', err);
      setError(err.message || 'Failed to join workspace');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>{showJoinForm ? 'Join a Vault' : 'Build Your Vault'}</Text>
        <Text style={styles.subtitle}>
          {showJoinForm
            ? 'Enter the invite code shared with you'
            : 'Every family needs a name. What\'s yours?'}
        </Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.form}>
        {showJoinForm ? (
          <>
            {/* Invite Code Input */}
            <View>
              <Text style={styles.label}>INVITE CODE</Text>
              <TextInput
                style={[
                  styles.input,
                  isCodeFocused ? styles.inputFocused : null,
                ]}
                placeholder="Enter invite code"
                placeholderTextColor={Colors.textPlaceholder}
                value={inviteCode}
                onChangeText={(text) => {
                  setInviteCode(text.toUpperCase());
                  setError('');
                }}
                onFocus={() => setIsCodeFocused(true)}
                onBlur={() => setIsCodeFocused(false)}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            {/* Join Button */}
            <Button
              title={isLoading ? 'Joining...' : 'Join Vault'}
              variant="primary"
              onPress={handleJoinWorkspace}
              disabled={!inviteCode.trim() || isLoading}
              loading={isLoading}
            />

            {/* Back to Create */}
            <Button
              title="Create New Vault Instead"
              variant="secondary"
              onPress={() => {
                setShowJoinForm(false);
                setError('');
              }}
            />
          </>
        ) : (
          <>
            {/* Vault Name Input */}
            <View>
              <Text style={styles.label}>VAULT NAME</Text>
              <TextInput
                style={[
                  styles.input,
                  isFocused ? styles.inputFocused : null,
                ]}
                placeholder="e.g. The Sharma Family"
                placeholderTextColor={Colors.textPlaceholder}
                value={vaultName}
                onChangeText={(text) => {
                  setVaultName(text);
                  setError('');
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            {/* Create Button */}
            <Button
              title={isLoading ? 'Creating...' : 'Create Vault'}
              variant="primary"
              onPress={handleCreateWorkspace}
              disabled={!vaultName.trim() || isLoading}
              loading={isLoading}
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
              onPress={() => {
                setShowJoinForm(true);
                setError('');
              }}
            />
          </>
        )}
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
    marginBottom: Spacing.lg,
  },
  error: {
    ...Typography.bodySm,
    color: Colors.danger,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
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
