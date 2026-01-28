// app/family-members.tsx
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, GlassStyle, BorderRadius, Spacing } from '../src/constants/theme';
import { showSuccessToast, showErrorToast } from '../src/components/ToastConfig';
import { useAppSelector } from '../src/store';
import {
  getWorkspaceMembersWithDetails,
  getWorkspaceInvites,
  removeWorkspaceMember,
  revokeInvite,
  isSupabaseReady,
  WorkspaceMember,
} from '../src/lib/supabase';

interface PendingInvite {
  id: string;
  invitee_name: string | null;
  relationship_code: string | null;
  relationship_label: string | null;
  relationship_icon: string | null;
  status: string;
  invite_code: string;
  sent_at: string;
  expires_at: string;
}

export default function FamilyMembersScreen() {
  const { currentWorkspace } = useAppSelector(state => state.workspace);
  const { user } = useAppSelector(state => state.auth);

  // Use Redux state for workspace
  const workspaceId = currentWorkspace?.id;
  const workspaceName = currentWorkspace?.name;

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!workspaceId || !isSupabaseReady()) {
      setIsLoading(false);
      return;
    }

    try {
      const [membersData, invitesData] = await Promise.all([
        getWorkspaceMembersWithDetails(workspaceId),
        getWorkspaceInvites(workspaceId),
      ]);

      setMembers(membersData);

      // Filter to only show pending/sent invites (not accepted or revoked)
      const pending = (invitesData || []).filter(
        (inv: PendingInvite) => ['pending', 'sent', 'opened'].includes(inv.status)
      );
      setPendingInvites(pending);

      // Check if current user is owner
      const currentMember = membersData.find(m => m.user_id === user?.id);
      setIsOwner(currentMember?.is_owner || false);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleRemoveMember = (member: WorkspaceMember) => {
    if (member.is_owner) {
      showErrorToast('Cannot Remove', 'The workspace owner cannot be removed');
      return;
    }

    const isSelf = member.user_id === user?.id;
    const title = isSelf ? 'Leave Family?' : `Remove ${member.full_name}?`;
    const message = isSelf
      ? 'You will no longer have access to this family workspace.'
      : `${member.full_name} will no longer have access to this family workspace.`;

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: isSelf ? 'Leave' : 'Remove',
        style: 'destructive',
        onPress: async () => {
          if (!user?.id || !workspaceId) return;

          try {
            const result = await removeWorkspaceMember(
              workspaceId,
              member.user_id,
              user?.id
            );

            if (result.success) {
              showSuccessToast(
                isSelf ? 'Left Family' : 'Member Removed',
                isSelf ? 'You have left the workspace' : `${member.full_name} has been removed`
              );

              if (isSelf) {
                router.replace('/(auth)/onboarding');
              } else {
                loadData();
              }
            } else {
              showErrorToast('Failed', result.error_message || 'Could not remove member');
            }
          } catch (err: any) {
            showErrorToast('Error', err.message);
          }
        },
      },
    ]);
  };

  const handleRevokeInvite = (invite: PendingInvite) => {
    const name = invite.invitee_name || invite.relationship_label || 'this person';

    Alert.alert('Cancel Invite?', `The invite for ${name} will be revoked.`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          if (!user?.id) return;

          try {
            const result = await revokeInvite(invite.id, user?.id);

            if (result.success) {
              showSuccessToast('Invite Revoked', `Invite for ${name} cancelled`);
              loadData();
            } else {
              showErrorToast('Failed', result.error_message || 'Could not revoke invite');
            }
          } catch (err: any) {
            showErrorToast('Error', err.message);
          }
        },
      },
    ]);
  };

  const handleInviteMore = () => {
    router.push({
      pathname: '/(auth)/family-invite',
      params: { workspaceId, workspaceName },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Family Members</Text>
          <Text style={styles.subtitle}>{workspaceName || 'Your Family'}</Text>
        </View>
        <Pressable style={styles.addButton} onPress={handleInviteMore}>
          <Ionicons name="person-add" size={20} color={Colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Members Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MEMBERS ({members.length})</Text>

          {members.map((member) => (
            <View key={member.member_id} style={styles.memberCard}>
              <View style={styles.memberIcon}>
                <Text style={styles.memberEmoji}>
                  {member.relationship_icon || (member.is_owner ? '👑' : '👤')}
                </Text>
              </View>

              <View style={styles.memberInfo}>
                <View style={styles.memberNameRow}>
                  <Text style={styles.memberName}>{member.full_name}</Text>
                  {member.is_owner && (
                    <View style={styles.ownerBadge}>
                      <Text style={styles.ownerBadgeText}>OWNER</Text>
                    </View>
                  )}
                </View>

                {member.relationship_label && !member.is_owner && (
                  <Text style={styles.memberRelation}>
                    {member.invited_by_name}'s {member.relationship_label}
                  </Text>
                )}

                <Text style={styles.memberJoined}>
                  Joined {new Date(member.joined_at).toLocaleDateString()}
                </Text>
              </View>

              {/* Remove button - only owner can remove others, anyone can remove self */}
              {!member.is_owner && (isOwner || member.user_id === user?.id) && (
                <Pressable
                  style={styles.removeButton}
                  onPress={() => handleRemoveMember(member)}
                >
                  <Ionicons name="close-circle" size={22} color={Colors.danger} />
                </Pressable>
              )}
            </View>
          ))}
        </View>

        {/* Pending Invites Section */}
        {pendingInvites.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PENDING INVITES ({pendingInvites.length})</Text>

            {pendingInvites.map((invite) => (
              <View key={invite.id} style={styles.inviteCard}>
                <View style={styles.memberIcon}>
                  <Text style={styles.memberEmoji}>
                    {invite.relationship_icon || '📨'}
                  </Text>
                </View>

                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {invite.invitee_name || invite.relationship_label || 'Pending'}
                  </Text>
                  <View style={styles.inviteStatus}>
                    <View style={styles.pendingDot} />
                    <Text style={styles.pendingText}>Waiting to accept</Text>
                  </View>
                  <Text style={styles.inviteCode}>Code: {invite.invite_code}</Text>
                </View>

                {isOwner && (
                  <Pressable
                    style={styles.removeButton}
                    onPress={() => handleRevokeInvite(invite)}
                  >
                    <Ionicons name="close-circle" size={22} color={Colors.warning} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Empty state */}
        {!isLoading && members.length === 0 && pendingInvites.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>👨‍👩‍👧‍👦</Text>
            <Text style={styles.emptyTitle}>No Family Members Yet</Text>
            <Text style={styles.emptyText}>
              Invite your family to join and manage finances together
            </Text>
            <Pressable style={styles.inviteButton} onPress={handleInviteMore}>
              <Text style={styles.inviteButtonText}>Invite Family</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Invite Family Button - Fixed at bottom */}
      {(members.length > 0 || pendingInvites.length > 0) && (
        <View style={styles.floatingButtonContainer}>
          <Pressable style={styles.floatingInviteButton} onPress={handleInviteMore}>
            <Ionicons name="person-add" size={20} color={Colors.text} />
            <Text style={styles.floatingInviteText}>Invite Family</Text>
          </Pressable>
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
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
  memberCard: {
    ...GlassStyle,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  inviteCard: {
    ...GlassStyle,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  memberIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberEmoji: {
    fontSize: 24,
  },
  memberInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  memberName: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
  ownerBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ownerBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#a5b4fc',
    letterSpacing: 1,
  },
  memberRelation: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  memberJoined: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  inviteStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fbbf24',
    marginRight: 6,
  },
  pendingText: {
    fontSize: 12,
    color: '#fbbf24',
  },
  inviteCode: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  removeButton: {
    padding: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  inviteButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  inviteButtonText: {
    color: Colors.text,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 100, // Extra padding for floating button
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  floatingInviteButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  floatingInviteText: {
    ...Typography.button,
    color: Colors.text,
  },
});
