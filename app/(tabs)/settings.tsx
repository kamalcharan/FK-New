import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Typography, GlassStyle, BorderRadius } from '../../src/constants/theme';
import { useAppDispatch } from '../../src/hooks/useStore';
import { logout } from '../../src/store/slices/authSlice';
import { clearWorkspace } from '../../src/store/slices/workspaceSlice';
import { supabase } from '../../src/lib/supabase';

export default function SettingsScreen() {
  const dispatch = useAppDispatch();

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
          <View style={styles.settingItem}>
            <Text style={styles.settingIcon}>✨</Text>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Demo Mode</Text>
              <Text style={styles.settingDescription}>Populate with example records</Text>
            </View>
            <View style={styles.toggle}>
              <View style={styles.toggleKnob} />
            </View>
          </View>

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
  toggleKnob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.textMuted,
  },
  logoutItem: {
    marginTop: 12,
  },
  logoutText: {
    ...Typography.body,
    color: Colors.danger,
    fontFamily: 'Inter_600SemiBold',
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
