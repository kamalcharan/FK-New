// app/insurance-detail.tsx
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Colors, Typography, GlassStyle, BorderRadius, Spacing } from '../src/constants/theme';
import { showSuccessToast, showErrorToast } from '../src/components/ToastConfig';
import { useAppSelector } from '../src/store';
import {
  getInsurancePoliciesWithMembers,
  deleteInsurancePolicy,
  isSupabaseReady,
  InsurancePolicyWithMembers,
} from '../src/lib/supabase';

export default function InsuranceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentWorkspace } = useAppSelector(state => state.workspace);

  const [policy, setPolicy] = useState<InsurancePolicyWithMembers | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadPolicy();
  }, [id, currentWorkspace?.id]);

  const loadPolicy = async () => {
    if (!id || !currentWorkspace?.id || !isSupabaseReady()) {
      setIsLoading(false);
      return;
    }

    try {
      const policies = await getInsurancePoliciesWithMembers(currentWorkspace.id);
      const found = policies.find(p => p.id === id);
      setPolicy(found || null);
    } catch (err) {
      console.error('Error loading policy:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPolicy();
    setRefreshing(false);
  }, [id, currentWorkspace?.id]);

  // Copy to clipboard
  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    showSuccessToast('Copied', `${label} copied to clipboard`);
  };

  // Call helpline
  const callHelpline = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  // Share policy info
  const sharePolicy = async () => {
    if (!policy) return;

    const message = `
Insurance Policy Details
------------------------
Provider: ${policy.provider_name}
${policy.scheme_name ? `Plan: ${policy.scheme_name}` : ''}
Policy #: ${policy.policy_number || 'N/A'}
Sum Insured: ${policy.sum_insured ? formatSum(policy.sum_insured) : 'N/A'}
Valid till: ${new Date(policy.expiry_date).toLocaleDateString('en-IN')}
${policy.tpa_helpline ? `TPA Helpline: ${policy.tpa_helpline}` : ''}
    `.trim();

    try {
      await Share.share({ message });
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  // Delete policy
  const handleDelete = () => {
    Alert.alert(
      'Delete Policy?',
      'This action cannot be undone. All data for this policy will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            setIsDeleting(true);
            try {
              await deleteInsurancePolicy(id);
              showSuccessToast('Deleted', 'Policy has been removed');
              router.back();
            } catch (err: any) {
              showErrorToast('Error', err.message || 'Failed to delete');
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  // Format sum
  const formatSum = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(0)} Lakhs`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      health: '🏥',
      vehicle: '🚗',
      life: '🕊️',
      property: '🏠',
      travel: '✈️',
      other: '📄',
    };
    return icons[type] || '📄';
  };

  // Get urgency color
  const getUrgencyColor = (days: number) => {
    if (days <= 0) return Colors.danger;
    if (days <= 7) return Colors.danger;
    if (days <= 15) return Colors.warning;
    if (days <= 30) return '#fbbf24';
    return Colors.success;
  };

  // Calculate validity progress
  const getValidityProgress = () => {
    if (!policy?.start_date || !policy?.expiry_date) return 0;
    const start = new Date(policy.start_date).getTime();
    const end = new Date(policy.expiry_date).getTime();
    const now = Date.now();
    const total = end - start;
    const elapsed = now - start;
    return Math.min(Math.max(elapsed / total, 0), 1);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!policy) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Policy Details</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>Policy Not Found</Text>
          <Text style={styles.emptyText}>This policy may have been deleted</Text>
        </View>
      </SafeAreaView>
    );
  }

  const urgencyColor = getUrgencyColor(policy.days_until_expiry);
  const validityProgress = getValidityProgress();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Policy Details</Text>
        <Pressable style={styles.shareButton} onPress={sharePolicy}>
          <Ionicons name="share-outline" size={22} color={Colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Hero Card */}
        <View style={[styles.heroCard, { borderColor: urgencyColor + '50' }]}>
          <View style={styles.heroHeader}>
            <View style={styles.heroIcon}>
              <Text style={styles.heroEmoji}>{policy.subtype_icon || getTypeIcon(policy.policy_type)}</Text>
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroType}>{policy.policy_type.toUpperCase()}</Text>
              <Text style={styles.heroSubtype}>{policy.subtype_name || 'General'}</Text>
            </View>
            {policy.is_demo && (
              <View style={styles.demoBadge}>
                <Text style={styles.demoBadgeText}>DEMO</Text>
              </View>
            )}
          </View>

          <Text style={styles.providerName}>{policy.provider_name}</Text>
          {policy.scheme_name && <Text style={styles.schemeName}>{policy.scheme_name}</Text>}

          {/* Sum Insured */}
          <View style={styles.sumSection}>
            <Text style={styles.sumLabel}>Sum Insured</Text>
            <Text style={styles.sumValue}>
              {policy.sum_insured ? formatSum(policy.sum_insured) : 'Not specified'}
            </Text>
          </View>

          {/* Validity Bar */}
          <View style={styles.validitySection}>
            <View style={styles.validityHeader}>
              <Text style={styles.validityLabel}>Validity</Text>
              <View style={[styles.daysLeftBadge, { backgroundColor: urgencyColor + '20' }]}>
                <Text style={[styles.daysLeftText, { color: urgencyColor }]}>
                  {policy.days_until_expiry <= 0 ? 'Expired' : `${policy.days_until_expiry} days left`}
                </Text>
              </View>
            </View>
            <View style={styles.validityBar}>
              <View style={[styles.validityProgress, { width: `${validityProgress * 100}%`, backgroundColor: urgencyColor }]} />
            </View>
            <View style={styles.validityDates}>
              <Text style={styles.validityDate}>
                {policy.start_date ? new Date(policy.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
              </Text>
              <Text style={styles.validityDate}>
                {new Date(policy.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>
        </View>

        {/* Policy Number Section */}
        {policy.policy_number && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>POLICY NUMBER</Text>
            <Pressable
              style={styles.copyableRow}
              onPress={() => copyToClipboard(policy.policy_number!, 'Policy number')}
            >
              <Text style={styles.copyableValue}>{policy.policy_number}</Text>
              <Ionicons name="copy-outline" size={20} color={Colors.primary} />
            </Pressable>
          </View>
        )}

        {/* Premium Section */}
        {policy.premium_amount && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PREMIUM</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Amount</Text>
                <Text style={styles.infoValue}>₹{policy.premium_amount.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Frequency</Text>
                <Text style={styles.infoValue}>
                  {policy.premium_frequency ? policy.premium_frequency.charAt(0).toUpperCase() + policy.premium_frequency.slice(1) : 'Yearly'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Covered Members Section */}
        {policy.covered_members && policy.covered_members.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>COVERED MEMBERS ({policy.covered_members.length})</Text>
            <View style={styles.membersCard}>
              {policy.covered_members.map(member => (
                <View key={member.id} style={styles.memberRow}>
                  <View style={[styles.memberAvatar, member.is_pending && styles.memberAvatarPending]}>
                    <Text style={styles.memberEmoji}>{member.relationship_icon || '👤'}</Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.full_name}</Text>
                    <Text style={styles.memberRelation}>{member.relationship_label}</Text>
                  </View>
                  {member.is_pending && (
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>PENDING</Text>
                    </View>
                  )}
                  {member.is_external && (
                    <View style={styles.externalBadge}>
                      <Text style={styles.externalBadgeText}>EXTERNAL</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* TPA Section (Health) */}
        {(policy.tpa_name || policy.tpa_helpline) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TPA DETAILS</Text>
            <View style={styles.infoCard}>
              {policy.tpa_name && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>TPA Name</Text>
                  <Text style={styles.infoValue}>{policy.tpa_name}</Text>
                </View>
              )}
              {policy.tpa_helpline && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Helpline</Text>
                  <Pressable style={styles.callButton} onPress={() => callHelpline(policy.tpa_helpline!)}>
                    <Text style={styles.callButtonText}>{policy.tpa_helpline}</Text>
                    <Ionicons name="call" size={18} color={Colors.success} />
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Agent Section */}
        {(policy.agent_name || policy.agent_phone) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AGENT DETAILS</Text>
            <View style={styles.infoCard}>
              {policy.agent_name && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoValue}>{policy.agent_name}</Text>
                </View>
              )}
              {policy.agent_phone && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Pressable style={styles.callButton} onPress={() => callHelpline(policy.agent_phone!)}>
                    <Text style={styles.callButtonText}>{policy.agent_phone}</Text>
                    <Ionicons name="call" size={18} color={Colors.success} />
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Notes Section */}
        {policy.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NOTES</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{policy.notes}</Text>
            </View>
          </View>
        )}

        {/* Document Section */}
        {policy.document_url && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DOCUMENT</Text>
            <Pressable style={styles.documentCard}>
              <Ionicons name="document-text" size={32} color={Colors.primary} />
              <View style={styles.documentInfo}>
                <Text style={styles.documentTitle}>Policy Document</Text>
                <Text style={styles.documentSubtitle}>Tap to view</Text>
              </View>
              <Ionicons name="open-outline" size={20} color={Colors.textMuted} />
            </Pressable>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsSection}>
          <Pressable
            style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
            onPress={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={Colors.danger} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                <Text style={styles.deleteButtonText}>Delete Policy</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    ...Typography.h3,
    color: Colors.text,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  heroCard: {
    ...GlassStyle,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    borderWidth: 2,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroEmoji: {
    fontSize: 28,
  },
  heroInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  heroType: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: Colors.primary,
  },
  heroSubtype: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  demoBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  demoBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#a78bfa',
  },
  providerName: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  schemeName: {
    ...Typography.body,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },
  sumSection: {
    marginBottom: Spacing.lg,
  },
  sumLabel: {
    ...Typography.bodySm,
    color: Colors.textMuted,
  },
  sumValue: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
  },
  validitySection: {
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  validityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  validityLabel: {
    ...Typography.bodySm,
    color: Colors.textMuted,
  },
  daysLeftBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  daysLeftText: {
    fontSize: 12,
    fontWeight: '700',
  },
  validityBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  validityProgress: {
    height: '100%',
    borderRadius: 3,
  },
  validityDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  validityDate: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  copyableRow: {
    ...GlassStyle,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  copyableValue: {
    ...Typography.h3,
    color: Colors.text,
    fontFamily: 'monospace',
  },
  infoCard: {
    ...GlassStyle,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  infoLabel: {
    ...Typography.body,
    color: Colors.textMuted,
  },
  infoValue: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  callButtonText: {
    ...Typography.body,
    color: Colors.success,
    fontWeight: '600',
  },
  membersCard: {
    ...GlassStyle,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarPending: {
    borderWidth: 2,
    borderColor: '#fbbf24',
    borderStyle: 'dashed',
  },
  memberEmoji: {
    fontSize: 20,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
  memberRelation: {
    ...Typography.bodySm,
    color: Colors.textMuted,
  },
  pendingBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  pendingBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fbbf24',
  },
  externalBadge: {
    backgroundColor: 'rgba(156, 163, 175, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  externalBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9ca3af',
  },
  notesCard: {
    ...GlassStyle,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  notesText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  documentCard: {
    ...GlassStyle,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
  documentSubtitle: {
    ...Typography.bodySm,
    color: Colors.textMuted,
  },
  actionsSection: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    ...Typography.button,
    color: Colors.danger,
  },
  bottomPadding: {
    height: 40,
  },
});
