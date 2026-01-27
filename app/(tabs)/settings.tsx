// app/(tabs)/settings.tsx
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Colors, Typography, GlassStyle, BorderRadius } from '../../src/constants/theme';
import { useAppDispatch, useAppSelector } from '../../src/hooks/useStore';
import { logout } from '../../src/store/slices/authSlice';
import { clearWorkspace } from '../../src/store/slices/workspaceSlice';
import { signOut, toggleDemoMode, isDemoModeEnabled, isSupabaseReady } from '../../src/lib/supabase';
import { showSuccessToast, showErrorToast } from '../../src/components/ToastConfig';

export default function SettingsScreen() {
  const dispatch = useAppDispatch();
  const { currentWorkspace } = useAppSelector(state => state.workspace);
  const { user } = useAppSelector(state => state.auth);

  const [demoEnabled, setDemoEnabled] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  // Load demo mode status on mount
  useEffect(() => {
    const loadDemoStatus = async () => {
      if (!user?.id || !isSupabaseReady()) return;
      try {
        const enabled = await isDemoModeEnabled(user.id);
        setDemoEnabled(enabled);
      } catch (err) {
        console.error('Error loading demo status:', err);
      }
    };
    loadDemoStatus();
  }, [user?.id]);

  const handleToggleDemoMode = useCallback(async () => {
    if (!currentWorkspace?.id || !user?.id || demoLoading) return;

    const newValue = !demoEnabled;
    setDemoLoading(true);

    try {
      const result = await toggleDemoMode(currentWorkspace.id, user.id, newValue);
      if (result.success) {
        setDemoEnabled(newValue);
        showSuccessToast(
          newValue ? 'Demo Mode Enabled' : 'Demo Mode Disabled',
          result.message
        );
      } else {
        showErrorToast('Error', result.message);
      }
    } catch (err: any) {
      showErrorToast('Error', err.message || 'Failed to toggle demo mode');
    } finally {
      setDemoLoading(false);
    }
  }, [currentWorkspace?.id, user?.id, demoEnabled, demoLoading]);

  const handleViewMembers = () => {
    router.push({
      pathname: '/family-members',
      params: {
        workspaceName: currentWorkspace?.name || 'Family Vault',
        workspaceId: currentWorkspace?.id || '',
      },
    });
  };

  const handleInviteFamily = () => {
    router.push({
      pathname: '/(auth)/family-invite',
      params: {
        workspaceName: currentWorkspace?.name || 'Family Vault',
        workspaceId: currentWorkspace?.id || '',
      },
    });
  };

  const handleBackup = () => {
    router.push('/backup');
  };

  const handleLogout = async () => {
    await signOut();
    dispatch(logout());
    dispatch(clearWorkspace());
    router.replace('/(auth)/onboarding');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>MANAGE YOUR LEGACY</Text>

        <View style={styles.section}>
          <Pressable style={styles.settingItem} onPress={handleViewMembers}>
            <Text style={styles.settingIcon}>👥</Text>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Family Members</Text>
              <Text style={styles.settingDescription}>View and manage members</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <Pressable style={styles.settingItem} onPress={handleInviteFamily}>
            <Text style={styles.settingIcon}>➕</Text>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Invite Family</Text>
              <Text style={styles.settingDescription}>Add family to {currentWorkspace?.name || 'your vault'}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <Pressable style={styles.settingItem} onPress={handleToggleDemoMode} disabled={demoLoading}>
            <Text style={styles.settingIcon}>✨</Text>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Demo Mode</Text>
              <Text style={styles.settingDescription}>
                {demoEnabled ? 'Sample records are showing' : 'Populate with example records'}
              </Text>
            </View>
            {demoLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <View style={[styles.toggle, demoEnabled && styles.toggleActive]}>
                <View style={[styles.toggleKnob, demoEnabled && styles.toggleKnobActive]} />
              </View>
            )}
          </Pressable>

          <Pressable style={styles.settingItem} onPress={handleBackup}>
            <Text style={styles.settingIcon}>☁️</Text>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Backup & Restore</Text>
              <Text style={styles.settingDescription}>Sync with Google Drive</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <View style={styles.settingItem}>
            <Text style={styles.settingIcon}>🔔</Text>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Notification Methods</Text>
              <Text style={styles.settingDescription}>Push, SMS & WhatsApp</Text>
            </View>
          </View>

          <Pressable style={[styles.settingItem, styles.logoutItem]} onPress={handleLogout}>
            <Text style={styles.settingIcon}>🚪</Text>
            <View style={styles.settingText}>
              <Text style={styles.logoutText}>Logout</Text>
            </View>
          </Pressable>
        </View>

        <Text style={styles.footer}>
          FamilyKnows ensures that critical information never slips through the cracks, keeping your family secure across generations.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingBottom: 120,
  },
  title: {
    ...Typography.h1,
    color: Colors.text,
    marginTop: 16,
  },
  subtitle: {
    ...Typography.label,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: 32,
  },
  section: {
    gap: 12,
  },
  settingItem: {
    ...GlassStyle,
    borderRadius: BorderRadius.xl,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  settingIcon: {
    fontSize: 20,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    ...Typography.body,
    color: Colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  settingDescription: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  toggle: {
    width: 48,
    height: 24,
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    padding: 4,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleKnob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.textMuted,
  },
  toggleKnobActive: {
    backgroundColor: Colors.text,
    alignSelf: 'flex-end',
  },
  logoutItem: {
    marginTop: 12,
  },
  logoutText: {
    ...Typography.body,
    color: Colors.danger,
    fontFamily: 'Inter_600SemiBold',
  },
  chevron: {
    fontSize: 24,
    color: Colors.textMuted,
  },
  footer: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 'auto',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});
