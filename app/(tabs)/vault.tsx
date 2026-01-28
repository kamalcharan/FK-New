// app/(tabs)/vault.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Animated,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, GlassStyle, BorderRadius, Spacing } from '../../src/constants/theme';
import { useAppSelector } from '../../src/store';
import {
  getInsurancePoliciesWithMembers,
  getRenewals,
  isSupabaseReady,
  InsurancePolicyWithMembers,
} from '../../src/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;

// Filter tabs
const FILTER_TABS = [
  { key: 'all', label: 'All', icon: '📋' },
  { key: 'health', label: 'Health', icon: '🏥' },
  { key: 'vehicle', label: 'Vehicle', icon: '🚗' },
  { key: 'life', label: 'Life', icon: '🕊️' },
  { key: 'property', label: 'Home', icon: '🏠' },
  { key: 'travel', label: 'Travel', icon: '✈️' },
];

interface Renewal {
  id: string;
  renewal_type: string;
  title: string;
  authority_name?: string;
  expiry_date: string;
  fee_amount?: number;
  status: string;
  is_demo?: boolean;
}

export default function VaultScreen() {
  const router = useRouter();
  const { currentWorkspace } = useAppSelector(state => state.workspace);

  const [policies, setPolicies] = useState<InsurancePolicyWithMembers[]>([]);
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  // Card carousel state
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  // Load data on mount and focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [currentWorkspace?.id])
  );

  const loadData = async () => {
    if (!currentWorkspace?.id || !isSupabaseReady()) {
      setIsLoading(false);
      return;
    }

    try {
      const [policiesData, renewalsData] = await Promise.all([
        getInsurancePoliciesWithMembers(currentWorkspace.id),
        getRenewals(currentWorkspace.id),
      ]);
      setPolicies(policiesData || []);
      setRenewals(renewalsData || []);
    } catch (err) {
      console.error('Error loading vault data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [currentWorkspace?.id]);

  // Filter policies
  const filteredPolicies = activeFilter === 'all'
    ? policies
    : policies.filter(p => p.policy_type === activeFilter);

  // Get expiring soon items (next 30 days)
  const expiringSoon = policies.filter(p => p.days_until_expiry <= 30 && p.days_until_expiry > 0);
  const expiringRenewals = renewals.filter(r => {
    const days = Math.ceil((new Date(r.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days <= 30 && days > 0;
  });

  // Get urgency color
  const getUrgencyColor = (days: number) => {
    if (days <= 7) return Colors.danger;
    if (days <= 15) return Colors.warning;
    if (days <= 30) return '#fbbf24';
    return Colors.success;
  };

  // Format sum
  const formatSum = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(0)}L`;
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

  // Render insurance card
  const renderInsuranceCard = (policy: InsurancePolicyWithMembers, index: number) => {
    const urgencyColor = getUrgencyColor(policy.days_until_expiry);
    const isExpiringSoon = policy.days_until_expiry <= 30;

    return (
      <Pressable
        key={policy.id}
        style={[styles.insuranceCard, isExpiringSoon && { borderColor: urgencyColor }]}
        onPress={() => router.push({ pathname: '/insurance-detail', params: { id: policy.id } })}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTypeIcon}>
            <Text style={styles.cardTypeEmoji}>{policy.subtype_icon || getTypeIcon(policy.policy_type)}</Text>
          </View>
          <View style={styles.cardTitleArea}>
            <Text style={styles.cardProvider}>{policy.provider_name}</Text>
            <Text style={styles.cardScheme}>{policy.scheme_name || policy.subtype_name}</Text>
          </View>
          {policy.is_demo && (
            <View style={styles.demoBadge}>
              <Text style={styles.demoBadgeText}>DEMO</Text>
            </View>
          )}
        </View>

        {/* Sum Insured */}
        <View style={styles.sumInsuredRow}>
          <Text style={styles.sumInsuredLabel}>Sum Insured</Text>
          <Text style={styles.sumInsuredValue}>
            {policy.sum_insured ? formatSum(policy.sum_insured) : 'N/A'}
          </Text>
        </View>

        {/* Policy Number */}
        {policy.policy_number && (
          <View style={styles.policyNumberRow}>
            <Text style={styles.policyNumberLabel}>Policy #</Text>
            <Text style={styles.policyNumberValue}>{policy.policy_number}</Text>
          </View>
        )}

        {/* Covered Members */}
        {policy.covered_members && policy.covered_members.length > 0 && (
          <View style={styles.coveredMembersRow}>
            <Text style={styles.coveredLabel}>COVERED</Text>
            <View style={styles.memberAvatars}>
              {policy.covered_members.slice(0, 4).map((member, idx) => (
                <View
                  key={member.id}
                  style={[
                    styles.memberAvatar,
                    member.is_pending && styles.memberAvatarPending,
                    { marginLeft: idx > 0 ? -8 : 0 },
                  ]}
                >
                  <Text style={styles.memberAvatarEmoji}>{member.relationship_icon || '👤'}</Text>
                </View>
              ))}
              {policy.covered_members.length > 4 && (
                <View style={[styles.memberAvatar, styles.memberAvatarMore, { marginLeft: -8 }]}>
                  <Text style={styles.memberAvatarMoreText}>+{policy.covered_members.length - 4}</Text>
                </View>
              )}
            </View>
            {policy.covered_members.some(m => m.is_pending) && (
              <View style={styles.pendingTag}>
                <Text style={styles.pendingTagText}>PENDING</Text>
              </View>
            )}
          </View>
        )}

        {/* Expiry */}
        <View style={[styles.expiryRow, { borderTopColor: urgencyColor + '30' }]}>
          <View style={styles.expiryInfo}>
            <Text style={styles.expiryLabel}>Valid till</Text>
            <Text style={styles.expiryDate}>
              {new Date(policy.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          <View style={[styles.daysLeftBadge, { backgroundColor: urgencyColor + '20' }]}>
            <Text style={[styles.daysLeftText, { color: urgencyColor }]}>
              {policy.days_until_expiry <= 0 ? 'Expired' : `${policy.days_until_expiry}d left`}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  // Emergency Modal
  const renderEmergencyModal = () => (
    <Modal
      visible={showEmergencyModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowEmergencyModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.emergencySheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.emergencyTitle}>🆘 Emergency Info</Text>
          <Text style={styles.emergencySubtitle}>Quick access to policy details</Text>

          <ScrollView style={styles.emergencyList}>
            {policies.filter(p => p.policy_type === 'health').map(policy => (
              <View key={policy.id} style={styles.emergencyCard}>
                <View style={styles.emergencyCardHeader}>
                  <Text style={styles.emergencyIcon}>{getTypeIcon(policy.policy_type)}</Text>
                  <Text style={styles.emergencyProvider}>{policy.provider_name}</Text>
                </View>

                <View style={styles.emergencyRow}>
                  <Text style={styles.emergencyLabel}>Policy #</Text>
                  <Pressable style={styles.copyButton}>
                    <Text style={styles.emergencyValue}>{policy.policy_number || 'N/A'}</Text>
                    <Ionicons name="copy-outline" size={16} color={Colors.primary} />
                  </Pressable>
                </View>

                {policy.tpa_helpline && (
                  <View style={styles.emergencyRow}>
                    <Text style={styles.emergencyLabel}>TPA Helpline</Text>
                    <Pressable style={styles.copyButton}>
                      <Text style={styles.emergencyValue}>{policy.tpa_helpline}</Text>
                      <Ionicons name="call-outline" size={16} color={Colors.success} />
                    </Pressable>
                  </View>
                )}
              </View>
            ))}

            {policies.filter(p => p.policy_type === 'vehicle').map(policy => (
              <View key={policy.id} style={styles.emergencyCard}>
                <View style={styles.emergencyCardHeader}>
                  <Text style={styles.emergencyIcon}>{getTypeIcon(policy.policy_type)}</Text>
                  <Text style={styles.emergencyProvider}>{policy.provider_name}</Text>
                </View>

                <View style={styles.emergencyRow}>
                  <Text style={styles.emergencyLabel}>Policy #</Text>
                  <Pressable style={styles.copyButton}>
                    <Text style={styles.emergencyValue}>{policy.policy_number || 'N/A'}</Text>
                    <Ionicons name="copy-outline" size={16} color={Colors.primary} />
                  </Pressable>
                </View>
              </View>
            ))}

            {policies.length === 0 && (
              <Text style={styles.noEmergencyText}>No policies added yet</Text>
            )}
          </ScrollView>

          <Pressable style={styles.closeButton} onPress={() => setShowEmergencyModal(false)}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Insurance Vault</Text>
            <Text style={styles.subtitle}>{policies.length} policies</Text>
          </View>
          <Pressable style={styles.emergencyButton} onPress={() => setShowEmergencyModal(true)}>
            <Text style={styles.emergencyButtonIcon}>🆘</Text>
          </Pressable>
        </View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {FILTER_TABS.map(tab => (
            <Pressable
              key={tab.key}
              style={[styles.filterTab, activeFilter === tab.key && styles.filterTabActive]}
              onPress={() => setActiveFilter(tab.key)}
            >
              <Text style={styles.filterIcon}>{tab.icon}</Text>
              <Text style={[styles.filterLabel, activeFilter === tab.key && styles.filterLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Expiring Soon Alert */}
        {(expiringSoon.length > 0 || expiringRenewals.length > 0) && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <Text style={styles.alertText}>
              {expiringSoon.length + expiringRenewals.length} items expiring in 30 days
            </Text>
          </View>
        )}

        {/* Insurance Cards */}
        {filteredPolicies.length > 0 ? (
          <View style={styles.cardsSection}>
            <Text style={styles.sectionTitle}>
              {activeFilter === 'all' ? 'ALL POLICIES' : `${activeFilter.toUpperCase()} POLICIES`}
            </Text>
            {filteredPolicies.map((policy, index) => renderInsuranceCard(policy, index))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🛡️</Text>
            <Text style={styles.emptyTitle}>No {activeFilter === 'all' ? '' : activeFilter} policies</Text>
            <Text style={styles.emptyText}>Add your insurance policies to track them</Text>
          </View>
        )}

        {/* Renewals Section */}
        {renewals.length > 0 && (
          <View style={styles.renewalsSection}>
            <Text style={styles.sectionTitle}>RENEWALS & COMPLIANCE</Text>
            {renewals.map(renewal => {
              const days = Math.ceil((new Date(renewal.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const urgencyColor = getUrgencyColor(days);

              return (
                <Pressable key={renewal.id} style={styles.renewalCard}>
                  <View style={styles.renewalIcon}>
                    <Text style={styles.renewalEmoji}>
                      {renewal.renewal_type === 'property_tax' ? '🏠' :
                       renewal.renewal_type === 'fire_noc' ? '🔥' :
                       renewal.renewal_type === 'pollution' ? '🌿' : '📋'}
                    </Text>
                  </View>
                  <View style={styles.renewalInfo}>
                    <Text style={styles.renewalTitle}>{renewal.title}</Text>
                    <Text style={styles.renewalAuthority}>{renewal.authority_name}</Text>
                  </View>
                  <View style={[styles.renewalDays, { backgroundColor: urgencyColor + '20' }]}>
                    <Text style={[styles.renewalDaysText, { color: urgencyColor }]}>
                      {days}d
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Floating Add Button */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push('/add-insurance')}
      >
        <Ionicons name="add" size={28} color="#000" />
      </Pressable>

      {renderEmergencyModal()}
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: {
    ...Typography.h1,
    color: Colors.text,
  },
  subtitle: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  emergencyButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyButtonIcon: {
    fontSize: 24,
  },
  filterContainer: {
    marginTop: Spacing.md,
  },
  filterContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginRight: Spacing.sm,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterIcon: {
    fontSize: 14,
  },
  filterLabel: {
    ...Typography.bodySm,
    color: Colors.textMuted,
  },
  filterLabelActive: {
    color: Colors.text,
    fontWeight: '600',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    gap: Spacing.sm,
  },
  alertIcon: {
    fontSize: 18,
  },
  alertText: {
    ...Typography.bodySm,
    color: '#fbbf24',
    flex: 1,
  },
  cardsSection: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  insuranceCard: {
    ...GlassStyle,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTypeEmoji: {
    fontSize: 24,
  },
  cardTitleArea: {
    flex: 1,
  },
  cardProvider: {
    ...Typography.h3,
    color: Colors.text,
  },
  cardScheme: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  demoBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  demoBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#a78bfa',
  },
  sumInsuredRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sumInsuredLabel: {
    ...Typography.bodySm,
    color: Colors.textMuted,
  },
  sumInsuredValue: {
    ...Typography.h2,
    color: Colors.text,
  },
  policyNumberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  policyNumberLabel: {
    ...Typography.bodySm,
    color: Colors.textMuted,
  },
  policyNumberValue: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  coveredMembersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  coveredLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.textMuted,
  },
  memberAvatars: {
    flexDirection: 'row',
    flex: 1,
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  memberAvatarPending: {
    borderColor: '#fbbf24',
    borderStyle: 'dashed',
  },
  memberAvatarEmoji: {
    fontSize: 14,
  },
  memberAvatarMore: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  memberAvatarMoreText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.text,
  },
  pendingTag: {
    backgroundColor: 'rgba(251, 191, 36, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pendingTagText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#fbbf24',
  },
  expiryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  expiryInfo: {},
  expiryLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  expiryDate: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
  daysLeftBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  daysLeftText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.xl,
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
    ...Typography.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  renewalsSection: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  renewalCard: {
    ...GlassStyle,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  renewalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  renewalEmoji: {
    fontSize: 20,
  },
  renewalInfo: {
    flex: 1,
  },
  renewalTitle: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
  renewalAuthority: {
    ...Typography.bodySm,
    color: Colors.textMuted,
  },
  renewalDays: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  renewalDaysText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bottomPadding: {
    height: 80,
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.text,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  emergencySheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  emergencyTitle: {
    ...Typography.h2,
    color: Colors.text,
    textAlign: 'center',
  },
  emergencySubtitle: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  emergencyList: {
    maxHeight: 400,
  },
  emergencyCard: {
    ...GlassStyle,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  emergencyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  emergencyIcon: {
    fontSize: 24,
  },
  emergencyProvider: {
    ...Typography.h3,
    color: Colors.text,
  },
  emergencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  emergencyLabel: {
    ...Typography.bodySm,
    color: Colors.textMuted,
  },
  emergencyValue: {
    ...Typography.body,
    color: Colors.text,
    fontFamily: 'monospace',
    marginRight: Spacing.sm,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noEmergencyText: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  closeButtonText: {
    ...Typography.button,
    color: Colors.text,
  },
});
