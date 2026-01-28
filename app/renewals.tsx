// app/renewals.tsx
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, GlassStyle, BorderRadius, Spacing } from '../src/constants/theme';
import { useAppSelector } from '../src/store';
import { getRenewals, isSupabaseReady } from '../src/lib/supabase';
import {
  calculateDaysUntilExpiry,
  getRenewalUrgencyStatus,
  getCategoryIcon,
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

export default function RenewalsScreen() {
  const router = useRouter();
  const { currentWorkspace } = useAppSelector(state => state.workspace);

  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      const data = await getRenewals(currentWorkspace.id);
      setRenewals(data || []);
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

  const renderRenewalCard = (renewal: Renewal) => {
    const daysUntilExpiry = calculateDaysUntilExpiry(renewal.expiry_date);
    const urgency = getRenewalUrgencyStatus(daysUntilExpiry);
    const icon = getCategoryIcon(renewal.category || 'personal');

    return (
      <Pressable
        key={renewal.id}
        style={[
          styles.renewalCard,
          daysUntilExpiry < 0 && styles.renewalCardOverdue,
          daysUntilExpiry >= 0 && daysUntilExpiry <= 7 && styles.renewalCardUrgent,
        ]}
        onPress={() => router.push({ pathname: '/renewal-detail', params: { id: renewal.id } })}
      >
        <Text style={styles.renewalIcon}>{icon}</Text>
        <View style={styles.renewalInfo}>
          <Text style={styles.renewalTitle} numberOfLines={1}>{renewal.title}</Text>
          {renewal.authority_name && (
            <Text style={styles.renewalAuthority} numberOfLines={1}>{renewal.authority_name}</Text>
          )}
          <View style={styles.renewalMeta}>
            <View style={[styles.urgencyBadge, { backgroundColor: urgency.color + '20' }]}>
              <Text style={[styles.urgencyText, { color: urgency.color }]}>
                {daysUntilExpiry < 0
                  ? `${Math.abs(daysUntilExpiry)}d overdue`
                  : daysUntilExpiry === 0
                  ? 'Today'
                  : `${daysUntilExpiry}d left`}
              </Text>
            </View>
            {renewal.fee_amount && (
              <Text style={styles.renewalCost}>₹{renewal.fee_amount.toLocaleString('en-IN')}</Text>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
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
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Renewals</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => router.push('/add-renewal')}
        >
          <Ionicons name="add" size={24} color={Colors.text} />
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
          </View>
        ) : (
          <>
            {/* Overdue Section */}
            {overdueRenewals.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: Colors.danger }]} />
                  <Text style={[styles.sectionTitle, { color: Colors.danger }]}>
                    OVERDUE ({overdueRenewals.length})
                  </Text>
                </View>
                {overdueRenewals.map(renderRenewalCard)}
              </View>
            )}

            {/* Urgent Section */}
            {urgentRenewals.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: Colors.warning }]} />
                  <Text style={[styles.sectionTitle, { color: Colors.warning }]}>
                    DUE WITHIN 30 DAYS ({urgentRenewals.length})
                  </Text>
                </View>
                {urgentRenewals.map(renderRenewalCard)}
              </View>
            )}

            {/* Upcoming Section */}
            {upcomingRenewals.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: Colors.success }]} />
                  <Text style={[styles.sectionTitle, { color: Colors.textMuted }]}>
                    UPCOMING ({upcomingRenewals.length})
                  </Text>
                </View>
                {upcomingRenewals.map(renderRenewalCard)}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* FAB */}
      {renewals.length > 0 && (
        <Pressable
          style={styles.fab}
          onPress={() => router.push('/add-renewal')}
        >
          <Ionicons name="add" size={28} color="#000" />
        </Pressable>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    ...GlassStyle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    ...Typography.h3,
    color: Colors.text,
    textAlign: 'center',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    ...GlassStyle,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingVertical: Spacing['3xl'],
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
  },
  emptyButtonText: {
    ...Typography.button,
    color: Colors.background,
  },

  // Sections
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    ...Typography.label,
    letterSpacing: 1,
  },

  // Renewal Card
  renewalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    ...GlassStyle,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  renewalCardOverdue: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  renewalCardUrgent: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  renewalIcon: {
    fontSize: 28,
    marginRight: Spacing.md,
  },
  renewalInfo: {
    flex: 1,
  },
  renewalTitle: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  renewalAuthority: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  renewalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  urgencyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  urgencyText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  renewalCost: {
    ...Typography.bodySm,
    color: Colors.textMuted,
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
