// app/renewals.tsx
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, GlassStyle, BorderRadius, Spacing } from '../src/constants/theme';
import { useAppSelector } from '../src/store';
import { getRenewals, getRenewalPresets, isSupabaseReady, RenewalPreset, getOnboardingContext } from '../src/lib/supabase';
import {
  calculateDaysUntilExpiry,
  getRenewalUrgencyStatus,
  getCategoryIcon,
  getIndustryByCode,
} from '../src/constants/renewals';

interface Renewal {
  id: string;
  title: string;
  category?: string;
  subcategory?: string;
  authority_name?: string;
  reference_number?: string;
  expiry_date: string;
  fee_amount?: number;
  status: string;
  preset_code?: string;
  is_demo?: boolean;
}

// Default quick add presets (used when no industry context available)
const DEFAULT_QUICK_ADD_PRESETS = [
  { code: 'fssai_license', icon: '🍽️', title: 'FSSAI License' },
  { code: 'property_tax', icon: '🏠', title: 'Property Tax' },
  { code: 'vehicle_insurance', icon: '🚗', title: 'Vehicle Insurance' },
  { code: 'trade_license', icon: '🏪', title: 'Trade License' },
];

// Industry-specific quick add with proper display info
const INDUSTRY_QUICK_ADD: Record<string, { code: string; icon: string; title: string }[]> = {
  food_service: [
    { code: 'fssai_license', icon: '🍽️', title: 'FSSAI License' },
    { code: 'fire_noc', icon: '🔥', title: 'Fire NOC' },
    { code: 'trade_license', icon: '📜', title: 'Trade License' },
    { code: 'health_license', icon: '🏥', title: 'Health License' },
  ],
  retail: [
    { code: 'trade_license', icon: '📜', title: 'Trade License' },
    { code: 'gst_filing', icon: '📊', title: 'GST Return' },
    { code: 'fire_noc', icon: '🔥', title: 'Fire NOC' },
    { code: 'shop_establishment', icon: '🏪', title: 'Shop License' },
  ],
  manufacturing: [
    { code: 'pollution_consent', icon: '🏭', title: 'Pollution Board' },
    { code: 'factory_license', icon: '⚙️', title: 'Factory License' },
    { code: 'fire_noc', icon: '🔥', title: 'Fire NOC' },
    { code: 'labour_license', icon: '👷', title: 'Labour License' },
  ],
  real_estate: [
    { code: 'property_tax', icon: '🏠', title: 'Property Tax' },
    { code: 'fire_noc', icon: '🔥', title: 'Fire NOC' },
    { code: 'building_plan_approval', icon: '📐', title: 'Building Plan' },
    { code: 'occupancy_certificate', icon: '🏗️', title: 'Occupancy Cert' },
  ],
  healthcare: [
    { code: 'clinical_establishment', icon: '🏥', title: 'Clinic License' },
    { code: 'biomedical_waste', icon: '⚕️', title: 'Biomedical Waste' },
    { code: 'drug_license', icon: '💊', title: 'Drug License' },
    { code: 'fire_noc', icon: '🔥', title: 'Fire NOC' },
  ],
  professional: [
    { code: 'gst_filing', icon: '📊', title: 'GST Return' },
    { code: 'professional_tax', icon: '👔', title: 'Professional Tax' },
    { code: 'trade_license', icon: '📜', title: 'Trade License' },
    { code: 'shop_establishment', icon: '🏪', title: 'Shop License' },
  ],
};

