// app/(auth)/workspace-setup.tsx
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useMemo } from 'react';
import { Colors, Typography, BorderRadius, Spacing } from '../../src/constants/theme';
import { Button } from '../../src/components/ui';
import { createWorkspace, joinWorkspaceByCode, getCurrentUser, isSupabaseReady, supabase, updateOnboardingStatus } from '../../src/lib/supabase';
import { useAppDispatch } from '../../src/hooks/useStore';
import { setWorkspace } from '../../src/store/slices/workspaceSlice';
import { showErrorToast, showSuccessToast, showWarningToast } from '../../src/components/ToastConfig';

export default function WorkspaceSetupScreen() {
  const dispatch = useAppDispatch();
  const { userName, painPoint, persona } = useLocalSearchParams<{ userName?: string; painPoint?: string; persona?: string }>();

  const [vaultName, setVaultName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isCodeFocused, setIsCodeFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [error, setError] = useState('');

  const placeholderText = useMemo(() => {
    if (userName) {
      const firstName = userName.split(' ')[0];
      return `e.g. The ${firstName}'s Family`;
    }
    return 'e.g. The Sharma Family';
  }, [userName]);

  const handleCreateWorkspace = async () => {
    if (!vaultName.trim()) return;

    setError('');
    setIsLoading(true);

    try {
      if (!isSupabaseReady()) {
        dispatch(setWorkspace({
          id: 'demo-workspace',
          name: vaultName.trim(),
          owner_id: 'demo-user',
          created_at: new Date().toISOString(),
        }));
        // Go to guided entry with pain point context
        router.replace({
          pathname: '/(auth)/guided-entry',
          params: {
            painPoint: painPoint || 'insurance',
            workspaceName: vaultName.trim(),
            workspaceId: 'demo-workspace',
            persona: persona || '',
          },
        });
        return;
      }

      let user = await getCurrentUser();

      if (!user && supabase) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data: { session } } = await supabase.auth.getSession();
        user = session?.user || null;
      }

      if (!user) {
        showWarningToast('Session Expired', 'Please sign in again');
        router.replace('/(auth)/sign-in');
        return;
      }

      const workspace = await createWorkspace(vaultName.trim(), user.id);

      dispatch(setWorkspace({
        id: workspace.id,
        name: workspace.name,
        owner_id: workspace.owner_id,
        created_at: workspace.created_at,
      }));

      // Navigate to guided entry instead of family invite
      router.replace({
        pathname: '/(auth)/guided-entry',
        params: {
          painPoint: painPoint || 'insurance',
          workspaceName: workspace.name,
          workspaceId: workspace.id,
          persona: persona || '',
        },
      });
    } catch (err: any) {
      showErrorToast('Failed to Create Vault', err.message || 'Please try again');
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
        dispatch(setWorkspace({
          id: 'demo-workspace',
          name: 'Joined Workspace',
          owner_id: 'other-user',
          created_at: new Date().toISOString(),
        }));
        router.replace('/(tabs)');
        return;
      }

      let user = await getCurrentUser();

      if (!user && supabase) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data: { session } } = await supabase.auth.getSession();
        user = session?.user || null;
      }

      if (!user) {
        showWarningToast('Session Expired', 'Please sign in again');
        router.replace('/(auth)/sign-in');
        return;
      }

      const workspace = await joinWorkspaceByCode(inviteCode.trim(), user.id);

      dispatch(setWorkspace({
        id: workspace.id,
        name: workspace.name,
        owner_id: '',
        created_at: '',
      }));

      await updateOnboardingStatus(user.id, true);

      showSuccessToast('Joined Vault', `Welcome to ${workspace.name}!`);
      router.replace('/(tabs)');
    } catch (err: any) {
      showErrorToast('Failed to Join Vault', err.message || 'Please check the invite code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Persistent Tag */}
      <Text style={styles.buildingTag}>BUILDING YOUR FAMILY'S SECOND BRAIN</Text>

      <View>
        <Text style={styles.title}>
          {showJoinForm ? 'Join a Vault' : 'Name your family\'s brain space'}
        </Text>
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
            <View>
              <Text style={styles.label}>INVITE CODE</Text>
              <TextInput
                style={[styles.input, isCodeFocused ? styles.inputFocused : null]}
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

            <Button
              title={isLoading ? 'Joining...' : 'Join Vault'}
              variant="primary"
              onPress={handleJoinWorkspace}
              disabled={!inviteCode.trim() || isLoading}
              loading={isLoading}
            />

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
            <View>
              <Text style={styles.label}>VAULT NAME</Text>
              <TextInput
                style={[styles.input, isFocused ? styles.inputFocused : null]}
                placeholder={placeholderText}
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

            <Button
              title={isLoading ? 'Creating...' : 'Create Vault'}
              variant="primary"
              onPress={handleCreateWorkspace}
              disabled={!vaultName.trim() || isLoading}
              loading={isLoading}
            />

{/* Join Existing Vault hidden - invite code flow handles this via verify-invite screen */}
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
  buildingTag: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
    letterSpacing: 2,
    marginBottom: Spacing.xl,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 28,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
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
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.5,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
    marginLeft: 4,
    textTransform: 'uppercase',
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
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
});
