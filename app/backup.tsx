// app/backup.tsx
// Google Drive Backup & Restore screen

import { View, Text, StyleSheet, Pressable, ScrollView, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, GlassStyle, BorderRadius, Spacing } from '../src/constants/theme';
import { showSuccessToast, showErrorToast, showWarningToast } from '../src/components/ToastConfig';
import { useAppSelector } from '../src/hooks/useStore';
import { getCurrentUser } from '../src/lib/supabase';
import { DriveFile } from '../src/lib/googleAuth';
import {
  isDriveBackupAvailable,
  createDriveBackup,
  listDriveBackups,
  downloadBackup,
  deleteDriveBackup,
  restoreFromBackup,
} from '../src/lib/backup';
import {
  useGoogleAuth,
  exchangeCodeForTokens,
  storeGoogleTokens,
  isGoogleAuthConfigured,
} from '../src/lib/googleAuth';

export default function BackupScreen() {
  const { currentWorkspace } = useAppSelector(state => state.workspace);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backups, setBackups] = useState<DriveFile[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Google Auth hook for connecting Drive
  const { request: googleRequest, response: googleResponse, promptAsync: googlePromptAsync, redirectUri } = useGoogleAuth();

  // Check if Drive is connected
  const checkConnection = useCallback(async () => {
    const available = await isDriveBackupAvailable();
    setIsConnected(available);
    if (available) {
      await loadBackups();
    }
    setIsLoading(false);
  }, []);

  // Load backup list
  const loadBackups = async () => {
    try {
      const files = await listDriveBackups();
      setBackups(files);
    } catch (err) {
      console.error('Error loading backups:', err);
    }
  };

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Handle Google OAuth response for connecting Drive
  useEffect(() => {
    const handleResponse = async () => {
      if (googleResponse?.type === 'success' && googleResponse.params.code) {
        setIsLoading(true);
        try {
          const tokens = await exchangeCodeForTokens(
            googleResponse.params.code,
            googleRequest?.codeVerifier || '',
            redirectUri
          );

          if (tokens) {
            await storeGoogleTokens({
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
            });
            setIsConnected(true);
            showSuccessToast('Connected!', 'Google Drive connected successfully');
            await loadBackups();
          } else {
            showErrorToast('Connection Failed', 'Could not connect to Google Drive');
          }
        } catch (err: any) {
          showErrorToast('Error', err.message || 'Connection failed');
        } finally {
          setIsLoading(false);
        }
      }
    };

    handleResponse();
  }, [googleResponse]);

  const handleConnectDrive = async () => {
    if (!isGoogleAuthConfigured()) {
      showWarningToast('Not Configured', 'Google Sign-In is not configured yet');
      return;
    }

    try {
      await googlePromptAsync();
    } catch (err) {
      showErrorToast('Error', 'Could not start Google authorization');
    }
  };

  const handleCreateBackup = async () => {
    if (!currentWorkspace?.id) {
      showErrorToast('Error', 'No workspace selected');
      return;
    }

    setIsBackingUp(true);
    try {
      const file = await createDriveBackup(currentWorkspace.id);
      if (file) {
        showSuccessToast('Backup Created', `Saved to Google Drive`);
        await loadBackups();
      } else {
        showErrorToast('Backup Failed', 'Could not create backup');
      }
    } catch (err: any) {
      showErrorToast('Error', err.message || 'Backup failed');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreBackup = (backup: DriveFile) => {
    Alert.alert(
      'Restore Backup?',
      `This will import data from "${backup.name}". Existing records will be merged.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            setIsRestoring(true);
            try {
              const data = await downloadBackup(backup.id);
              if (!data) {
                showErrorToast('Error', 'Could not download backup');
                return;
              }

              const user = await getCurrentUser();
              if (!user) {
                showErrorToast('Error', 'Please sign in to restore');
                return;
              }

              const result = await restoreFromBackup(data, user.id);
              if (result.success) {
                showSuccessToast('Restored!', result.message);
              } else {
                showErrorToast('Restore Failed', result.message);
              }
            } catch (err: any) {
              showErrorToast('Error', err.message || 'Restore failed');
            } finally {
              setIsRestoring(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteBackup = (backup: DriveFile) => {
    Alert.alert(
      'Delete Backup?',
      `"${backup.name}" will be permanently deleted from Google Drive.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteDriveBackup(backup.id);
            if (success) {
              showSuccessToast('Deleted', 'Backup removed from Drive');
              await loadBackups();
            } else {
              showErrorToast('Error', 'Could not delete backup');
            }
          },
        },
      ]
    );
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBackups();
    setRefreshing(false);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatSize = (bytes: string | undefined) => {
    if (!bytes) return '';
    const size = parseInt(bytes, 10);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Checking Google Drive...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Backup & Restore</Text>
          <Text style={styles.subtitle}>Sync with Google Drive</Text>
        </View>
        {isConnected && (
          <View style={styles.connectedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
          </View>
        )}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          isConnected ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          ) : undefined
        }
      >
        {/* Drive Connection Status */}
        {!isConnected ? (
          <View style={styles.connectSection}>
            <View style={styles.driveIcon}>
              <Ionicons name="cloud-outline" size={48} color={Colors.textMuted} />
            </View>
            <Text style={styles.connectTitle}>Connect Google Drive</Text>
            <Text style={styles.connectDesc}>
              Backup your family vault to Google Drive. Your data stays private - only you can access it.
            </Text>
            <Pressable
              style={[styles.connectButton, !googleRequest && styles.buttonDisabled]}
              onPress={handleConnectDrive}
              disabled={!googleRequest}
            >
              <Ionicons name="logo-google" size={20} color="#fff" />
              <Text style={styles.connectButtonText}>Connect Google Drive</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Backup Actions */}
            <View style={styles.section}>
              <Pressable
                style={[styles.backupButton, isBackingUp && styles.buttonDisabled]}
                onPress={handleCreateBackup}
                disabled={isBackingUp}
              >
                {isBackingUp ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="cloud-upload" size={24} color="#fff" />
                )}
                <View style={styles.backupButtonText}>
                  <Text style={styles.backupTitle}>
                    {isBackingUp ? 'Creating Backup...' : 'Backup Now'}
                  </Text>
                  <Text style={styles.backupDesc}>
                    Save {currentWorkspace?.name || 'your vault'} to Drive
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Backup List */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                SAVED BACKUPS ({backups.length})
              </Text>

              {backups.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="folder-open-outline" size={32} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>No backups yet</Text>
                  <Text style={styles.emptyDesc}>
                    Create your first backup to secure your data
                  </Text>
                </View>
              ) : (
                backups.map((backup) => (
                  <View key={backup.id} style={styles.backupCard}>
                    <View style={styles.backupIcon}>
                      <Ionicons name="document-text" size={24} color={Colors.primary} />
                    </View>
                    <View style={styles.backupInfo}>
                      <Text style={styles.backupName} numberOfLines={1}>
                        {backup.name.replace('.json', '').replace(/FamilyKnows_/g, '')}
                      </Text>
                      <Text style={styles.backupMeta}>
                        {formatDate(backup.modifiedTime)}
                        {backup.size && ` • ${formatSize(backup.size)}`}
                      </Text>
                    </View>
                    <View style={styles.backupActions}>
                      <Pressable
                        style={styles.actionButton}
                        onPress={() => handleRestoreBackup(backup)}
                        disabled={isRestoring}
                      >
                        <Ionicons name="download-outline" size={20} color={Colors.primary} />
                      </Pressable>
                      <Pressable
                        style={styles.actionButton}
                        onPress={() => handleDeleteBackup(backup)}
                      >
                        <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Info */}
            <View style={styles.infoSection}>
              <Ionicons name="information-circle" size={16} color={Colors.textMuted} />
              <Text style={styles.infoText}>
                Backups are stored in a "FamilyKnows Backups" folder in your Google Drive.
                Only you have access to these files.
              </Text>
            </View>
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Restoring Overlay */}
      {isRestoring && (
        <View style={styles.overlay}>
          <View style={styles.overlayContent}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.overlayText}>Restoring backup...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.bodySm,
    color: Colors.textMuted,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  title: {
    ...Typography.h2,
    color: Colors.text,
  },
  subtitle: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  connectedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  connectSection: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.xl,
  },
  driveIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  connectTitle: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  connectDesc: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  connectButtonText: {
    ...Typography.button,
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  section: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  backupButton: {
    ...GlassStyle,
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    borderColor: 'rgba(99, 102, 241, 0.4)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  backupButtonText: {
    flex: 1,
  },
  backupTitle: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
  backupDesc: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  backupCard: {
    ...GlassStyle,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  backupIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backupInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  backupName: {
    ...Typography.bodySm,
    color: Colors.text,
    fontWeight: '500',
  },
  backupMeta: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  backupActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  emptyDesc: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    marginTop: 4,
  },
  infoSection: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    ...Typography.bodySm,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  bottomPadding: {
    height: 40,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContent: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  overlayText: {
    ...Typography.body,
    color: Colors.text,
  },
});