export default function RenewalsScreen() {
  const router = useRouter();
  const { currentWorkspace } = useAppSelector(state => state.workspace);
  const { user } = useAppSelector(state => state.auth);

  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quickAddPresets, setQuickAddPresets] = useState(DEFAULT_QUICK_ADD_PRESETS);

  // Pulsing animation for overdue cards
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

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
      const [data, onboardingCtx] = await Promise.all([
        getRenewals(currentWorkspace.id),
        user?.id ? getOnboardingContext(user.id) : Promise.resolve(null),
      ]);
      setRenewals(data || []);

      // Personalize quick-add based on industry
      if (onboardingCtx?.industry && INDUSTRY_QUICK_ADD[onboardingCtx.industry]) {
        setQuickAddPresets(INDUSTRY_QUICK_ADD[onboardingCtx.industry]);
      }
    } catch (err) {
      console.error('Error loading renewals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [currentWorkspace?.id]);

  // Group renewals by urgency
  const overdueRenewals = renewals.filter(r => calculateDaysUntilExpiry(r.expiry_date) < 0);
  const urgentRenewals = renewals.filter(r => {
    const days = calculateDaysUntilExpiry(r.expiry_date);
    return days >= 0 && days <= 30;
  });
  const upcomingRenewals = renewals.filter(r => calculateDaysUntilExpiry(r.expiry_date) > 30);

  // Calculate totals
  const needsAttentionCount = overdueRenewals.length + urgentRenewals.length;
  const totalEstimatedCost = renewals.reduce((sum, r) => sum + (r.fee_amount || 0), 0);

  // Render overdue card with prominent styling
  const renderOverdueCard = (renewal: Renewal) => {
    const daysOverdue = Math.abs(calculateDaysUntilExpiry(renewal.expiry_date));
    const icon = getCategoryIcon(renewal.category || 'personal');

    return (
      <Animated.View
        key={renewal.id}
        style={[styles.overdueCard, { transform: [{ scale: pulseAnim }] }]}
      >
        <View style={styles.overdueHeader}>
          <View style={styles.overdueIconContainer}>
            <Text style={styles.overdueIcon}>{icon}</Text>
          </View>
          <View style={styles.overdueInfo}>
            <Text style={styles.overdueTitle}>{renewal.title}</Text>
            <Text style={styles.overdueExpiry}>Expired {daysOverdue} days ago</Text>
          </View>
        </View>

        {renewal.reference_number && (
          <View style={styles.referenceBox}>
            <Text style={styles.referenceText}>ID: {renewal.reference_number}</Text>
          </View>
        )}

        <View style={styles.overdueActions}>
          <Pressable
            style={styles.renewNowButton}
            onPress={() => router.push({ pathname: '/renewal-detail', params: { id: renewal.id, action: 'renew' } })}
          >
            <Text style={styles.renewNowButtonText}>Renew Now</Text>
          </Pressable>
          <Pressable
            style={styles.snoozeButton}
            onPress={() => router.push({ pathname: '/renewal-detail', params: { id: renewal.id } })}
          >
            <Text style={styles.snoozeButtonText}>Details</Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  };

  // Render urgent card with amber styling
  const renderUrgentCard = (renewal: Renewal) => {
    const daysLeft = calculateDaysUntilExpiry(renewal.expiry_date);
    const icon = getCategoryIcon(renewal.category || 'personal');

    return (
      <View key={renewal.id} style={styles.urgentCard}>
        <View style={styles.urgentHeader}>
          <View style={styles.urgentIconContainer}>
            <Text style={styles.urgentIcon}>{icon}</Text>
          </View>
          <View style={styles.urgentInfo}>
            <Text style={styles.urgentTitle} numberOfLines={1}>{renewal.title}</Text>
            <Text style={styles.urgentExpiry}>
              {daysLeft === 0 ? 'Expires today!' : `Expires in ${daysLeft} days`}
            </Text>
          </View>
          <Pressable
            style={styles.moreButton}
            onPress={() => router.push({ pathname: '/renewal-detail', params: { id: renewal.id } })}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textMuted} />
          </Pressable>
        </View>

        <Pressable
          style={styles.markRenewedButton}
          onPress={() => router.push({ pathname: '/renewal-detail', params: { id: renewal.id, action: 'renew' } })}
        >
          <Text style={styles.markRenewedButtonText}>Mark as Renewed</Text>
        </Pressable>
      </View>
    );
  };

  // Render upcoming card (simpler)
  const renderUpcomingCard = (renewal: Renewal) => {
    const daysLeft = calculateDaysUntilExpiry(renewal.expiry_date);
    const icon = getCategoryIcon(renewal.category || 'personal');

    return (
      <Pressable
        key={renewal.id}
        style={styles.upcomingCard}
        onPress={() => router.push({ pathname: '/renewal-detail', params: { id: renewal.id } })}
      >
        <Text style={styles.upcomingIcon}>{icon}</Text>
        <View style={styles.upcomingInfo}>
          <Text style={styles.upcomingTitle} numberOfLines={1}>{renewal.title}</Text>
          <Text style={styles.upcomingExpiry}>{daysLeft}d left</Text>
        </View>
        {renewal.fee_amount && (
          <Text style={styles.upcomingCost}>₹{renewal.fee_amount.toLocaleString('en-IN')}</Text>
        )}
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </Pressable>
    );
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </Pressable>
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>Renewals</Text>
            <Text style={styles.headerSubtitle}>{currentWorkspace?.name || 'Family Vault'}</Text>
          </View>
        </View>
{/* Notification button hidden - not implemented yet */}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {renewals.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>No renewals yet</Text>
            <Text style={styles.emptySubtitle}>
              Track licenses, permits, certificates, and subscriptions to never miss a deadline
            </Text>
            <Pressable
              style={styles.emptyButton}
              onPress={() => router.push({ pathname: '/add-renewal', params: { showStories: 'true' } })}
            >
              <Text style={styles.emptyButtonText}>Add your first renewal</Text>
            </Pressable>

            {/* Quick Add Presets in Empty State */}
            <Text style={styles.quickAddTitle}>QUICK ADD</Text>
            <View style={styles.quickAddGrid}>
              {quickAddPresets.map((preset) => (
                <Pressable
                  key={preset.code}
                  style={styles.quickAddCard}
                  onPress={() => router.push({ pathname: '/add-renewal', params: { presetCode: preset.code } })}
                >
                  <Text style={styles.quickAddIcon}>{preset.icon}</Text>
                  <Text style={styles.quickAddLabel}>{preset.title}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <>
            {/* Needs Attention Section */}
            {needsAttentionCount > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Needs Attention</Text>
                  <View style={styles.actionBadge}>
                    <Text style={styles.actionBadgeText}>{needsAttentionCount} ACTIONS REQUIRED</Text>
                  </View>
                </View>

                {/* Overdue cards first */}
                {overdueRenewals.map(renderOverdueCard)}

                {/* Then urgent cards */}
                {urgentRenewals.map(renderUrgentCard)}
              </View>
            )}

            {/* Quick Add Presets */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Add Presets</Text>
              <View style={styles.quickAddGrid}>
                {quickAddPresets.map((preset) => (
                  <Pressable
                    key={preset.code}
                    style={styles.quickAddCard}
                    onPress={() => router.push({ pathname: '/add-renewal', params: { presetCode: preset.code } })}
                  >
                    <Text style={styles.quickAddIcon}>{preset.icon}</Text>
                    <Text style={styles.quickAddLabel}>{preset.title}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Smart Reminder Card */}
            {totalEstimatedCost > 0 && (
              <View style={styles.smartReminderCard}>
                <View style={styles.smartReminderContent}>
                  <Text style={styles.smartReminderTitle}>Smart Reminder</Text>
                  <Text style={styles.smartReminderText}>
                    You have <Text style={styles.smartReminderHighlight}>{renewals.length} active renewals</Text> this year.
                    Total estimated cost:{' '}
                    <Text style={styles.smartReminderAmount}>₹{totalEstimatedCost.toLocaleString('en-IN')}</Text>
                  </Text>
                  <Pressable style={styles.budgetButton}>
                    <Text style={styles.budgetButtonText}>VIEW BUDGET REPORT</Text>
                  </Pressable>
                </View>
                <View style={styles.smartReminderCircle} />
              </View>
            )}

            {/* Upcoming Section */}
            {upcomingRenewals.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Upcoming</Text>
                  <Text style={styles.sectionCount}>{upcomingRenewals.length} items</Text>
                </View>
                {upcomingRenewals.map(renderUpcomingCard)}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push('/add-renewal')}
      >
        <Ionicons name="add" size={28} color="#000" />
      </Pressable>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    ...GlassStyle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitles: {
    gap: 2,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  headerSubtitle: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
    borderWidth: 2,
    borderColor: Colors.surface,
  },

  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 120,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  emptyButton: {
    backgroundColor: Colors.text,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing['2xl'],
  },
  emptyButtonText: {
    ...Typography.button,
    color: Colors.background,
  },

  // Sections
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text,
    fontSize: 18,
  },
  sectionCount: {
    ...Typography.bodySm,
    color: Colors.textMuted,
  },
  actionBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  actionBadgeText: {
    ...Typography.caption,
    color: Colors.danger,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Overdue Card
  overdueCard: {
    backgroundColor: Colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: Colors.danger,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  overdueHeader: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  overdueIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overdueIcon: {
    fontSize: 24,
  },
  overdueInfo: {
    flex: 1,
  },
  overdueTitle: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '700',
    marginBottom: 2,
  },
  overdueExpiry: {
    ...Typography.bodySm,
    color: Colors.danger,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  referenceBox: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  referenceText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: Colors.textMuted,
  },
  overdueActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  renewNowButton: {
    flex: 1,
    backgroundColor: Colors.danger,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  renewNowButtonText: {
    ...Typography.button,
    color: '#fff',
  },
  snoozeButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
  },
  snoozeButtonText: {
    ...Typography.button,
    color: Colors.textMuted,
  },

  // Urgent Card
  urgentCard: {
    backgroundColor: Colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  urgentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  urgentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  urgentIcon: {
    fontSize: 24,
  },
  urgentInfo: {
    flex: 1,
  },
  urgentTitle: {
    ...Typography.bodySm,
    color: Colors.text,
    fontWeight: '700',
    marginBottom: 2,
  },
  urgentExpiry: {
    ...Typography.caption,
    color: Colors.warning,
    fontWeight: '500',
  },
  moreButton: {
    padding: Spacing.xs,
  },
  markRenewedButton: {
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
  },
  markRenewedButtonText: {
    ...Typography.bodySm,
    color: Colors.primary,
    fontWeight: '700',
  },

  // Quick Add
  quickAddTitle: {
    ...Typography.label,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    letterSpacing: 1,
  },
  quickAddGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickAddCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.md,
    alignItems: 'center',
  },
  quickAddIcon: {
    fontSize: 28,
    marginBottom: Spacing.sm,
  },
  quickAddLabel: {
    ...Typography.caption,
    color: Colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Smart Reminder Card
  smartReminderCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius['3xl'],
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  smartReminderContent: {
    zIndex: 1,
  },
  smartReminderTitle: {
    ...Typography.h3,
    color: '#fff',
    marginBottom: Spacing.xs,
  },
  smartReminderText: {
    ...Typography.bodySm,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  smartReminderHighlight: {
    color: '#fff',
    fontWeight: '600',
  },
  smartReminderAmount: {
    color: '#fff',
    fontWeight: '700',
  },
  budgetButton: {
    backgroundColor: '#fff',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  budgetButtonText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  smartReminderCircle: {
    position: 'absolute',
    right: -40,
    bottom: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  // Upcoming Card
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  upcomingIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingTitle: {
    ...Typography.bodySm,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  upcomingExpiry: {
    ...Typography.caption,
    color: Colors.success,
  },
  upcomingCost: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    marginRight: Spacing.sm,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
